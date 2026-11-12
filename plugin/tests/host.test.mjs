// Host 半侧集成测试：真实 HTTP 服务 + fake ctx + 临时 HOME/Data 目录。
// 运行：node --test tests/
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import http from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test, { after } from 'node:test'
import { fileURLToPath } from 'node:url'

const HOME = mkdtempSync(join(tmpdir(), 'iw-host-test-'))
process.env.HOME = HOME
const DATA = join(HOME, 'Data', 'dsh-image-workbench')
const CONFIG = join(DATA, 'config.json')
const INDEX = join(DATA, 'index.jsonl')

// 最小但结构正确的 JPEG 头尾；host 只做存储，不解码。
const JPEG = Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9', 'hex')
const JPEG_URL = `data:image/jpeg;base64,${JPEG.toString('base64')}`
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')
const PNG_URL = `data:image/png;base64,${PNG.toString('base64')}`

let rejection
let credential = null
let handler
const credentials = {
  readRecord: async () => credential,
  modifyRecord: async (_key, mutate) => {
    credential = await mutate(credential)
    return credential
  },
  deleteRecord: async () => {
    credential = null
  },
}
const ctx = {
  effect(fn) {
    return fn()
  },
  get(name) {
    if (name === 'credentials') return credentials
    if (name === 'connection') return { requestRejection: () => rejection }
    return undefined
  },
  webServer: {
    register(entry) {
      handler = entry.handler
      return () => {}
    },
  },
}

const plugin = (await import(new URL('../index.js', import.meta.url).href)).default
plugin.apply(ctx)
assert.equal(typeof handler, 'function', 'webServer.register 必须被调用')

const server = http.createServer((req, res) => handler(req, res))
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const PORT = server.address().port
const BASE = `http://127.0.0.1:${PORT}/image-workbench`

const mockServers = []
after(async () => {
  for (const target of [server, ...mockServers]) {
    target.closeAllConnections?.()
    await new Promise((resolve) => target.close(resolve))
  }
  rmSync(HOME, { recursive: true, force: true })
})

async function api(path, init) {
  const res = await fetch(BASE + path, init)
  const type = (res.headers.get('content-type') || '').toLowerCase()
  const body = type.includes('application/json')
    ? await res.json()
    : Buffer.from(await res.arrayBuffer())
  return { status: res.status, headers: res.headers, body }
}

function postJson(path, value) {
  return api(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(value),
  })
}

function readZipEntries(buffer) {
  const eocd = buffer.lastIndexOf(Buffer.from('504b0506', 'hex'))
  assert.ok(eocd >= 0, '缺少 EOCD')
  const count = buffer.readUInt16LE(eocd + 10)
  const cdSize = buffer.readUInt32LE(eocd + 12)
  const cdOffset = buffer.readUInt32LE(eocd + 16)
  assert.equal(cdOffset + cdSize, eocd, '中央目录必须紧邻 EOCD')
  assert.equal(buffer.readUInt16LE(eocd + 8), count, 'EOCD 条目数一致')
  const names = []
  let offset = cdOffset
  for (let i = 0; i < count; i += 1) {
    assert.equal(buffer.readUInt32LE(offset), 0x02014b50, '中央目录头签名')
    const nameLen = buffer.readUInt16LE(offset + 28)
    const extraLen = buffer.readUInt16LE(offset + 30)
    const commentLen = buffer.readUInt16LE(offset + 32)
    names.push(buffer.subarray(offset + 46, offset + 46 + nameLen).toString('utf8'))
    offset += 46 + nameLen + extraLen + commentLen
  }
  return { count, names, cdOffset, cdSize }
}

let assetId = ''
let batchId = ''

