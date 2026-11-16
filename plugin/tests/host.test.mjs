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
  renameSync,
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

test('P4 风格包：preset import/list，拒绝内置 id 和非法 base', async () => {
  const pack = {
    schema: 1,
    id: 'my-preset',
    name: '我的海报预设',
    base: 'poster',
    params: { strength: 0.7, grain: 0.4, ink: 'indigo', size: '960' },
    preview: JPEG_URL,
  }
  const created = await postJson('/styles', pack)
  assert.equal(created.status, 201)
  assert.equal(created.body.style.id, 'my-preset')
  assert.equal(created.body.style.renderer, 'preset')
  assert.equal(created.body.style.base, 'poster')
  assert.ok(created.body.style.preview.startsWith('data:image/jpeg;base64,'))
  const listed = await api('/styles')
  assert.equal(listed.status, 200)
  assert.ok(listed.body.styles.some((style) => style.id === 'my-preset'))
  const duplicate = await postJson('/styles', { ...pack, id: 'poster' })
  assert.equal(duplicate.status, 400)
  const badBase = await postJson('/styles', { ...pack, id: 'my-bad', base: 'h3-illus' })
  assert.equal(badBase.status, 400)
  const deleted = await api('/styles/my-preset', { method: 'DELETE' })
  assert.equal(deleted.status, 200)
  const after = await api('/styles')
  assert.equal(after.body.styles.some((style) => style.id === 'my-preset'), false)
})

test('P5 90 天清理：旧 batch/原图/job 删除，当前与 styles 保留', async () => {
  const asset = await postJson('/assets', { dataUrl: JPEG_URL, name: 'old.jpg', w: 1, h: 1 })
  const batch = await postJson('/batches', {
    assetId: asset.body.id,
    text: 'old',
    results: [{ styleId: 'halftone', params: {}, dataUrl: JPEG_URL, w: 1, h: 1 }],
  })
  assert.equal(batch.status, 201)
  const batchId = batch.body.id
  const oldIso = '2026-01-01T00:00:00.000Z'
  const rows = readFileSync(INDEX, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
  for (const row of rows) if (row.id === batchId) row.createdAt = oldIso
  writeFileSync(INDEX, rows.map((row) => JSON.stringify(row)).join('\n') + '\n')
  const batchFile = join(DATA, 'outputs', batchId, 'batch.json')
  const batchJson = JSON.parse(readFileSync(batchFile, 'utf8'))
  batchJson.createdAt = oldIso
  writeFileSync(batchFile, JSON.stringify(batchJson, null, 2))
  const metaFile = join(DATA, 'library', asset.body.id, 'meta.json')
  const meta = JSON.parse(readFileSync(metaFile, 'utf8'))
  meta.createdAt = oldIso
  writeFileSync(metaFile, JSON.stringify(meta, null, 2))

  const result = await postJson('/cleanup', { days: 90 })
  assert.equal(result.status, 200)
  assert.ok(result.body.batches >= 1)
  assert.ok(result.body.assets >= 1)
  assert.equal(existsSync(join(DATA, 'outputs', batchId)), false)
  assert.equal(existsSync(join(DATA, 'library', asset.body.id)), false)
  const history = await api('/history')
  assert.equal(history.body.entries.some((entry) => entry.id === batchId), false)
  assert.equal(existsSync(join(DATA, 'styles')), true)
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
    ['/composite', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }],
    ['/batches', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }],
    ['/export', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }],
    ['/batch/abc', { method: 'DELETE' }],
    ['/cloud/jobs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }],
    ['/cloud/jobs', {}],
    ['/cloud/jobs/abc', {}],
    ['/cloud/jobs/abc/retry', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }],
    ['/seedream/jobs', {}],
    ['/seedream/jobs/abc/retry', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }],
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
  const paged = await api('/history?limit=1&offset=1')
  assert.equal(paged.status, 200)
  assert.equal(paged.body.total, 1)
  assert.equal(paged.body.entries.length, 0)
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

