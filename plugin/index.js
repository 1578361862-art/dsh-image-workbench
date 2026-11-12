// 图像风格工作台 — Host 半侧。
// P1 设置/示例图 + P2 原图/批次/历史/导出；P3 云端能力默认关闭（config.cloudEnabled）。
import { createReadStream } from 'node:fs'
import { chmod, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCloud } from './lib/cloud.js'
import { MAX_EXPORT_BYTES, MAX_IMAGE_BYTES, createStorage } from './lib/storage.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(homedir(), 'Data', 'dsh-image-workbench')
const CONFIG = join(ROOT, 'config.json')
const SAMPLE = join(HERE, 'assets', 'sample.jpg')
const CREDENTIAL = 'dsh-image-workbench/minimax'
const SIZES = ['640', '960', '1200']
const MAX_BODY = 64 * 1024
const MAX_ASSET_BODY = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 2 * 1024 * 1024
const MAX_BATCH_BODY = 64 * 1024 * 1024
const MAX_EXPORT_BODY = Math.ceil((MAX_EXPORT_BYTES * 4) / 3) + 8 * 1024 * 1024
const MAX_CLOUD_BODY = 256 * 1024
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

async function readBody(req, limit = MAX_BODY) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) fail('请求内容太大', 413)
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

async function readKeyValue(ctx) {
  try {
    const record = await ctx.get('credentials')?.readRecord(CREDENTIAL)
    if (record?.kind !== 'api-key' || !record.key) return null
    return String(record.key)
  } catch {
    return null
  }
}

async function keyInfo(ctx) {
  const key = await readKeyValue(ctx)
  if (!key) return { hasKey: false, keyHint: '' }
  return { hasKey: true, keyHint: key.slice(-4).toUpperCase() }
}

async function publicSettings(ctx) {
  const config = await readConfig()
  const key = await keyInfo(ctx)
  return { ...config, ...key, cloud: false, phase: 'P2' }
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

async function serveStored(res, file, mime) {
  let info
  try {
    info = await stat(file)
  } catch {
    return json(res, 404, { error: '文件不存在' })
  }
  if (!info.isFile()) return json(res, 404, { error: '文件不存在' })
  res.statusCode = 200
  res.setHeader('content-type', mime)
  res.setHeader('content-length', String(info.size))
  res.setHeader('cache-control', 'private, max-age=3600')
  res.setHeader('x-content-type-options', 'nosniff')
  const stream = createReadStream(file)
  stream.on('error', () => {
    if (!res.headersSent) json(res, 500, { error: '读取失败' })
    else res.destroy()
  })
  stream.pipe(res)
}

function zipFileName() {
  return `image-workbench-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`
}

export const name = 'dsh-image-workbench'

export default {
  inject: ['webServer', 'connection'],
  apply(ctx) {
    const storage = createStorage(ROOT)
    const cloud = createCloud({
      root: ROOT,
      storage,
      readKey: () => readKeyValue(ctx),
    })

    const route = async (req, res) => {
      const rejection = ctx.get('connection')?.requestRejection?.({ headers: req.headers })
      if (rejection) return json(res, rejection, { error: '未授权' })

      const url = new URL(req.url ?? '/', 'http://localhost')
      const path = url.pathname.replace(/^\/image-workbench\/?/, '')
      const method = req.method ?? 'GET'
      const seg = path.split('/').filter(Boolean)

      if (method === 'GET' && path === 'settings') {
        return json(res, 200, await publicSettings(ctx))
      }
      if (method === 'GET' && path === 'health') {
        return json(res, 200, { ok: true, phase: 'P2' })
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
          message: 'Key 已保存。P1/P2 只做本机风格，云端联通会在 P3 接入时验证。',
        })
      }

      // ---- P2：原图 / 批次 / 历史 / 导出 ----
      if (method === 'POST' && path === 'assets') {
        const body = await readBody(req, MAX_ASSET_BODY)
        const saved = await storage.putAsset(body ?? {})
        return json(res, 200, {
          id: saved.meta.id,
          name: saved.meta.name,
          w: saved.meta.w,
          h: saved.meta.h,
          bytes: saved.meta.bytes,
          url: saved.url,
        })
      }
      if (method === 'GET' && seg.length === 2 && seg[0] === 'asset') {
        const asset = await storage.getAsset(seg[1])
        if (!asset) return json(res, 404, { error: '资源不存在' })
        return serveStored(res, asset.path, asset.meta.mime)
      }
      if (method === 'POST' && path === 'batches') {
        const body = await readBody(req, MAX_BATCH_BODY)
        return json(res, 201, await storage.createBatch(body ?? {}))
      }
      if (method === 'GET' && path === 'history') {
        return json(res, 200, await storage.listHistory(url.searchParams.get('limit') ?? 20))
      }
      if (method === 'DELETE' && seg.length === 2 && seg[0] === 'batch') {
        return json(res, 200, await storage.deleteBatch(seg[1]))
      }
      if (method === 'GET' && seg.length === 3 && seg[0] === 'result' && /\.jpg$/i.test(seg[2])) {
        const file = storage.resultPath(seg[1], seg[2].slice(0, -4))
        if (!file) return json(res, 404, { error: '结果不存在' })
        return serveStored(res, file, 'image/jpeg')
      }
      if (method === 'GET' && path === 'storage') {
        return json(res, 200, await storage.stats())
      }
      if (method === 'POST' && path === 'export') {
        const body = await readBody(req, MAX_EXPORT_BODY)
        const { buffer } = await storage.exportZip(body?.files, body?.manifest)
        res.statusCode = 200
        res.setHeader('content-type', 'application/zip')
        res.setHeader('content-disposition', `attachment; filename="${zipFileName()}"`)
        res.setHeader('content-length', String(buffer.length))
        res.setHeader('cache-control', 'no-store')
        res.end(buffer)
        return
      }

      // ---- P3：云端基础能力，默认关闭 ----
      if (path === 'usage' && method === 'GET') {
        const config = await readConfig()
        if (config.cloudEnabled !== true) return json(res, 403, { error: '云端功能未启用' })
        return json(res, 200, await cloud.usage())
      }
      if (seg[0] === 'cloud') {
        const config = await readConfig()
        if (config.cloudEnabled !== true) return json(res, 403, { error: '云端功能未启用' })
        if (method === 'POST' && path === 'cloud/jobs') {
          const body = await readBody(req, MAX_CLOUD_BODY)
          return json(res, 202, await cloud.createJob(body ?? {}, config))
        }
        if (method === 'GET' && seg.length === 3 && seg[1] === 'jobs') {
          return json(res, 200, cloud.getJob(seg[2]))
        }
        if (method === 'POST' && path === 'cloud/key-test') {
          const key = await readKeyValue(ctx)
          if (!key) return json(res, 400, { ok: false, supported: false, error: '还没有保存 API Key' })
          // 官方没有公开的免计费鉴权探测端点：只如实说明，不伪造成功。
          return json(res, 501, {
            ok: false,
            supported: false,
            code: 'unsupported',
            error: 'MiniMax 没有公开的免计费鉴权探测端点，无法在这里验证 Key；请用一次云端生成确认（会产生费用）。',
          })
        }
        return json(res, 404, { error: '接口不存在' })
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
              const body = { error: err?.message || '设置服务出错' }
              if (err?.details && typeof err.details === 'object') Object.assign(body, err.details)
              json(res, err?.status || 500, body)
            }
          },
        }),
      'dsh-image-workbench: settings routes',
    )
  },
}