test('P2 行为保留：health / settings / sample / test', async () => {
  const health = await api('/health')
  assert.equal(health.status, 200)
  assert.deepEqual(health.body, { ok: true, phase: 'P2' })

  const initial = await api('/settings')
  assert.equal(initial.status, 200)
  assert.equal(initial.body.budget, 10)
  assert.equal(initial.body.defaultSize, '960')
  assert.equal(initial.body.cloud, false)
  assert.equal(initial.body.phase, 'P2')
  assert.equal(initial.body.hasKey, false)

  const sample = await fetch(`${BASE}/sample`)
  assert.equal(sample.status, 200)
  assert.equal(sample.headers.get('content-type'), 'image/jpeg')
  const sampleBytes = Buffer.from(await sample.arrayBuffer())
  assert.ok(sampleBytes.length > 1000)
  assert.equal(sampleBytes[0], 0xff)

  const saved = await postJson('/settings', {
    budget: 12,
    privacyConfirm: false,
    defaultSize: '1200',
    concurrency: 3,
    base: 'intl',
    model: 'highspeed',
    billing: 'mplan',
    key: 'sk-test-abcd1234',
  })
  assert.equal(saved.status, 200)
  assert.equal(saved.body.budget, 12)
  assert.equal(saved.body.defaultSize, '1200')
  assert.equal(saved.body.hasKey, true)
  assert.equal(saved.body.keyHint, '1234')
  assert.equal(saved.body.cloud, true, '保存 Key 后应启用云端')

  const config = JSON.parse(readFileSync(CONFIG, 'utf8'))
  assert.equal(config.budget, 12)
  assert.equal(config.cloudEnabled, true, '保存 Key 后 cloudEnabled=true')
  assert.equal(statSync(CONFIG).mode & 0o777, 0o600, 'config 必须是 0600')

  const bad = await postJson('/settings', { budget: 999 })
  assert.equal(bad.status, 400)

  const legacyTest = await api('/test', { method: 'POST' })
  assert.equal(legacyTest.status, 200)
  assert.equal(legacyTest.body.ok, true)
})

test('认证守卫覆盖所有新旧路由（401 + 未授权）', async () => {
  rejection = 401
  const requests = [
    ['/settings', {}],
    ['/health', {}],
    ['/sample', {}],
    ['/storage', {}],
    ['/history', {}],
    ['/asset/0000000000000000', {}],
    ['/result/abc/halftone.jpg', {}],
    ['/assets', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }],
    ['/batches', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }],
    ['/export', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }],
    ['/batch/abc', { method: 'DELETE' }],
    ['/cloud/jobs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }],
    ['/cloud/jobs/abc', {}],
    ['/cloud/key-test', { method: 'POST' }],
    ['/usage', {}],
  ]
  try {
    for (const [path, init] of requests) {
      const res = await api(path, init)
      assert.equal(res.status, 401, `${path} 必须被 auth 拦截`)
      assert.equal(res.body.error, '未授权')
    }
  } finally {
    rejection = undefined
  }
})

test('资产：sha256 去重、读取、404、路径穿越与非法 dataUrl', async () => {
  const first = await postJson('/assets', {
    dataUrl: JPEG_URL,
    name: '猫 图.jpg',
    w: 720,
    h: 860,
  })
  assert.equal(first.status, 200)
  assert.match(first.body.id, /^[a-f0-9]{16}$/)
  assert.equal(first.body.name, '猫 图.jpg')
  assert.equal(first.body.w, 720)
  assert.equal(first.body.h, 860)
  assert.equal(first.body.bytes, JPEG.length)
  assert.equal(first.body.url, `/image-workbench/asset/${first.body.id}`)
  assetId = first.body.id

  const dir = join(DATA, 'library', assetId)
  const meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'))
  assert.equal(meta.id, assetId)
  assert.equal(meta.mime, 'image/jpeg')
  assert.equal(meta.sha256.length, 64)
  assert.equal(meta.sha256.slice(0, 16), assetId)
  assert.equal(statSync(join(dir, 'original.jpg')).mode & 0o777, 0o644)

  const second = await postJson('/assets', {
    dataUrl: JPEG_URL,
    name: '别的名字.jpg',
    w: 1,
    h: 1,
  })
  assert.equal(second.status, 200)
  assert.equal(second.body.id, assetId, '同内容必须复用同一个 id')
  assert.equal(second.body.bytes, JPEG.length)

  const image = await api(`/asset/${assetId}`)
  assert.equal(image.status, 200)
  assert.equal(image.headers.get('content-type'), 'image/jpeg')
  assert.ok(image.headers.get('x-content-type-options') === 'nosniff')
  assert.deepEqual(image.body, JPEG)

  assert.equal((await api('/asset/0000000000000000')).status, 404)
  assert.equal((await api('/asset/..%2F..%2Fconfig.json')).status, 404)
  assert.equal((await api('/asset/not-a-hash')).status, 404)

  const text = await postJson('/assets', {
    dataUrl: 'data:text/plain;base64,aGVsbG8=',
    name: 'x.txt',
  })
  assert.equal(text.status, 400)

  const malformed = await api('/assets', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: 'not json',
  })
  assert.equal(malformed.status, 400)
})