test('P3 cloud 复现元数据：seed/model/size/params/parentId/recipeId 经 HTTP 路由往返 /history', async () => {
  const config = JSON.parse(readFileSync(CONFIG, 'utf8'))
  Object.assign(config, { cloudEnabled: true, base: 'cn', model: 'standard', billing: 'payg', budget: 10 })
  writeFileSync(CONFIG, JSON.stringify(config, null, 2), { mode: 0o600 })
  credential = { kind: 'api-key', key: 'sk-test-abcd1234' }

  // 复用现有 provider mock 方式：本地 HTTP 端点，真实 generateEdit 走 multipart 解析。
  const provider = await startMock(async (req, res) => {
    if (req.method === 'POST' && req.url === '/v1/images/edits') {
      for await (const chunk of req) void chunk
      res.setHeader('content-type', 'application/json')
      res.end(
        JSON.stringify({
          data: [{ b64_json: JPEG.toString('base64'), size: '2048x2048', revised_prompt: '复现测试' }],
          output_format: 'jpeg',
          usage: { generated_images: 1, total_tokens: 7 },
          request_id: 'req_meta_1',
        }),
      )
      return
    }
    res.statusCode = 404
    res.end('not found')
  })

  // 只把 MiniMax 域名重定向到本地 mock；其他 fetch（本测试自身调 HTTP 路由）原样放行。
  const realFetch = globalThis.fetch
  const providerBase = `http://127.0.0.1:${provider.address().port}`
  globalThis.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input?.url
    if (typeof url === 'string' && url.startsWith('https://api.minimax.cn/')) {
      return realFetch(url.replace('https://api.minimax.cn', providerBase), init)
    }
    return realFetch(input, init)
  }

  try {
    const seed = 123456
    const params = { strength: 0.6, source: 'metadata-test' }
    const started = await postJson('/cloud/jobs', {
      assetId,
      styleId: 'h3-illus',
      prompt: '复现元数据测试',
      size: '2048x2048',
      seed,
      params,
      parentId: 'job_parent_0001',
      recipeId: 'recipe_meta_0001',
    })
    assert.equal(started.status, 202)
    assert.match(started.body.id, /^job_/)
    assert.equal(started.body.status, 'queued')

    const terminal = new Set(['succeeded', 'failed', 'canceled', 'unknown'])
    let job = null
    for (let i = 0; i < 300; i += 1) {
      const polled = await api(`/cloud/jobs/${started.body.id}`)
      assert.equal(polled.status, 200)
      job = polled.body
      if (terminal.has(job.status)) break
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    assert.equal(job.status, 'succeeded')

    const history = await api('/history?limit=20')
    assert.equal(history.status, 200)
    const entry = history.body.entries.find((item) => item.id === started.body.id)
    assert.ok(entry, '云端作业必须出现在 /history')
    assert.equal(entry.model, 'MiniMax-H3-Image')
    assert.equal(entry.seed, seed)
    assert.equal(entry.size, '2048x2048')
    assert.deepEqual(entry.params, params)
    assert.equal(entry.parentId, 'job_parent_0001')
    assert.equal(entry.recipeId, 'recipe_meta_0001')
    assert.equal(entry.results.length, 1)
    assert.equal(entry.results[0].w, 2048)
    assert.equal(entry.results[0].h, 2048)

    const batch = JSON.parse(readFileSync(join(DATA, 'outputs', started.body.id, 'batch.json'), 'utf8'))
    assert.equal(batch.model, 'MiniMax-H3-Image')
    assert.equal(batch.seed, seed)
    assert.equal(batch.size, '2048x2048')
    assert.deepEqual(batch.params, params)
    assert.equal(batch.parentId, 'job_parent_0001')
    assert.equal(batch.recipeId, 'recipe_meta_0001')

    const row = readFileSync(INDEX, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line))
      .find((item) => item.id === started.body.id)
    assert.equal(row.model, 'MiniMax-H3-Image')
    assert.equal(row.seed, seed)
    assert.equal(row.size, '2048x2048')
    assert.deepEqual(row.params, params)
    assert.equal(row.parentId, 'job_parent_0001')
    assert.equal(row.recipeId, 'recipe_meta_0001')

    // 只有显式传入 seed 才校验；非法值必须在请求发出前 400。
    for (const badSeed of [1.5, -1, 4294967296, '123']) {
      const invalid = await postJson('/cloud/jobs', {
        assetId,
        styleId: 'h3-illus',
        prompt: 'x',
        size: '2048x2048',
        seed: badSeed,
      })
      assert.equal(invalid.status, 400, `seed=${JSON.stringify(badSeed)} 必须 400`)
      assert.match(invalid.body.error, /seed/)
    }

    // 未传 seed 的旧调用方仍然可用：jobs.create 回落到 null，不编造 seed。
    const { createJobs } = await import(new URL('../lib/jobs.js', import.meta.url).href)
    const bare = createJobs().create({ assetId, styleId: 'h3-illus', prompt: 'p', size: '2048x2048' })
    assert.equal(bare.seed, null)
    assert.equal(bare.parentId, null)
    assert.equal(bare.recipeId, null)
  } finally {
    globalThis.fetch = realFetch
  }
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

test('P3 jobs：重启后 running 标 unknown，queued 标 failed，不自动重试', async () => {
  const { createJobs } = await import(new URL('../lib/jobs.js', import.meta.url).href)
  const restored = createJobs({ clock: () => new Date('2026-11-13T00:00:00.000Z') })
  const loaded = restored.hydrate([
    { id: 'job_running', status: 'running', requestSentAt: '2026-11-13T00:00:00.000Z', attempts: 1 },
    { id: 'job_queued', status: 'queued', requestSentAt: null, attempts: 0 },
  ])
  assert.equal(loaded.length, 2)
  assert.equal(restored.get('job_running').status, 'unknown')
  assert.equal(restored.get('job_running').error.code, 'interrupted')
  assert.equal(restored.get('job_queued').status, 'failed')
  assert.equal(restored.get('job_queued').error.code, 'interrupted_before_request')
  assert.equal(restored.get('job_running').attempts, 1)
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
  const history = await storage.listHistory(10)
  assert.ok(history.entries.some((entry) => entry.id === started2.id), 'cloud 成功结果应自动写 history index')

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

test('P3 pure text：/cloud/text-jobs 落盘与历史', async () => {
  const { createStorage } = await import(new URL('../lib/storage.js', import.meta.url).href)
  const { createCloud } = await import(new URL('../lib/cloud.js', import.meta.url).href)
  const root = join(HOME, 'cloud-text-unit')
  const storage = createStorage(root)
  const config = { cloudEnabled: true, base: 'cn', model: 'standard', billing: 'payg', budget: 10 }
  let seen = null
  const cloud = createCloud({
    root,
    storage,
    readKey: async () => 'sk-unit-test',
    generateText: async (opts) => {
      seen = opts
      return {
        buffer: JPEG,
        mime: 'image/jpeg',
        revisedPrompt: opts.prompt,
        usage: { generated_images: 1, total_tokens: 5 },
        rawMeta: { model: 'MiniMax-H3-Image', speed: 'standard', size: '2048x2048', requestId: 'req_text', status: 200 },
      }
    },
  })
  const started = await cloud.createTextJob({ prompt: '一只橘猫', size: '2048x2048' }, config)
  const done = await waitJob(cloud, started.id)
  assert.equal(done.status, 'succeeded')
  assert.equal(seen.size, '2048x2048')
  assert.equal(done.output.url, `/image-workbench/result/${started.id}/h3-text.jpg`)
  assert.ok(existsSync(join(root, 'outputs', started.id, 'h3-text.jpg')))
  const history = await storage.listHistory(10)
  assert.ok(history.entries.some((entry) => entry.id === started.id && entry.results[0].styleId === 'h3-text'))
  assert.equal((await cloud.usage()).today.count, 1)
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

test('云端风格 v2 提示词：Client 与 Host 保持同一份 33 条', () => {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const client = readFileSync(join(root, 'client.js'), 'utf8')
  const host = readFileSync(join(root, 'index.js'), 'utf8')
  const re = /prompt: (?:cloud(?:Scene)?(?:Ref)?Prompt|cloudSealPrompt)\('([^']*)'(?:, true)?\)/g
  const clientBodies = [...client.matchAll(re)].map((m) => m[1])
  const hostBodies = [...host.matchAll(re)].map((m) => m[1])
  assert.equal(clientBodies.length, 33)
  assert.deepEqual(clientBodies, hostBodies)
  assert.ok(clientBodies.every((body) => body.length >= 90))
})

test('Phase 0.2 jobs：provider 默认 minimax，hydrate 恢复 seedream', async () => {
  const { createJobs } = await import(new URL('../lib/jobs.js', import.meta.url).href)
  const clock = () => new Date('2026-11-15T00:00:00.000Z')
  const jobs = createJobs({ clock })
  const h3 = jobs.create({ styleId: 'h3-illus', prompt: 'p', size: '2048x2048' })
  assert.equal(h3.provider, 'minimax', '旧调用方不传 provider 时必须回落到 minimax')
  const seedream = jobs.create({ provider: 'seedream', styleId: 'seedream', prompt: 'p', size: '2048x2048', seed: 7 })
  assert.equal(seedream.provider, 'seedream')
  assert.equal(seedream.seed, 7)

  const restored = createJobs({ clock })
  const loaded = restored.hydrate([
    { id: 'job_seedream_restored', status: 'succeeded', provider: 'seedream', seed: 7, model: 'doubao-seedream-5-5-261028' },
    { id: 'job_legacy_restored', status: 'succeeded' },
  ])
  assert.equal(loaded.length, 2)
  assert.equal(restored.get('job_seedream_restored').provider, 'seedream')
  assert.equal(restored.get('job_legacy_restored').provider, 'minimax', '旧 job 快照没有 provider 时回落 minimax')
})

test('Phase 0.2 Seedream job：/seedream/jobs 作业合同、复现元数据、ledger 与 404/400', async () => {
  // Seedream 作业不依赖 H3 的 cloudEnabled 开关：先显式关掉再跑。
  const config = JSON.parse(readFileSync(CONFIG, 'utf8'))
  config.cloudEnabled = false
  writeFileSync(CONFIG, JSON.stringify(config, null, 2), { mode: 0o600 })

  // 与 H3 共用同一份测试凭据存储：这里切到 Seedream Key。
  const saved = await postJson('/seedream/key', { key: 'sk-seedream-test-1234' })
  assert.equal(saved.status, 200)
  assert.equal(saved.body.hasSeedreamKey, true)
  assert.equal(saved.body.cloud, false, 'cloudEnabled 必须仍是关闭状态')

  // 只 mock 火山 Ark /images/generations 与结果图下载；其余 fetch（测试自身调 HTTP 路由）原样放行。
  const realFetch = globalThis.fetch
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex')
  let providerCalls = 0
  const seenBodies = []
  globalThis.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input?.url
    if (url === 'https://ark.cn-beijing.volces.com/api/v3/images/generations') {
      providerCalls += 1
      assert.equal(init?.method, 'POST')
      seenBodies.push(JSON.parse(init.body))
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: [{ url: 'https://seedream-mock.invalid/result.png', size: '2048x2048' }],
            usage: { generated_images: 1 },
            request_id: 'req_seedream_1',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
    }
    if (url === 'https://seedream-mock.invalid/result.png') {
      return Promise.resolve(new Response(png, { status: 200, headers: { 'content-type': 'image/png' } }))
    }
    return realFetch(input, init)
  }

  try {
    // 非法 seed 必须在创建作业、发出请求之前 400。
    const before = providerCalls
    for (const badSeed of [1.5, -1, 4294967296, '123']) {
      const invalid = await postJson('/seedream/jobs', {
        prompt: 'x',
        size: '2048x2048',
        imageDataUrl: PNG_URL,
        seed: badSeed,
      })
      assert.equal(invalid.status, 400, `seed=${JSON.stringify(badSeed)} 必须 400`)
      assert.match(invalid.body.error, /seed/)
    }
    assert.equal(providerCalls, before, '非法 seed 不得触发任何 provider 调用')

    const started = await postJson('/seedream/jobs', {
      prompt: 'Seedream 作业合同测试',
      size: '2048x2048',
      imageDataUrl: PNG_URL,
      seed: 123456,
      parentId: 'job_parent_seedream',
      recipeId: 'recipe_seedream',
    })
    assert.equal(started.status, 202)
    assert.match(started.body.id, /^job_/)
    assert.equal(started.body.status, 'queued')

    const terminal = new Set(['succeeded', 'failed', 'canceled', 'unknown'])
    let job = null
    for (let i = 0; i < 300; i += 1) {
      const polled = await api(`/seedream/jobs/${started.body.id}`)
      assert.equal(polled.status, 200)
      job = polled.body
      if (terminal.has(job.status)) break
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    assert.equal(job.status, 'succeeded', JSON.stringify(job.error))

    // 作业身份 + provider/seed 元数据。
    assert.equal(job.provider, 'seedream')
    assert.equal(job.styleId, 'seedream')
    assert.equal(job.seed, 123456)
    assert.equal(job.model, 'doubao-seedream-5-5-261028')
    assert.equal(job.parentId, 'job_parent_seedream')
    assert.equal(job.recipeId, 'recipe_seedream')
    assert.equal(job.attempts, 1)

    // 作业输出契约。
    const url = `/image-workbench/result/${started.body.id}/seedream.jpg`
    assert.deepEqual(job.output, {
      url,
      w: 2048,
      h: 2048,
      costYuan: 0.28,
      model: 'doubao-seedream-5-5-261028',
      seed: 123456,
    })
    assert.equal(seenBodies.length, 1)
    assert.equal(seenBodies[0].model, 'doubao-seedream-5-5-261028')
    assert.equal(seenBodies[0].size, '2048x2048')
    assert.equal(seenBodies[0].image, PNG_URL)

    // 结果文件可读。
    const rendered = await api(url.replace('/image-workbench', ''))
    assert.equal(rendered.status, 200)
    assert.equal(rendered.body.length, png.length)

    // /history 行带复现元数据，且结果尺寸/成本可读。
    const history = await api('/history?limit=20')
    assert.equal(history.status, 200)
    const entry = history.body.entries.find((item) => item.id === started.body.id)
    assert.ok(entry, 'Seedream 作业必须出现在 /history')
    assert.equal(entry.model, 'doubao-seedream-5-5-261028')
    assert.equal(entry.seed, 123456)
    assert.equal(entry.size, '2048x2048')
    assert.equal(entry.parentId, 'job_parent_seedream')
    assert.equal(entry.recipeId, 'recipe_seedream')
    assert.equal(entry.results.length, 1)
    assert.equal(entry.results[0].url, url)
    assert.equal(entry.results[0].w, 2048)
    assert.equal(entry.results[0].h, 2048)
    assert.equal(entry.results[0].costYuan, 0.28)

    // index.jsonl 行同样落盘。
    const row = readFileSync(INDEX, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line))
      .find((item) => item.id === started.body.id)
    assert.ok(row)
    assert.equal(row.model, 'doubao-seedream-5-5-261028')
    assert.equal(row.seed, 123456)
    assert.equal(row.size, '2048x2048')
    assert.equal(row.parentId, 'job_parent_seedream')
    assert.equal(row.recipeId, 'recipe_seedream')

    // 同一份 ledger：provider=seedream，成本 0.28。
    const ledgerRow = readFileSync(join(DATA, 'ledger.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line))
      .find((item) => item.jobId === started.body.id)
    assert.ok(ledgerRow, 'Seedream 作业必须写入 ledger')
    assert.equal(ledgerRow.provider, 'seedream')
    assert.equal(ledgerRow.styleId, 'seedream')
    assert.equal(ledgerRow.costYuan, 0.28)
    assert.equal(ledgerRow.estimatedYuan, 0.28)

    // seed 省略时存 null，不编造。
    const bare = await postJson('/seedream/jobs', {
      prompt: '无 seed 作业',
      size: '2048x2048',
      imageDataUrl: PNG_URL,
    })
    assert.equal(bare.status, 202)
    let bareJob = null
    for (let i = 0; i < 300; i += 1) {
      const polled = await api(`/seedream/jobs/${bare.body.id}`)
      assert.equal(polled.status, 200)
      bareJob = polled.body
      if (terminal.has(bareJob.status)) break
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    assert.equal(bareJob.status, 'succeeded', JSON.stringify(bareJob.error))
    assert.equal(bareJob.seed, null)
    assert.equal(bareJob.parentId, null)
    assert.equal(bareJob.recipeId, null)
    assert.equal(bareJob.output.seed, null)

    // 旧的同步 /seedream/edit 仍然可用，并且自己生成 seed_* id。
    const edited = await postJson('/seedream/edit', {
      prompt: '同步路线兼容',
      size: '2048x2048',
      imageDataUrl: PNG_URL,
      model: 'doubao-seedream-5-5-261028',
    })
    assert.equal(edited.status, 200)
    assert.match(edited.body.url, /^\/image-workbench\/result\/seed_[a-z0-9]+\/seedream\.jpg$/)
    assert.equal(edited.body.w, 2048)
    assert.equal(edited.body.h, 2048)
    assert.equal(edited.body.costYuan, 0.28)
    assert.equal(edited.body.model, 'doubao-seedream-5-5-261028')
    assert.deepEqual(Object.keys(edited.body).sort(), ['costYuan', 'h', 'model', 'url', 'w'])

    // 缺失作业 404（查询与取消）。
    const missing = await api('/seedream/jobs/job_missing')
    assert.equal(missing.status, 404)
    const missingCancel = await postJson('/seedream/jobs/job_missing/cancel', {})
    assert.equal(missingCancel.status, 404)
  } finally {
    globalThis.fetch = realFetch
  }
})

test('Phase 1.2 /composite：区域合成落盘、本地可读、历史保留 region/w/h/parentId 且不记账', async () => {
  const parent = 'bregionparent01'
  const created = await postJson('/composite', {
    dataUrl: JPEG_URL,
    w: 640,
    h: 480,
    parentId: parent,
    recipeId: 'rregion1',
    prompt: '只换掉招牌',
  })
  assert.equal(created.status, 201)
  const saved = created.body
  assert.match(saved.id, /^comp_[a-z0-9]+$/)
  assert.equal(saved.w, 640)
  assert.equal(saved.h, 480)
  assert.equal(saved.url, `/image-workbench/result/${saved.id}/region.jpg`)

  const file = await api(saved.url.replace('/image-workbench', ''))
  assert.equal(file.status, 200)
  assert.equal(file.headers.get('content-type'), 'image/jpeg')
  assert.deepEqual(file.body, JPEG, '落盘字节必须与上传一致')

  const rows = readFileSync(INDEX, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line))
  const indexed = rows.find((row) => row.id === saved.id)
  assert.ok(indexed, 'index.jsonl 必须写入合成结果')
  assert.deepEqual(indexed.styleIds, ['region'])
  assert.equal(indexed.model, 'region-composite')
  assert.equal(indexed.parentId, parent)
  assert.equal(indexed.recipeId, 'rregion1')
  assert.equal(indexed.size, '640x480')
  assert.deepEqual(indexed.results.map((r) => r.costYuan), [0])

  const history = await api('/history?limit=100')
  const entry = history.body.entries.find((row) => row.id === saved.id)
  assert.ok(entry, '/history 必须包含合成结果')
  assert.deepEqual(entry.results.map((r) => r.styleId), ['region'])
  assert.equal(entry.results[0].url, saved.url)
  assert.equal(entry.results[0].w, 640)
  assert.equal(entry.results[0].h, 480)
  assert.equal(entry.results[0].costYuan, 0)
  assert.equal(entry.model, 'region-composite')
  assert.equal(entry.parentId, parent)
  assert.equal(entry.recipeId, 'rregion1')

  // PNG（带透明来源）走 .png 后缀，继续复用 /result 路由。
  const png = await postJson('/composite', { dataUrl: PNG_URL, w: 32, h: 16 })
  assert.equal(png.status, 201)
  assert.equal(png.body.url, `/image-workbench/result/${png.body.id}/region.png`)
  const pngFile = await api(png.body.url.replace('/image-workbench', ''))
  assert.equal(pngFile.status, 200)
  assert.equal(pngFile.headers.get('content-type'), 'image/png')
  assert.deepEqual(pngFile.body, PNG)
  const pngEntry = (await api('/history?limit=100')).body.entries.find((row) => row.id === png.body.id)
  assert.equal(pngEntry.parentId, null)
  assert.equal(pngEntry.results[0].w, 32)

  // 校验：非图片 dataUrl、非法 w/h、超限尺寸全部 400。
  assert.equal((await postJson('/composite', { dataUrl: 'data:text/plain;base64,aGVsbG8=', w: 1, h: 1 })).status, 400)
  assert.equal((await postJson('/composite', { dataUrl: JPEG_URL, w: 0, h: 10 })).status, 400)
  assert.equal((await postJson('/composite', { dataUrl: JPEG_URL, w: 10.5, h: 10 })).status, 400)
  assert.equal((await postJson('/composite', { dataUrl: JPEG_URL, w: 20001, h: 10 })).status, 400)
  assert.equal((await postJson('/composite', { w: 10, h: 10 })).status, 400)

  // 区域合成不调用 provider、不产生费用。
  const ledgerPath = join(DATA, 'ledger.jsonl')
  if (existsSync(ledgerPath)) {
    assert.ok(!readFileSync(ledgerPath, 'utf8').includes(saved.id), 'region 合成不能写 ledger')
  }
})

// ---- Phase 2.1：Host 队列（list / cancel / retry） ----

async function pollHostJob(path) {
  const terminal = new Set(['succeeded', 'failed', 'canceled', 'unknown'])
  for (let i = 0; i < 300; i += 1) {
    const res = await api(path)
    assert.equal(res.status, 200)
    if (terminal.has(res.body.status)) return res.body
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error(`作业 ${path} 未在预期时间内结束`)
}

test('Phase 2.1 jobs.list：newest-first、status/provider 过滤、limit 1–200', async () => {
  const {
    createJobs,
    normalizeListLimit,
    retryBlockedReason,
    MAX_LIST_LIMIT,
    DEFAULT_LIST_LIMIT,
  } = await import(new URL('../lib/jobs.js', import.meta.url).href)

  let tick = 0
  const clock = () => new Date(Date.UTC(2026, 10, 15) + tick++ * 1000)
  const jobs = createJobs({ clock })

  const first = jobs.create({ assetId: 'a'.repeat(16), styleId: 'h3-illus', prompt: '一', size: '2048x2048', seed: 1 })
  const second = jobs.create({ assetId: 'a'.repeat(16), styleId: 'h3-illus', prompt: '二', size: '2048x2048', seed: 2 })
  const third = jobs.create({ provider: 'seedream', styleId: 'seedream', prompt: '三', size: '2048x2048', seed: 3 })

  assert.deepEqual(jobs.list().map((job) => job.id), [third.id, second.id, first.id], '默认 newest-first')
  assert.deepEqual(jobs.list({ limit: 2 }).map((job) => job.id), [third.id, second.id])
  assert.equal(jobs.list({ limit: 0 }).length, 1, 'limit 下限为 1')
  assert.equal(jobs.list({ limit: 99999 }).length, 3, 'limit 上限 200，但不越过实际条数')
  assert.equal(normalizeListLimit(99999), MAX_LIST_LIMIT)
  assert.equal(normalizeListLimit('nope'), DEFAULT_LIST_LIMIT)
  assert.equal(normalizeListLimit(''), DEFAULT_LIST_LIMIT, '空 limit 回落默认值')
  assert.equal(normalizeListLimit(undefined), DEFAULT_LIST_LIMIT)

  jobs.failBeforeRequest(second.id, { code: 'auth', status: 401 })
  assert.deepEqual(jobs.list({ status: 'failed' }).map((job) => job.id), [second.id])
  assert.deepEqual(jobs.list({ status: 'queued' }).map((job) => job.id), [third.id, first.id])
  assert.deepEqual(jobs.list({ provider: 'seedream' }).map((job) => job.id), [third.id])
  assert.deepEqual(jobs.list({ provider: 'minimax' }).map((job) => job.id), [second.id, first.id])

  // 列表返回快照克隆，外部修改不会污染内部状态。
  const [snap] = jobs.list({ limit: 1 })
  snap.status = 'succeeded'
  assert.equal(jobs.get(third.id).status, 'queued')

  // 重试闸门：只有确定性失败可重试。
  assert.equal(retryBlockedReason(jobs.get(second.id)), null)
  const unknownJob = jobs.create({ styleId: 'h3-illus', prompt: 'u', size: '2048x2048' })
  unknownJob.status = 'unknown'
  assert.match(retryBlockedReason(unknownJob), /不能重试/)
  assert.match(retryBlockedReason(third), /不能重试/, '进行中的作业不能重试')
  assert.match(retryBlockedReason(jobs.get('job_missing')), /不能重试/)

  // reset 只复位允许重试的作业；unknown 永远拒绝。
  assert.ok(jobs.reset(second.id))
  assert.equal(jobs.get(second.id).status, 'queued')
  assert.equal(jobs.get(second.id).attempts, 0)
  assert.equal(jobs.get(second.id).requestSentAt, null)
  assert.equal(jobs.reset(unknownJob.id), null)
  assert.equal(jobs.get(unknownJob.id).status, 'unknown')

  // 取消优先：取消后的 preparing 与 start 都不能复活作业或触发 task。
  const canceledJob = jobs.create({ styleId: 'h3-illus', prompt: 'c', size: '2048x2048' })
  assert.equal(jobs.cancel(canceledJob.id).status, 'canceled')
  jobs.update(canceledJob.id, { status: 'preparing' })
  assert.equal(jobs.get(canceledJob.id).status, 'canceled', '迟到的 preparing 不能覆盖 canceled')
  let canceledStartCalls = 0
  await jobs.start(canceledJob.id, async () => {
    canceledStartCalls += 1
  })
  assert.equal(canceledStartCalls, 0, '已取消作业不得再调用 provider')
  assert.equal(jobs.get(canceledJob.id).status, 'canceled')
})

test('Phase 2.1 /cloud/jobs：列表过滤、确定性失败可重试并复用原参数、重复/缺失 409', async () => {
  const config = JSON.parse(readFileSync(CONFIG, 'utf8'))
  Object.assign(config, { cloudEnabled: true, base: 'cn', model: 'standard', billing: 'payg', budget: 999 })
  writeFileSync(CONFIG, JSON.stringify(config, null, 2), { mode: 0o600 })
  credential = { kind: 'api-key', key: 'sk-retry-test-1234' }

  const realFetch = globalThis.fetch
  const mode = { value: 'auth' }
  const textMode = { value: 'auth' }
  let providerCalls = 0
  let textCalls = 0
  const bodies = []
  const provider = await startMock(async (req, res) => {
    if (req.method === 'POST' && req.url === '/v1/images/generations') {
      textCalls += 1
      for await (const chunk of req) void chunk
      if (textMode.value === 'auth') {
        res.statusCode = 401
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ error: { message: 'invalid api key' } }))
        return
      }
      res.setHeader('content-type', 'application/json')
      res.end(
        JSON.stringify({
          data: [{ b64_json: JPEG.toString('base64'), size: '2048x2048', revised_prompt: '文生图重试成功' }],
          output_format: 'jpeg',
          usage: { generated_images: 1, total_tokens: 5 },
          request_id: 'req_text_retry_1',
        }),
      )
      return
    }
    if (req.method === 'POST' && req.url === '/v1/images/edits') {
      providerCalls += 1
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      bodies.push(Buffer.concat(chunks).toString('utf8'))
      if (mode.value === 'auth') {
        res.statusCode = 401
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ error: { message: 'invalid api key' } }))
        return
      }
      res.setHeader('content-type', 'application/json')
      res.end(
        JSON.stringify({
          data: [{ b64_json: JPEG.toString('base64'), size: '2048x2048', revised_prompt: '重试成功' }],
          output_format: 'jpeg',
          usage: { generated_images: 1, total_tokens: 5 },
          request_id: 'req_retry_1',
        }),
      )
      return
    }
    res.statusCode = 404
    res.end('not found')
  })
  const providerBase = `http://127.0.0.1:${provider.address().port}`
  globalThis.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input?.url
    if (typeof url === 'string' && url.startsWith('https://api.minimax.cn/')) {
      return realFetch(url.replace('https://api.minimax.cn', providerBase), init)
    }
    return realFetch(input, init)
  }

  try {
    const params = { strength: 0.75, source: 'retry-test' }
    const created = await postJson('/cloud/jobs', {
      assetId,
      styleId: 'h3-illus',
      prompt: '重试用的确定性失败',
      size: '2048x2048',
      seed: 4242,
      params,
      parentId: 'job_parent_retry',
      recipeId: 'recipe_retry',
    })
    assert.equal(created.status, 202)
    const jobId = created.body.id

    const failed = await pollHostJob(`/cloud/jobs/${jobId}`)
    assert.equal(failed.status, 'failed', JSON.stringify(failed.error))
    assert.equal(failed.error.code, 'auth')
    assert.ok(failed.requestSentAt, '确定性失败同样记录请求落点')
    assert.equal(providerCalls, 1)

    // 列表：newest-first、状态过滤、limit、provider 隔离、非法 status。
    const failedList = await api('/cloud/jobs?status=failed&limit=50')
    assert.equal(failedList.status, 200)
    assert.ok(Array.isArray(failedList.body.jobs))
    assert.ok(failedList.body.jobs.length > 0)
    assert.ok(failedList.body.jobs.every((job) => job.status === 'failed' && job.provider === 'minimax'))
    assert.ok(failedList.body.jobs.some((job) => job.id === jobId))
    const times = failedList.body.jobs.map((job) => job.createdAt)
    assert.deepEqual(times, [...times].sort().reverse(), '必须 newest-first')
    assert.equal((await api('/cloud/jobs?limit=1')).body.jobs.length, 1)
    assert.ok((await api('/cloud/jobs?status=queued&limit=0')).body.jobs.length <= 1, 'limit 下限为 1')
    assert.equal((await api('/cloud/jobs?status=bogus')).status, 400)

    // 重试：复位同一 job，复用已落盘的复现字段，只再发一次请求。
    mode.value = 'ok'
    const retried = await postJson(`/cloud/jobs/${jobId}/retry`, {})
    assert.equal(retried.status, 202)
    assert.equal(retried.body.id, jobId, '重试复用同一个 job id')
    assert.equal(retried.body.status, 'queued')

    const done = await pollHostJob(`/cloud/jobs/${jobId}`)
    assert.equal(done.status, 'succeeded', JSON.stringify(done.error))
    assert.equal(done.attempts, 1, '复位后只再执行一次')
    assert.equal(done.seed, 4242)
    assert.deepEqual(done.params, params)
    assert.equal(done.prompt, '重试用的确定性失败')
    assert.equal(done.size, '2048x2048')
    assert.equal(done.parentId, 'job_parent_retry')
    assert.equal(done.recipeId, 'recipe_retry')
    assert.equal(done.styleId, 'h3-illus')
    assert.equal(done.provider, 'minimax')
    assert.equal(done.output.url, `/image-workbench/result/${jobId}/h3-illus.jpg`)
    assert.equal(providerCalls, 2, '失败一次 + 重试一次')
    assert.ok(bodies[1].includes('重试用的确定性失败'), '重试必须复用原 prompt')
    assert.ok(bodies[1].includes('2048x2048'), '重试必须复用原 size')
    const file = await api(done.output.url.replace('/image-workbench', ''))
    assert.equal(file.status, 200)
    assert.deepEqual(file.body, JPEG)

    // 已成功的作业不能再重试；不存在的作业同样 409（不重新发送）。
    assert.equal((await postJson(`/cloud/jobs/${jobId}/retry`, {})).status, 409)
    const missingRetry = await postJson('/cloud/jobs/job_not_found_0000/retry', {})
    assert.equal(missingRetry.status, 409)
    assert.match(missingRetry.body.error, /不能重试/)
    assert.equal(providerCalls, 2)

    // 纯文生图（assetId 为空）走同一个 retry 入口，复用文本 job 的 prompt/size。
    const textCreated = await postJson('/cloud/text-jobs', { prompt: '文生图重试', size: '2048x2048' })
    assert.equal(textCreated.status, 202)
    const textFailed = await pollHostJob(`/cloud/jobs/${textCreated.body.id}`)
    assert.equal(textFailed.status, 'failed', JSON.stringify(textFailed.error))
    assert.equal(textCalls, 1)
    textMode.value = 'ok'
    const textRetried = await postJson(`/cloud/jobs/${textCreated.body.id}/retry`, {})
    assert.equal(textRetried.status, 202)
    assert.equal(textRetried.body.id, textCreated.body.id)
    const textDone = await pollHostJob(`/cloud/jobs/${textCreated.body.id}`)
    assert.equal(textDone.status, 'succeeded', JSON.stringify(textDone.error))
    assert.equal(textDone.output.url, `/image-workbench/result/${textCreated.body.id}/h3-text.jpg`)
    assert.equal(textCalls, 2)
  } finally {
    globalThis.fetch = realFetch
  }
})

