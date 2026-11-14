// 图像风格工作台 — Host 半侧。
// P1 设置/示例图 + P2 原图/批次/历史/导出；P3 云端能力默认关闭（config.cloudEnabled）。
import { createReadStream } from 'node:fs'
import { chmod, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCloud } from './lib/cloud.js'
import { estimate } from './lib/budget.js'
import { baseUrlFor, generateContextIR, modelFor, sniffMime } from './lib/minimax.js'
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
const MAX_STYLE_BODY = 4 * 1024 * 1024
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
  if (body.enableCloud === true) next.cloudEnabled = true
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
  return { ...config, ...key, cloud: config.cloudEnabled === true && key.hasKey, phase: 'P2' }
}

async function applyKey(ctx, body) {
  const store = ctx.get('credentials')
  const config = await readConfig()
  if (body.clearKey === true) {
    if (store) await store.deleteRecord(CREDENTIAL)
    if (config.cloudEnabled === true) {
      config.cloudEnabled = false
      await writeConfig(config)
    }
    return
  }
  if (typeof body.key !== 'string') return
  const key = body.key.trim()
  if (!key) return
  if (key.length > 4096) fail('API Key 太长')
  if (!store) fail('当前 Harness 没有可用的凭据存储')
  await store.modifyRecord(CREDENTIAL, async () => ({ kind: 'api-key', key }))
  if (config.cloudEnabled !== true) {
    config.cloudEnabled = true
    await writeConfig(config)
  }
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

// Cloud style prompts summarized from MiniMax-H3-Image's official showcase:
// https://github.com/MiniMax-AI/MiniMax-H3-Image/tree/main/showcase
const CLOUD_STYLES = Object.freeze({
  'h3-illus': {
    name: 'H3 插画化',
    prompt: '将图1转为 H3 插画风格：保留主体身份、姿态、构图、文字和背景关系；只改变材质、光线、色彩与笔触；暖色、细颗粒、轻微光晕。',
  },
  'h3-silver': {
    name: 'H3 银盐',
    prompt: '将图1转为黑白银盐写真：保留主体身份、姿态、构图、文字和背景关系；只改变影调、材质与颗粒；深黑、银灰、高光柔和。',
  },
  'h3-oil': {
    name: '古典油画',
    prompt: '以图1为唯一主体与构图参考，转为17世纪欧洲古典油画：伦勃朗/卡拉瓦乔式明暗对照，深色背景与单侧暖光，可见笔触、厚涂高光、亚麻画布纹理与陈年清漆的暖金色；保留主体身份、姿态、画面布局和文字位置，不改变内容。',
  },
  'h3-impression': {
    name: '印象派',
    prompt: '以图1为唯一主体与构图参考，转为法国印象派油画：湿画法、可见短笔触、纯色并置、高调晨雾与柔光，形体在光中溶解但轮廓仍可辨；保留主体身份、姿态、主要构图和文字位置；不要水墨、工笔或数字模糊。',
  },
  'h3-manuscript': {
    name: '金箔手抄本',
    prompt: '以图1为主体与构图参考，转为中世纪泥金手抄本插画：平涂蛋彩、深色墨线、平透视、朱红/群青/金箔、卷草纹边框与羊皮纸磨损；保留主体可识别和构图，金饰不遮挡主体与文字。',
  },
  'h3-dunhuang': {
    name: '敦煌壁画',
    prompt: '以图1为主体与构图参考，转为唐代敦煌土壁壁画：矿物颜料（朱砂、石青、石绿、赭石）、土壁颗粒与细线人物，飘带/云纹、平涂与局部晕染；保留主体身份、姿态和构图，不做电影光或金属反射。',
  },
  'h3-gongbi': {
    name: '工笔重彩',
    prompt: '以图1为主体与构图参考，转为中国工笔重彩绢本：细密线描、矿物色分层罩染、绢丝纹理与留白；保留主体身份、姿态、构图和文字位置；不要写意或油画笔触。',
  },
  'h3-collage': {
    name: '剪纸拼贴',
    prompt: '以图1为主体与构图参考，转为手工剪纸与纸张拼贴：分层色纸、清晰刀口和纸边、轻微投影、有限暖色/蓝灰色板；把细节简化为纸片形状，保留主体轮廓、姿态、构图和文字。',
  },
  'h3-pixel': {
    name: '像素海报',
    prompt: '以图1为主体与构图参考，转为复古像素海报：有限调色板、清晰像素格、有序抖动、8/16-bit 质感；保留主体身份、姿态、构图和文字可读性，不要平滑渐变或3D渲染。',
  },
  'h3-film': {
    name: '电影胶片',
    prompt: '以图1为主体与构图参考，转为35mm电影胶片剧照/纪实摄影：自然光、浅景深、细颗粒、轻微 halation、真实肤色；保留主体、姿态、构图和文字；不要插画或绘画。',
  },
  'h3-concept': {
    name: '概念场景',
    prompt: '以图1为主体与构图参考，转为游戏/电影概念场景 matte painting：大气透视、层次光、手绘笔触与照片纹理结合；保留主体轮廓、姿态和主要构图，不添加UI、字幕或水印。',
  },
})

async function readToolImage(storage, imagePath) {
  if (typeof imagePath !== 'string' || !imagePath.trim()) fail('imagePath 不能为空')
  const abs = resolve(imagePath)
  let info
  try {
    info = await stat(abs)
  } catch {
    fail('imagePath 不存在或不可读: ' + abs)
  }
  if (!info.isFile()) fail('imagePath 不是文件')
  if (info.size > MAX_IMAGE_BYTES) fail('图片超过 20 MB')
  const buffer = await readFile(abs)
  const mime = sniffMime(buffer)
  const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`
  return storage.putAsset({ dataUrl, name: basename(abs), w: 0, h: 0 })
}

function registerImageTool(ctx, cloud, storage) {
  const tools = ctx.get('tools') ?? ctx.tools
  if (!tools || typeof tools.register !== 'function') return
  ctx.effect(
    () =>
      tools.register({
        name: 'image_workbench',
        description:
          '用图像风格工作台的 MiniMax H3 云端出图。只能生成云端 H3 风格；本机 Canvas 风格只在工作台页面里。先 action=estimate 让用户确认费用，再 action=start 且 confirm=true；start 只创建作业，用 action=status 轮询。',
        parameters: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['estimate', 'start', 'status'], description: 'estimate 估价 / start 创建作业 / status 查询' },
            imagePath: { type: 'string', description: '本地图片绝对路径（start 必填），≤20 MB' },
            style: { type: 'string', enum: Object.keys(CLOUD_STYLES), description: '云端风格' },
            quality: { type: 'string', enum: ['1K', '2K', '4K'], description: '云端画质，默认 2K' },
            prompt: { type: 'string', description: '可选；覆盖默认风格提示词' },
            jobId: { type: 'string', description: 'status 必填' },
            confirm: { type: 'boolean', description: 'start 必须 true，表示用户已确认费用；否则只返回估价' },
          },
          required: ['action'],
          additionalProperties: false,
        },
        output: {
          schema: {
            type: 'object',
            properties: {
              jobId: { type: 'string' },
              status: { type: 'string' },
              costYuan: { type: 'number' },
              file: { type: 'string' },
              url: { type: 'string' },
              error: { type: 'object' },
            },
          },
          render: (_args, value) => {
            if (value?.requiresConfirmation) {
              return [{ type: 'text', text: `云端 ${value.styleName} ${value.quality} 预计 ¥${Number(value.costYuan).toFixed(4)}；需要用户确认后再用 confirm=true 调用。` }]
            }
            const lines = [`云端作业 ${value?.jobId ?? ''} · ${value?.status ?? ''}`]
            if (value?.file) lines.push(`文件：${value.file}`)
            if (value?.url) lines.push(`URL：${value.url}`)
            if (value?.costYuan !== undefined) lines.push(`预估：¥${Number(value.costYuan).toFixed(4)}`)
            if (value?.error) lines.push(`错误：${value.error.code || ''} ${value.error.message || ''}`)
            return [{ type: 'text', text: lines.join('\n') }]
          },
        },
        async execute(args = {}) {
          const action = args.action
          if (action === 'status') {
            if (typeof args.jobId !== 'string' || !args.jobId) fail('status 需要 jobId')
            await cloud.ready
            const job = cloud.getJob(args.jobId)
            const out = { jobId: job.id, status: job.status }
            if (job.output) {
              out.file = join(ROOT, 'outputs', job.id, `${job.styleId}.jpg`)
              if (job.output.url) out.url = job.output.url
              out.costYuan = estimate({ size: job.size, speed: job.model, billing: 'payg', count: 1 }).costYuan
            }
            if (job.error) out.error = job.error
            return out
          }
          if (action !== 'estimate' && action !== 'start') fail('action 必须是 estimate / start / status')
          const style = CLOUD_STYLES[args.style]
          if (!style) fail('未知云端风格；本机风格请在页面工作台使用')
          const quality = ['1K', '2K', '4K'].includes(args.quality) ? args.quality : '2K'
          const config = await readConfig()
          if (config.cloudEnabled !== true) fail('云端未启用；先在工作台设置里保存 API Key')
          const price = estimate({ size: quality, speed: config.model, billing: config.billing, count: 1 })
          if (action === 'estimate' || args.confirm !== true) {
            return {
              requiresConfirmation: true,
              styleName: style.name,
              quality,
              costYuan: price.costYuan,
              hint: '询问用户确认费用后，再 action=start + confirm=true。',
            }
          }
          const saved = await readToolImage(storage, args.imagePath)
          const job = await cloud.createJob(
            {
              assetId: saved.meta.id,
              styleId: args.style,
              prompt: typeof args.prompt === 'string' && args.prompt.trim() ? args.prompt : style.prompt,
              size: quality,
              params: {},
            },
            config,
          )
          return { jobId: job.id, status: job.status, costYuan: price.costYuan }
        },
      }),
    'dsh-image-workbench: image_workbench tool',
  )
}

export const name = 'dsh-image-workbench'

export default {
  inject: ['webServer', 'connection', 'tools'],
  apply(ctx) {
    const storage = createStorage(ROOT)
    storage.backfillCloudIndex().catch(() => {})
    storage.cleanupOld({ days: 90 }).catch(() => {})
    const cloud = createCloud({
      root: ROOT,
      storage,
      readKey: () => readKeyValue(ctx),
    })
    registerImageTool(ctx, cloud, storage)

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
          message: 'Key 已保存，云端已启用。第一次云端生成会实际校验 Key 并计费。',
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
      if (method === 'POST' && path === 'cleanup') {
        const body = await readBody(req, MAX_BODY)
        const days = body?.days === undefined ? 90 : Number(body.days)
        return json(res, 200, await storage.cleanupOld({ days }))
      }
      if (method === 'GET' && path === 'styles') {
        return json(res, 200, { styles: await storage.listStyles() })
      }
      if (method === 'POST' && path === 'styles') {
        const body = await readBody(req, MAX_STYLE_BODY)
        return json(res, 201, { style: await storage.putStyle(body ?? {}) })
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
        await cloud.ready
        const config = await readConfig()
        if (config.cloudEnabled !== true) return json(res, 403, { error: '云端功能未启用' })
        return json(res, 200, await cloud.usage())
      }
      if (seg[0] === 'cloud') {
        await cloud.ready
        const config = await readConfig()
        if (config.cloudEnabled !== true) return json(res, 403, { error: '云端功能未启用' })
        if (method === 'POST' && path === 'cloud/context-ir') {
          const body = await readBody(req, MAX_CLOUD_BODY)
          if (typeof body?.prompt !== 'string' || !body.prompt.trim()) fail('prompt 不能为空')
          if (body.prompt.length > 32000) fail('prompt 太长')
          const key = await readKeyValue(ctx)
          if (!key) fail('还没有保存 API Key', 400)
          return json(res, 200, await generateContextIR({
            prompt: body.prompt,
            key,
            baseUrl: baseUrlFor(config),
            model: modelFor(config.model),
          }))
        }
        if (method === 'POST' && path === 'cloud/jobs') {
          const body = await readBody(req, MAX_CLOUD_BODY)
          return json(res, 202, await cloud.createJob(body ?? {}, config))
        }
        if (method === 'GET' && seg.length === 3 && seg[1] === 'jobs') {
          return json(res, 200, cloud.getJob(seg[2]))
        }
        if (method === 'POST' && seg.length === 4 && seg[1] === 'jobs' && seg[3] === 'cancel') {
          return json(res, 200, cloud.cancelJob(seg[2]))
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