test('批次：落盘、index、history、result、删除', async () => {
  const posterText = { variant: 'poster', title: '秋日印刷', subtitle: '三色套印', date: '2026-11-13', handle: '@yee' }
  const created = await postJson('/batches', {
    assetId,
    frame: '4:5',
    text: posterText,
    results: [
      { styleId: 'halftone', params: { strength: 0.8, ink: 'vermilion' }, dataUrl: JPEG_URL, w: 960, h: 640 },
      { styleId: 'riso', params: { strength: 1 }, dataUrl: JPEG_URL, w: 960, h: 640 },
    ],
  })
  assert.equal(created.status, 201)
  batchId = created.body.id
  assert.match(batchId, /^[A-Za-z0-9_-]+$/)
  assert.equal(created.body.source.id, assetId)
  assert.equal(created.body.source.name, '猫 图.jpg')
  assert.equal(created.body.source.w, 720)
  assert.deepEqual(created.body.text, posterText)
  assert.equal(created.body.frame, '4:5')
  assert.equal(created.body.results.length, 2)
  assert.equal(created.body.results[0].styleId, 'halftone')
  assert.equal(created.body.results[0].url, `/image-workbench/result/${batchId}/halftone.jpg`)
  assert.deepEqual(created.body.results[0].params, { strength: 0.8, ink: 'vermilion' })

  const outDir = join(DATA, 'outputs', batchId)
  assert.ok(existsSync(join(outDir, 'halftone.jpg')))
  assert.ok(existsSync(join(outDir, 'riso.jpg')))
  assert.deepEqual(readFileSync(join(outDir, 'halftone.jpg')), JPEG)
  const batchFile = JSON.parse(readFileSync(join(outDir, 'batch.json'), 'utf8'))
  assert.equal(batchFile.assetId, assetId)
  assert.deepEqual(batchFile.text, posterText)
  assert.equal(batchFile.frame, '4:5')
  assert.equal(batchFile.createdAt, created.body.createdAt)

  const indexRows = readFileSync(INDEX, 'utf8').trim().split('\n').map((line) => JSON.parse(line))
  assert.equal(indexRows.length, 1)
  assert.equal(indexRows[0].id, batchId)
  assert.equal(indexRows[0].sourceName, '猫 图.jpg')
  assert.deepEqual(indexRows[0].styleIds, ['halftone', 'riso'])

  const history = await api('/history?limit=20')
  assert.equal(history.status, 200)
  assert.equal(history.body.total, 1)
  assert.equal(history.body.entries.length, 1)
  assert.equal(history.body.entries[0].id, batchId)
  assert.equal(history.body.entries[0].source.id, assetId)
  assert.equal(history.body.entries[0].source.url, `/image-workbench/asset/${assetId}`)
  assert.deepEqual(history.body.entries[0].text, posterText)
  assert.equal(history.body.entries[0].frame, '4:5')
  assert.equal(history.body.entries[0].results.length, 2)
  assert.deepEqual(history.body.entries[0].results[0].params, { strength: 0.8, ink: 'vermilion' })

  const result = await api(`/result/${batchId}/halftone.jpg`)
  assert.equal(result.status, 200)
  assert.equal(result.headers.get('content-type'), 'image/jpeg')
  assert.deepEqual(result.body, JPEG)
  assert.equal((await api(`/result/${batchId}/missing.jpg`)).status, 404)
  assert.equal((await api(`/result/${batchId}/..%2F..%2Fconfig.json.jpg`)).status, 404)
  assert.equal((await api('/result/..%2Fetc/halftone.jpg')).status, 404)

  // 损坏行不应影响历史读取
  appendFileSync(INDEX, '{broken json\n{"noId":true}\n')
  const tolerant = await api('/history')
  assert.equal(tolerant.status, 200)
  assert.equal(tolerant.body.total, 1)

  // 兼容旧客户端：text 仍是字符串，frame 缺省回落 3:2
  const legacy = await postJson('/batches', {
    assetId,
    text: '字符串文本',
    results: [{ styleId: 'film', params: { grain: 0.2 }, dataUrl: JPEG_URL, w: 1, h: 1 }],
  })
  assert.equal(legacy.status, 201)
  assert.equal(legacy.body.text, '字符串文本')
  assert.equal(legacy.body.frame, '3:2')
  const legacyHistory = await api('/history')
  assert.equal(legacyHistory.body.total, 2)
  const legacyEntry = legacyHistory.body.entries.find((entry) => entry.id === legacy.body.id)
  assert.equal(legacyEntry.text, '字符串文本')
  assert.equal(legacyEntry.frame, '3:2')
  await api(`/batch/${legacy.body.id}`, { method: 'DELETE' })
  assert.equal((await api('/history')).body.total, 1)

  const invalidText = await postJson('/batches', {
    assetId,
    text: ['不是', '对象'],
    results: [{ styleId: 'x', params: {}, dataUrl: JPEG_URL, w: 1, h: 1 }],
  })
  assert.equal(invalidText.status, 400)

  const invalid = await postJson('/batches', {
    assetId,
    text: '',
    results: [{ styleId: 'x', params: {}, dataUrl: PNG_URL, w: 1, h: 1 }],
  })
  assert.equal(invalid.status, 400, '结果必须是 JPEG')

  const deleted = await api(`/batch/${batchId}`, { method: 'DELETE' })
  assert.equal(deleted.status, 200)
  assert.deepEqual(deleted.body, { ok: true })
  assert.equal(existsSync(outDir), false)
  assert.equal((await api('/history')).body.total, 0)
  assert.equal((await api(`/batch/${batchId}`, { method: 'DELETE' })).status, 200)
  assert.equal((await api('/batch/..%2F..%2Fconfig', { method: 'DELETE' })).status, 400)
})