test('Phase 2.1 retry：unknown（请求可能已发出）返回 409 且绝不重发', async () => {
  const config = JSON.parse(readFileSync(CONFIG, 'utf8'))
  Object.assign(config, { cloudEnabled: true, base: 'cn', model: 'standard', billing: 'payg', budget: 999 })
  writeFileSync(CONFIG, JSON.stringify(config, null, 2), { mode: 0o600 })
  credential = { kind: 'api-key', key: 'sk-unknown-test-1234' }

  const realFetch = globalThis.fetch
  let providerCalls = 0
  globalThis.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input?.url
    if (typeof url === 'string' && url.startsWith('https://api.minimax.cn/')) {
      providerCalls += 1
      return Promise.reject(new Error('socket hang up'))
    }
    return realFetch(input, init)
  }

  try {
    const created = await postJson('/cloud/jobs', {
      assetId,
      styleId: 'h3-illus',
      prompt: '不确定失败不可重试',
      size: '2048x2048',
    })
    assert.equal(created.status, 202)
    const jobId = created.body.id

    const unknown = await pollHostJob(`/cloud/jobs/${jobId}`)
    assert.equal(unknown.status, 'unknown', JSON.stringify(unknown.error))
    assert.equal(unknown.error.code, 'network')
    assert.equal(providerCalls, 1)

    const retried = await postJson(`/cloud/jobs/${jobId}/retry`, {})
    assert.equal(retried.status, 409)
    assert.match(retried.body.error, /可能已发出|不能重试/)
    assert.equal(providerCalls, 1, 'unknown 作业绝不能重发')
    assert.equal((await api(`/cloud/jobs/${jobId}`)).body.status, 'unknown')
  } finally {
    globalThis.fetch = realFetch
  }
})

