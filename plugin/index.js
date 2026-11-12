// 图像风格工作台 — Host 半侧。
// 只负责设置与示例图：本机风格全在浏览器里渲染，P1 不调用 MiniMax。
import { createReadStream } from 'node:fs'
import { chmod, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(homedir(), 'Data', 'dsh-image-workbench')
const CONFIG = join(ROOT, 'config.json')
const SAMPLE = join(HERE, 'assets', 'sample.jpg')
const CREDENTIAL = 'dsh-image-workbench/minimax'
const SIZES = ['640', '960', '1200']
const MAX_BODY = 64 * 1024
const DEFAULTS = Object.freeze({
  budget: 10,
  privacyConfirm: true,
  defaultSize: '960',
  concurrency: 2,
  base: 'cn',
  model: 'standard',
  billing: 'payg',
})

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(body))
}

function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status })
}

async function readBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY) fail('请求内容太大', 413)
    chunks.push(chunk)
  }
  if (!chunks.length) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    fail('请求不是有效的 JSON')
  }
}

async function readConfig() {
  try {
    const saved = JSON.parse(await readFile(CONFIG, 'utf8'))
    return { ...DEFAULTS, ...saved }
  } catch (err) {
    if (err.code === 'ENOENT' || err instanceof SyntaxError) return { ...DEFAULTS }
    throw err
  }
}

function sanitizeConfig(body, current) {
  const next = { ...current }
  if (body.budget !== undefined) {
    const n = Number(body.budget)
    if (!Number.isFinite(n) || n < 0 || n > 500) fail('每日预算要在 0–500 元之间')
    next.budget = Math.round(n)
  }
  if (body.privacyConfirm !== undefined) {
    if (typeof body.privacyConfirm !== 'boolean') fail('隐私设置无效')
    next.privacyConfirm = body.privacyConfirm
  }
  if (body.defaultSize !== undefined) {
    if (!SIZES.includes(body.defaultSize)) fail('默认尺寸无效')
    next.defaultSize = body.defaultSize
  }
  if (body.concurrency !== undefined) {
    const n = Number(body.concurrency)
    if (!Number.isInteger(n) || n < 1 || n > 4) fail('并发生成要在 1–4 之间')
    next.concurrency = n
  }
  if (body.base !== undefined) {
    if (!['cn', 'intl'].includes(body.base)) fail('接口地址无效')
    next.base = body.base
  }
  if (body.model !== undefined) {
    if (!['standard', 'highspeed'].includes(body.model)) fail('模型无效')
    next.model = body.model
  }
  if (body.billing !== undefined) {
    if (!['payg', 'mplan'].includes(body.billing)) fail('计费方式无效')
    next.billing = body.billing
  }
  return next
}

async function writeConfig(next) {
  await mkdir(ROOT, { recursive: true })
  const tmp = `${CONFIG}.${process.pid}.tmp`
  await writeFile(tmp, JSON.stringify(next, null, 2), { mode: 0o600 })
  await chmod(tmp, 0o600)
  await rename(tmp, CONFIG)
}

async function keyInfo(ctx) {
  try {
    const record = await ctx.get('credentials')?.readRecord(CREDENTIAL)
    if (record?.kind !== 'api-key' || !record.key) return { hasKey: false, keyHint: '' }
    return { hasKey: true, keyHint: String(record.key).slice(-4).toUpperCase() }
  } catch {
    return { hasKey: false, keyHint: '' }
  }
}

async function publicSettings(ctx) {
  const config = await readConfig()
  const key = await keyInfo(ctx)
  return { ...config, ...key, cloud: false, phase: 'P1' }
}

async function applyKey(ctx, body) {
  const store = ctx.get('credentials')
  if (body.clearKey === true) {
    if (store) await store.deleteRecord(CREDENTIAL)
    return
  }
  if (typeof body.key !== 'string') return
  const key = body.key.trim()
  if (!key) return
  if (key.length > 4096) fail('API Key 太长')
  if (!store) fail('当前 Harness 没有可用的凭据存储')
  await store.modifyRecord(CREDENTIAL, async () => ({ kind: 'api-key', key }))
}

async function serveSample(req, res) {
  let info
  try {
    info = await stat(SAMPLE)
  } catch {
    return json(res, 404, { error: '示例图不存在' })
  }
  res.statusCode = 200
  res.setHeader('content-type', 'image/jpeg')
  res.setHeader('content-length', String(info.size))
  res.setHeader('cache-control', 'private, max-age=3600')
  res.setHeader('x-content-type-options', 'nosniff')
  createReadStream(SAMPLE).pipe(res)
}

export const name = 'dsh-image-workbench'

export default {
  inject: ['webServer', 'connection'],
  apply(ctx) {
    const route = async (req, res) => {
      const rejection = ctx.get('connection')?.requestRejection?.({ headers: req.headers })
      if (rejection) return json(res, rejection, { error: '未授权' })

      const url = new URL(req.url ?? '/', 'http://localhost')
      const path = url.pathname.replace(/^\/image-workbench\/?/, '')
      const method = req.method ?? 'GET'

      if (method === 'GET' && path === 'settings') {
        return json(res, 200, await publicSettings(ctx))
      }
      if (method === 'GET' && path === 'health') {
        return json(res, 200, { ok: true, phase: 'P1' })
      }
      if (method === 'GET' && path === 'sample') {
        return serveSample(req, res)
      }
      if (method === 'POST' && path === 'settings') {
        const body = await readBody(req)
        const next = sanitizeConfig(body, await readConfig())
        await writeConfig(next)
        await applyKey(ctx, body)
        return json(res, 200, await publicSettings(ctx))
      }
      if (method === 'POST' && path === 'test') {
        const key = await keyInfo(ctx)
        if (!key.hasKey) return json(res, 400, { ok: false, error: '还没有保存 API Key' })
        return json(res, 200, {
          ok: true,
          message: 'Key 已保存。P1 只做本机风格，云端联通会在 P3 接入时验证。',
        })
      }
      json(res, 404, { error: '接口不存在' })
    }

    ctx.effect(
      () =>
        ctx.webServer.register({
          kind: 'prefix',
          path: '/image-workbench',
          handler: async (req, res) => {
            try {
              await route(req, res)
            } catch (err) {
              if (res.headersSent) {
                res.end()
                return
              }
              json(res, err?.status || 500, { error: err?.message || '设置服务出错' })
            }
          },
        }),
      'dsh-image-workbench: settings routes',
    )
  },
}