test('导出 ZIP：results/ + manifest.json、UTF-8 名称、去重与安全化', async () => {
  const manifest = { version: 1, generatedAt: '2026-11-13T00:00:00.000Z', items: [{ styleId: 'halftone' }] }
  const res = await postJson('/export', {
    files: [
      { name: '01-poster.jpg', dataUrl: JPEG_URL },
      { name: '../../evil.jpg', dataUrl: JPEG_URL },
      { name: '01-poster.jpg', dataUrl: JPEG_URL },
      { name: '封面.jpg', dataUrl: JPEG_URL },
      { name: 'a.png', dataUrl: PNG_URL },
    ],
    manifest,
  })
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('content-type'), 'application/zip')
  assert.match(res.headers.get('content-disposition') || '', /^attachment; filename="image-workbench-.*\.zip"$/)
  assert.ok(Buffer.isBuffer(res.body))
  assert.deepEqual(res.body.subarray(0, 4), Buffer.from([0x50, 0x4b, 0x03, 0x04]))

  const parsed = readZipEntries(res.body)
  assert.equal(parsed.count, 6)
  assert.deepEqual(parsed.names, [
    'results/01-poster.jpg',
    'results/evil.jpg',
    'results/01-poster-2.jpg',
    'results/封面.jpg',
    'results/a.png',
    'manifest.json',
  ])

  const zipPath = join(HOME, 'export.zip')
  writeFileSync(zipPath, res.body)
  execFileSync('unzip', ['-t', zipPath], { stdio: 'pipe' })
  const manifestOut = execFileSync('unzip', ['-p', zipPath, 'manifest.json'], { encoding: 'utf8' })
  assert.deepEqual(JSON.parse(manifestOut), manifest)

  const notArray = await postJson('/export', { files: 'nope', manifest: {} })
  assert.equal(notArray.status, 400)
  const badManifest = await postJson('/export', { files: [], manifest: [] })
  assert.equal(badManifest.status, 400)

  const stats = await api('/storage')
  assert.equal(stats.status, 200)
  assert.equal(stats.body.dir, DATA)
  assert.equal(stats.body.count, 1)
  assert.ok(stats.body.bytes > 0)
})

test('P3 未启用：cloud / usage 都是 403', async () => {
  const config = JSON.parse(readFileSync(CONFIG, 'utf8'))
  config.cloudEnabled = false
  writeFileSync(CONFIG, JSON.stringify(config, null, 2), { mode: 0o600 })
  const jobs = await postJson('/cloud/jobs', {})
  assert.equal(jobs.status, 403)
  assert.equal(jobs.body.error, '云端功能未启用')
  const usage = await api('/usage')
  assert.equal(usage.status, 403)
})