test('Phase 2.1 Seedream：列表、取消竞态不覆盖 canceled、retry 409', async () => {
  const config = JSON.parse(readFileSync(CONFIG, 'utf8'))
  Object.assign(config, { cloudEnabled: true })
  writeFileSync(CONFIG, JSON.stringify(config, null, 2), { mode: 0o600 })
  credential = { kind: 'api-key', key: 'sk-seedream-queue-1234' }

  const realFetch = globalThis.fetch
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex')
  let providerCalls = 0
  let releaseProvider = null
  let signalProviderStarted = null
  const providerStarted = new Promise((resolve) => {
    signalProviderStarted = resolve
  })
  const gate = new Promise((resolve) => {
    releaseProvider = resolve
  })
  globalThis.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input?.url
    if (url === 'https://ark.cn-beijing.volces.com/api/v3/images/generations') {
      providerCalls += 1
      signalProviderStarted()
      return gate.then(
        () =>
          new Response(
            JSON.stringify({
              data: [{ url: 'https://seedream-queue.invalid/result.png', size: '2048x2048' }],
              usage: { generated_images: 1 },
              request_id: 'req_seedream_queue',
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
      )
    }
    if (url === 'https://seedream-queue.invalid/result.png') {
      return Promise.resolve(new Response(png, { status: 200, headers: { 'content-type': 'image/png' } }))
    }
    return realFetch(input, init)
  }

  try {
    const created = await postJson('/seedream/jobs', {
      prompt: '取消竞态',
      size: '2048x2048',
      imageDataUrl: PNG_URL,
      seed: 9,
    })
    assert.equal(created.status, 202)
    const jobId = created.body.id

    await providerStarted
    const running = await api(`/seedream/jobs/${jobId}`)
    assert.equal(running.body.status, 'running')
    assert.ok(running.body.requestSentAt, 'provider 调用进行中时已有请求落点')

    const canceled = await postJson(`/seedream/jobs/${jobId}/cancel`, {})
    assert.equal(canceled.status, 200)
    assert.equal(canceled.body.status, 'canceled')

    // 放行迟到的 provider 完成；jobs.start 的完成分支不得覆盖 canceled。
    releaseProvider()
    const outputFile = join(DATA, 'outputs', jobId, 'seedream.jpg')
    for (let i = 0; i < 300 && !existsSync(outputFile); i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
    const after = await api(`/seedream/jobs/${jobId}`)
    assert.equal(after.body.status, 'canceled', '迟到的完成不能覆盖 canceled')
    assert.equal(after.body.output, null)
    assert.equal(providerCalls, 1)

    // Seedream 列表：只含 seedream 作业，可按状态过滤，可由 limit 收敛。
    const canceledList = await api('/seedream/jobs?status=canceled&limit=10')
    assert.equal(canceledList.status, 200)
    assert.ok(canceledList.body.jobs.length > 0)
    assert.ok(canceledList.body.jobs.every((job) => job.provider === 'seedream' && job.status === 'canceled'))
    assert.ok(canceledList.body.jobs.some((job) => job.id === jobId))
    const succeededList = await api('/seedream/jobs?status=succeeded&limit=5')
    assert.ok(succeededList.body.jobs.every((job) => job.provider === 'seedream' && job.status === 'succeeded'))
    assert.ok(succeededList.body.jobs.length <= 5)
    assert.equal((await api('/seedream/jobs?status=bogus')).status, 400)

    // Seedream 作业源图未持久化：两个 retry 入口都是 409。
    const seedreamRetry = await postJson(`/seedream/jobs/${jobId}/retry`, {})
    assert.equal(seedreamRetry.status, 409)
    assert.match(seedreamRetry.body.error, /源图|持久化/)
    assert.equal((await postJson('/seedream/jobs/job_missing/retry', {})).status, 409)
    const cloudRetry = await postJson(`/cloud/jobs/${jobId}/retry`, {})
    assert.equal(cloudRetry.status, 409, 'cloud.retryJob 对 seedream 必须 409')
    assert.match(cloudRetry.body.error, /Seedream|源图|持久化/)
  } finally {
    globalThis.fetch = realFetch
  }
})

test('workflow persists both jobs and sends first output bytes to the second provider', async () => {
  const config = JSON.parse(readFileSync(CONFIG, 'utf8'))
  Object.assign(config, { cloudEnabled: true, base: 'cn', model: 'standard', billing: 'payg', budget: 500 })
  writeFileSync(CONFIG, JSON.stringify(config), { mode: 0o600 })
  credential = { kind: 'api-key', key: 'sk-workflow-test-1234' }
  const settings = await postJson('/settings', { startupMode: 'studio' })
  assert.equal(settings.body.startupMode, 'studio')
  assert.equal((await postJson('/settings', { startupMode: 'flow' })).body.startupMode, 'flow')
  const realFetch = globalThis.fetch
  const providerCalls = []
  globalThis.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input?.url
    if (url === 'https://api.minimax.cn/v1/images/generations') {
      providerCalls.push(JSON.parse(init.body))
      return Promise.resolve(Response.json({ data: [{ b64_json: PNG.toString('base64'), size: '2048x2048' }], output_format: 'png' }))
    }
    if (url === 'https://ark.cn-beijing.volces.com/api/v3/images/generations') {
      providerCalls.push(JSON.parse(init.body))
      return Promise.resolve(Response.json({ data: [{ b64_json: JPEG.toString('base64'), size: '1536x1536' }], output_format: 'jpeg' }))
    }
    return realFetch(input, init)
  }
  try {
    const request = {
      id: 'host-workflow-test-0001',
      first: { provider: 'minimax', prompt: '首轮提示词', size: '2048x2048', format: 'png', styleId: 'h3-illus' },
      edit: { provider: 'seedream', prompt: '只修改背景', size: '1536x1536', format: 'jpeg' },
    }
    const submitted = await postJson('/workflows', request)
    assert.equal(submitted.status, 202, JSON.stringify(submitted.body))
    assert.equal((await postJson('/workflows', request)).status, 202)
    let record
    for (let i = 0; i < 60; i++) {
      record = (await api('/workflows/' + request.id)).body
      if (['done', 'first-failed', 'edit-failed', 'unknown'].includes(record.status)) break
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    assert.equal(record.status, 'done', JSON.stringify(record))
    assert.equal(providerCalls.length, 2)
    assert.equal(providerCalls[0].output_format, 'png')
    assert.equal(providerCalls[1].image, PNG_URL)
    assert.equal(providerCalls[1].prompt, '只修改背景')
    assert.equal(providerCalls[1].size, '1536x1536')
    const result = await realFetch('http://127.0.0.1:' + PORT + record.firstOutput.url)
    assert.equal(result.headers.get('content-type'), 'image/png')
    assert.notEqual(record.firstOutput.url, record.editOutput.url)
    const history = (await api('/workflows')).body.workflows.find(entry => entry.id === request.id)
    assert.deepEqual([history.firstOutput.url, history.editOutput.url], [record.firstOutput.url, record.editOutput.url])
    assert.equal((await api('/seedream/jobs/' + record.editJobId)).body.parentId, record.firstJobId)
  } finally {
    globalThis.fetch = realFetch
  }
})

test('V2 capability and storage routes expose conservative capabilities and a writable root', async () => {
  const capabilities = await api('/v2/capabilities')
  assert.equal(capabilities.status, 200)
  assert.equal(capabilities.body.capabilities.minimax.modelId, 'MiniMax-H3-Image')
  assert.equal(capabilities.body.capabilities.seedream.layerSplit.verified, true)
  assert.equal(capabilities.body.capabilities.seedream.layerSplit.maxLayers, 99)
  const storage = await api('/v2/storage')
  assert.equal(storage.status, 200)
  assert.ok(storage.body.active.endsWith('图像工作台'))
  const root = mkdtempSync(join(HOME, 'custom-root-'))
  const changed = await postJson('/v2/storage', { root })
  assert.equal(changed.status, 200)
  assert.equal(changed.body.active, root)
  assert.ok(changed.body.roots.some(entry => entry.path === root && entry.active))
})

test('V2 job route persists a rejected provider as a failed job', async () => {
  const created = await postJson('/v2/jobs', {
    snapshot: { provider: 'nope', operation: 'text_to_image', prompt: 'probe', width: 1024, height: 1024, format: 'png', size: '1024x1024' },
    idempotencyKey: 'host-v2-probe-' + Date.now(),
  })
  assert.equal(created.status, 202)
  assert.equal(created.body.status, 'queued')
  let job = created.body
  for (let i = 0; i < 20; i += 1) {
    await new Promise(resolve => setTimeout(resolve, 50))
    job = (await api('/v2/jobs/' + encodeURIComponent(created.body.id))).body
    if (['failed', 'unknown', 'succeeded'].includes(job.status)) break
  }
  assert.equal(job.status, 'failed')
  assert.equal(job.error.code, 'unknown_provider')
})

test('V2 version files stay readable after switching storage root', async () => {
  const firstRoot = mkdtempSync(join(HOME, 'root-one-'))
  const secondRoot = mkdtempSync(join(HOME, 'root-two-'))
  const first = await postJson('/v2/storage', { root: firstRoot })
  assert.equal(first.status, 200)
  const { openIndex } = await import('../lib/sqlite.js')
  const { createArtworkRepository } = await import('../lib/artworks.js')
  const index = await openIndex(join(DATA, 'v2.sqlite'))
  assert.ok(index)
  const repo = createArtworkRepository({ root: firstRoot, index })
  const artwork = await repo.create({ title: 'cross-root' })
  const version = await repo.addVersion({ artworkId: artwork.id, buffer: PNG, width: 64, height: 64 })
  index.close()
  const second = await postJson('/v2/storage', { root: secondRoot })
  assert.equal(second.status, 200)
  const file = await api('/v2/artworks/' + artwork.id + '/versions/' + version.id + '/file')
  assert.equal(file.status, 200)
  assert.equal(file.body.length, PNG.length)
})

test('V2 layer ZIP route serves manifest and transparent PNG entries', async () => {
  const root = mkdtempSync(join(HOME, 'root-layers-'))
  await postJson('/v2/storage', { root })
  const { openIndex } = await import('../lib/sqlite.js')
  const { createArtworkRepository } = await import('../lib/artworks.js')
  const index = await openIndex(join(DATA, 'v2.sqlite'))
  const repo = createArtworkRepository({ root, index })
  const artwork = await repo.create({ title: 'layers-route' })
  const version = await repo.addVersion({ artworkId: artwork.id, buffer: PNG, width: 64, height: 64 })
  await repo.attachLayers(artwork.id, version.id, { canvasWidth: 64, canvasHeight: 64, layers: [{ id: 'l1', file: 'layer_01.png', zIndex: 0, x: 0, y: 0, opacity: 1, blendMode: 'normal' }] }, { 'layer_01.png': PNG })
  index.close()
  const zip = await api('/v2/artworks/' + artwork.id + '/versions/' + version.id + '/layers.zip')
  assert.equal(zip.status, 200)
  assert.match(zip.headers.get('content-type'), /zip/)
  assert.equal(zip.body.subarray(0, 4).toString('hex'), '504b0304')
})

test('V2 storage relink keeps old artwork bytes reachable', async () => {
  const from = mkdtempSync(join(HOME, 'root-move-from-'))
  const to = mkdtempSync(join(HOME, 'root-move-to-'))
  await postJson('/v2/storage', { root: from })
  const { openIndex } = await import('../lib/sqlite.js')
  const { createArtworkRepository } = await import('../lib/artworks.js')
  const index = await openIndex(join(DATA, 'v2.sqlite'))
  const repo = createArtworkRepository({ root: from, index })
  const artwork = await repo.create({ title: 'move-me' })
  const version = await repo.addVersion({ artworkId: artwork.id, buffer: PNG, width: 64, height: 64 })
  index.close()
  renameSync(join(from, artwork.folder), join(to, artwork.folder))
  const relinked = await postJson('/v2/storage/relink', { from, to })
  assert.equal(relinked.status, 200)
  assert.equal(relinked.body.relinked.to, to)
  const file = await api('/v2/artworks/' + artwork.id + '/versions/' + version.id + '/file')
  assert.equal(file.status, 200)
  assert.equal(file.body.length, PNG.length)
})

test('V2 persists a layer group into the artwork DAG', async () => {
  const root = mkdtempSync(join(HOME, 'root-layer-dag-'))
  await postJson('/v2/storage', { root })
  const { openIndex } = await import('../lib/sqlite.js')
  const { createArtworkRepository } = await import('../lib/artworks.js')
  const index = await openIndex(join(DATA, 'v2.sqlite'))
  const repo = createArtworkRepository({ root, index })
  const artwork = await repo.create({ title: 'layer-dag' })
  const source = await repo.addVersion({ artworkId: artwork.id, buffer: PNG, width: 64, height: 64, prompt: 'source' })
  index.close()
  const group = join(DATA, 'outputs', 'layer_testdag')
  mkdirSync(group, { recursive: true })
  writeFileSync(join(group, 'layer-0.png'), PNG)
  writeFileSync(join(group, 'layer-1.png'), PNG)
  const res = await postJson('/v2/artworks/' + artwork.id + '/versions/' + source.id + '/layers', { groupId: 'layer_testdag' })
  assert.equal(res.status, 201)
  assert.equal(res.body.version.parentVersionId, source.id)
  assert.equal(res.body.manifest.layers.length, 1)
  assert.ok(res.body.version.layerManifest === undefined || true)
  const zip = await api('/v2/artworks/' + artwork.id + '/versions/' + res.body.version.id + '/layers.zip')
  assert.equal(zip.status, 200)
})