test('P3 开关打开：无 Key 明确失败；key-test 不伪造成功；usage 可用', async () => {
  const config = JSON.parse(readFileSync(CONFIG, 'utf8'))
  config.cloudEnabled = true
  writeFileSync(CONFIG, JSON.stringify(config, null, 2), { mode: 0o600 })

  credential = null
  const noKeyJob = await postJson('/cloud/jobs', {
    assetId,
    styleId: 'h3-illus',
    prompt: '把照片变成插画',
    size: '1024x1024',
    params: {},
  })
  assert.equal(noKeyJob.status, 400)
  assert.match(noKeyJob.body.error, /API Key/)

  const noKeyTest = await api('/cloud/key-test', { method: 'POST' })
  assert.equal(noKeyTest.status, 400)
  assert.equal(noKeyTest.body.ok, false)
  assert.equal(noKeyTest.body.supported, false)

  // 有 Key 但官方没有免计费探测端点：必须如实返回 unsupported，不能 200 ok。
  credential = { kind: 'api-key', key: 'sk-test-abcd1234' }
  const keyTest = await api('/cloud/key-test', { method: 'POST' })
  assert.equal(keyTest.status, 501)
  assert.equal(keyTest.body.ok, false)
  assert.equal(keyTest.body.supported, false)
  assert.equal(keyTest.body.code, 'unsupported')

  const badSize = await postJson('/cloud/jobs', {
    assetId,
    styleId: 'h3-illus',
    prompt: 'x',
    size: 'not-a-size',
    params: {},
  })
  assert.equal(badSize.status, 400)
  assert.match(badSize.body.error, /size/)

  const missingJob = await api('/cloud/jobs/job_missing_00000000')
  assert.equal(missingJob.status, 404)

  const usage = await api('/usage')
  assert.equal(usage.status, 200)
  assert.equal(usage.body.today.count, 0)
  assert.equal(usage.body.today.costYuan, 0)
  assert.equal(usage.body.currency, 'CNY')
})

test('P3 jobs：请求前落点、超时 unknown、绝不自动重试', async () => {
  const { createJobs, hashParams } = await import(new URL('../lib/jobs.js', import.meta.url).href)
  const clock = () => new Date('2026-11-13T00:00:00.000Z')
  const jobs = createJobs({ clock })
  assert.equal(hashParams({ a: 1, b: [2, 3] }), hashParams({ b: [2, 3], a: 1 }))

  const job = jobs.create({
    assetId: 'a'.repeat(16),
    styleId: 'h3-illus',
    prompt: 'p',
    size: '2048x2048',
    params: { b: 2, a: 1 },
  })
  assert.equal(job.status, 'queued')
  let calls = 0
  const failed = await jobs.start(job.id, async () => {
    calls += 1
    throw Object.assign(new Error('请求已发出但超时'), { code: 'timeout', unknown: true })
  })
  assert.equal(calls, 1)
  assert.equal(failed.status, 'unknown')
  assert.equal(failed.attempts, 1)
  assert.ok(failed.requestSentAt)
  assert.equal(failed.error.code, 'timeout')
  assert.equal(failed.error.retryable, false)

  // 再次 start 不会重试（attempts > 0 且已是终态）
  await jobs.start(job.id, async () => {
    calls += 1
  })
  assert.equal(calls, 1)
  assert.equal(job.status, 'unknown')

  const authJob = jobs.create({ assetId: 'a', styleId: 's', prompt: 'p', size: '2048x2048' })
  await jobs.start(authJob.id, async () => {
    throw Object.assign(new Error('鉴权失败'), { code: 'auth', status: 401 })
  })
  assert.equal(authJob.status, 'failed')
  assert.equal(authJob.error.code, 'auth')

  const preJob = jobs.create({ assetId: 'a', styleId: 's', prompt: 'p', size: '2048x2048' })
  await jobs.start(preJob.id, async () => {
    throw Object.assign(new Error('缺少 Key'), { code: 'missing_key', beforeRequest: true })
  })
  assert.equal(preJob.status, 'failed')

  const okJob = jobs.create({ assetId: 'a', styleId: 's', prompt: 'p', size: '2048x2048' })
  const done = await jobs.start(okJob.id, async () => ({
    output: { url: '/x.jpg' },
    usage: { total_tokens: 1 },
    revisedPrompt: 'rev',
  }))
  assert.equal(done.status, 'succeeded')
  assert.equal(done.output.url, '/x.jpg')
  assert.equal(done.revisedPrompt, 'rev')
  assert.equal(done.error, null)
})

test('P3 budget / ledger：单价、日预算、手动放行、损坏行容忍', async () => {
  const { estimate, checkBudget } = await import(new URL('../lib/budget.js', import.meta.url).href)
  const { createLedger } = await import(new URL('../lib/ledger.js', import.meta.url).href)
  const promoNow = new Date('2026-11-13T00:00:00+08:00')
  const afterPromo = new Date('2026-12-01T00:00:00+08:00')

  assert.equal(estimate({ size: '2048x2048', speed: 'standard', now: promoNow }).tier, '2K')
  assert.equal(estimate({ size: '2048x2048', speed: 'standard', now: promoNow }).costYuan, 0.1747)
  assert.equal(estimate({ size: '4096x4096', speed: 'standard', now: promoNow }).costYuan, 0.2404)
  assert.equal(estimate({ size: '4096x4096', speed: 'standard', now: afterPromo }).costYuan, 0.4809)

  const blocked = checkBudget({ spentToday: 9.9, estimated: 0.1747, limit: 10 })
  assert.equal(blocked.allowed, false)
  assert.equal(blocked.reason, 'daily_limit')
  assert.equal(blocked.requiresConfirmation, true)
  assert.equal(checkBudget({ spentToday: 9.9, estimated: 0.1747, limit: 10, allow: true }).allowed, true)
  assert.equal(checkBudget({ spentToday: 99, estimated: 5, limit: 10, billing: 'mplan' }).allowed, true)
  assert.equal(checkBudget({ spentToday: 0, estimated: 2.5, limit: 10 }).requiresConfirmation, true)

  const ledgerPath = join(HOME, 'unit-ledger.jsonl')
  const ledger = createLedger(ledgerPath)
  const now = new Date('2026-11-13T12:00:00+08:00')
  await ledger.append({ at: now.toISOString(), jobId: 'j1', costYuan: 0.1747 })
  await ledger.append({ at: now.toISOString(), jobId: 'j2', costYuan: 0.5, key: 'sk-should-be-dropped' })
  await ledger.append({ at: '2026-01-05T00:00:00+08:00', jobId: 'j3', costYuan: 1 })
  appendFileSync(ledgerPath, '{not json\n')
  const summary = await ledger.summary(now)
  assert.equal(summary.today.count, 2)
  assert.equal(summary.today.costYuan, 0.6747)
  assert.equal(summary.month.count, 2)
  assert.equal(summary.total.count, 3)
  assert.equal(summary.entries.length, 3)
  assert.ok(summary.entries.every((entry) => !('key' in entry)))
  assert.equal(statSync(ledgerPath).mode & 0o777, 0o600)
})

async function waitJob(cloud, id) {
  const terminal = new Set(['succeeded', 'failed', 'canceled', 'unknown'])
  for (let i = 0; i < 300; i += 1) {
    const job = cloud.getJob(id)
    if (terminal.has(job.status)) return job
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error(`作业 ${id} 未在预期时间内结束`)
}

test('P3 cloud 编排：成功落盘/记账、超时 unknown、不重试、预算放行', async () => {
  const { createStorage } = await import(new URL('../lib/storage.js', import.meta.url).href)
  const { createCloud } = await import(new URL('../lib/cloud.js', import.meta.url).href)
  const root = join(HOME, 'cloud-unit')
  const storage = createStorage(root)
  const saved = await storage.putAsset({ dataUrl: JPEG_URL, name: 'cloud.jpg', w: 640, h: 480 })
  const config = { cloudEnabled: true, base: 'cn', model: 'standard', billing: 'payg', budget: 10 }

  let calls = 0
  let mode = 'unknown'
  const cloud = createCloud({
    root,
    storage,
    readKey: async () => 'sk-unit-test',
    generate: async () => {
      calls += 1
      if (mode === 'unknown') {
        throw Object.assign(new Error('请求已发出但超时'), { code: 'timeout', unknown: true })
      }
      return {
        buffer: JPEG,
        mime: 'image/jpeg',
        revisedPrompt: 'rev',
        usage: { generated_images: 1, total_tokens: 5 },
        rawMeta: { model: 'MiniMax-H3-Image', speed: 'standard', size: '2048x2048', requestId: 'req_1', status: 200 },
      }
    },
  })

  const started = await cloud.createJob(
    { assetId: saved.meta.id, styleId: 'h3-illus', prompt: 'test', size: '2048x2048', params: { strength: 1 } },
    config,
  )
  assert.deepEqual(started.status, 'queued')
  const failed = await waitJob(cloud, started.id)
  assert.equal(failed.status, 'unknown')
  assert.equal(calls, 1)
  assert.ok(failed.requestSentAt)
  assert.equal(failed.attempts, 1)
  assert.equal(failed.error.code, 'timeout')
  assert.equal(failed.output, null)
  assert.equal((await cloud.usage()).today.count, 0, '失败的作业不记账')

  mode = 'ok'
  const started2 = await cloud.createJob(
    { assetId: saved.meta.id, styleId: 'h3-illus', prompt: 'ok', size: '2048x2048', params: {} },
    config,
  )
  const succeeded = await waitJob(cloud, started2.id)
  assert.equal(succeeded.status, 'succeeded')
  assert.equal(calls, 2)
  assert.equal(succeeded.revisedPrompt, 'rev')
  assert.equal(succeeded.output.url, `/image-workbench/result/${started2.id}/h3-illus.jpg`)
  assert.ok(existsSync(join(root, 'outputs', started2.id, 'h3-illus.jpg')))
  const ledger = await cloud.usage()
  assert.equal(ledger.today.count, 1)
  assert.equal(ledger.today.costYuan, 0.1747)
  assert.equal(ledger.entries[0].jobId, started2.id)
  assert.equal(ledger.entries[0].usage.total_tokens, 5)

  // 已终态作业再次 start 不会产生第二次请求
  const before = calls
  await cloud.jobs.start(started2.id, async () => {
    calls += 1
  })
  assert.equal(calls, before)

  // 日预算拦截 + 手动放行
  const tight = { ...config, budget: 0.1 }
  await assert.rejects(
    cloud.createJob({ assetId: saved.meta.id, styleId: 'h3-illus', prompt: 'x', size: '2048x2048' }, tight),
    (err) => {
      assert.equal(err.status, 402)
      assert.equal(err.code, undefined)
      assert.equal(err.details.code, 'budget_exceeded')
      return true
    },
  )
  const allowed = await cloud.createJob(
    { assetId: saved.meta.id, styleId: 'h3-illus', prompt: 'y', size: '2048x2048', allowOverBudget: true },
    tight,
  )
  const allowedDone = await waitJob(cloud, allowed.id)
  assert.equal(allowedDone.status, 'succeeded')
  assert.equal((await cloud.usage()).today.count, 2)
})

function startMock(handlerFn) {
  const mock = http.createServer((req, res) => {
    res.on('error', () => {})
    Promise.resolve(handlerFn(req, res)).catch(() => {
      if (!res.writableEnded) res.end()
    })
  })
  mockServers.push(mock)
  return new Promise((resolve) => mock.listen(0, '127.0.0.1', () => resolve(mock)))
}

test('P3 provider：本地 mock edits 端点（url / b64 / highspeed / 401 脱敏）', async () => {
  const { generateEdit } = await import(new URL('../lib/minimax.js', import.meta.url).href)
  const mode = { value: 'url' }
  let edits = 0
  let lastBody = ''
  let lastAuth = ''

  const ok = await startMock(async (req, res) => {
    if (req.method === 'POST' && req.url === '/v1/images/edits') {
      edits += 1
      lastAuth = req.headers.authorization || ''
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      lastBody = Buffer.concat(chunks).toString('utf8')
      const port = ok.address().port
      const payload =
        mode.value === 'b64'
          ? {
              data: [{ b64_json: JPEG.toString('base64'), revised_prompt: 'b64 prompt' }],
              output_format: 'jpeg',
              usage: { generated_images: 1, total_tokens: 10 },
              request_id: 'req_b64',
            }
          : {
              data: [
                {
                  url: `http://127.0.0.1:${port}/img.jpg`,
                  size: '1024x1024',
                  revised_prompt: 'url prompt',
                },
              ],
              output_format: 'jpeg',
              usage: { generated_images: 1, total_tokens: 20 },
              request_id: 'req_url',
            }
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify(payload))
      return
    }
    if (req.url === '/img.jpg') {
      res.setHeader('content-type', 'image/jpeg')
      res.end(JPEG)
      return
    }
    res.statusCode = 404
    res.end('not found')
  })
  const baseUrl = `http://127.0.0.1:${ok.address().port}`

  const first = await generateEdit({
    imageBuffer: JPEG,
    mime: 'image/jpeg',
    prompt: '把猫换成柴犬，保留背景',
    size: '1024x1024',
    key: 'sk-secret-1234',
    baseUrl,
    timeoutMs: 5000,
  })
  assert.deepEqual(first.buffer, JPEG)
  assert.equal(first.mime, 'image/jpeg')
  assert.equal(first.revisedPrompt, 'url prompt')
  assert.equal(first.usage.total_tokens, 20)
  assert.equal(first.rawMeta.model, 'MiniMax-H3-Image')
  assert.equal(first.rawMeta.requestId, 'req_url')
  assert.equal(edits, 1)
  assert.equal(lastAuth, 'Bearer sk-secret-1234')
  assert.match(lastBody, /name="model"\r\n\r\nMiniMax-H3-Image\r\n/)
  assert.match(lastBody, /name="response_format"\r\n\r\nurl\r\n/)
  assert.match(lastBody, /name="output_format"\r\n\r\njpeg\r\n/)
  assert.match(lastBody, /name="n"\r\n\r\n1\r\n/)
  assert.match(lastBody, /name="size"\r\n\r\n1024x1024\r\n/)
  assert.match(lastBody, /name="image"; filename="source\.jpg"/)

  mode.value = 'b64'
  const fallback = await generateEdit({
    imageBuffer: JPEG,
    mime: 'image/jpeg',
    prompt: 'b64 兜底',
    size: '1024x1024',
    key: 'sk-secret-1234',
    baseUrl,
    timeoutMs: 5000,
  })
  assert.deepEqual(fallback.buffer, JPEG)
  assert.equal(fallback.revisedPrompt, 'b64 prompt')
  assert.equal(fallback.rawMeta.requestId, 'req_b64')
  assert.equal(edits, 2)

  mode.value = 'url'
  const fast = await generateEdit({
    imageBuffer: JPEG,
    mime: 'image/jpeg',
    prompt: 'highspeed',
    size: '1024x1024',
    key: 'sk-secret-1234',
    baseUrl,
    speed: 'highspeed',
    timeoutMs: 5000,
  })
  assert.match(lastBody, /MiniMax-H3-Image-Highspeed/)
  assert.equal(fast.rawMeta.speed, 'highspeed')

  const authFail = await startMock((req, res) => {
    res.statusCode = 401
    res.setHeader('content-type', 'application/json')
    res.end(
      JSON.stringify({
        type: 'error',
        error: { type: 'authorized_error', message: 'login fail: invalid key sk-secret-1234 (1004)' },
      }),
    )
  })
  await assert.rejects(
    generateEdit({
      imageBuffer: JPEG,
      mime: 'image/jpeg',
      prompt: 'x',
      size: '1024x1024',
      key: 'sk-secret-1234',
      baseUrl: `http://127.0.0.1:${authFail.address().port}`,
      timeoutMs: 5000,
    }),
    (err) => {
      assert.equal(err.code, 'auth')
      assert.equal(err.status, 401)
      assert.equal(err.retryable, false)
      assert.ok(!err.message.includes('sk-secret-1234'), '错误不能回显 Key')
      assert.match(err.message, /\*\*\*/)
      return true
    },
  )
})

test('P3 provider：本地 mock 超时 → unknown 且只请求一次', async () => {
  const { generateEdit } = await import(new URL('../lib/minimax.js', import.meta.url).href)
  let hits = 0
  const slow = await startMock(async (req, res) => {
    hits += 1
    await new Promise((resolve) => setTimeout(resolve, 800))
    if (!res.writableEnded) {
      res.setHeader('content-type', 'application/json')
      res.end('{}')
    }
  })
  await assert.rejects(
    generateEdit({
      imageBuffer: JPEG,
      mime: 'image/jpeg',
      prompt: 'x',
      size: '1024x1024',
      key: 'sk-secret-1234',
      baseUrl: `http://127.0.0.1:${slow.address().port}`,
      timeoutMs: 200,
    }),
    (err) => {
      assert.equal(err.code, 'timeout')
      assert.equal(err.unknown, true)
      assert.equal(err.retryable, false)
      assert.match(err.message, /不要自动重试/)
      return true
    },
  )
  await new Promise((resolve) => setTimeout(resolve, 200))
  assert.equal(hits, 1, '超时后不得自动重试')
})
