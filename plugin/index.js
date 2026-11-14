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
const STYLE_PREVIEW_DIR = join(HERE, 'assets', 'style-previews')
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
    prompt: '图1是唯一参考图。转为暖色 H3 插画：保留主体身份、姿态、构图、文字和背景关系；只改变材质、光线、色彩与笔触；暖色、细颗粒、轻微光晕，不改变内容。',
  },
  'h3-silver': {
    name: 'H3 银盐',
    prompt: '图1是唯一参考图。转为黑白银盐写真：保留主体身份、姿态、构图、文字和背景关系；深黑、银灰、柔和高光，细颗粒与银盐层次；不改变内容。',
  },
  'h3-oil': {
    name: '古典油画',
    prompt: '图1是唯一参考图与构图来源。转为17世纪欧洲古典油画：深色橄榄绿/琥珀棕背景，伦勃朗/卡拉瓦乔式明暗对照，单侧暖光从左上照亮面部与手势；可见厚涂高光、薄罩染、亚麻画布纹理、陈年清漆暖金与细裂纹。保留主体身份、姿态、牵手/举手、衣着轮廓、海边设施和布局；暗部保留层次，不整体压黑；不要摄影、CG、文字或水印。',
  },
  'h3-impression': {
    name: '印象派',
    prompt: '图1是唯一参考图。转为法国印象派油画：湿画法、清晰可见的猪鬃短笔触、纯色并置、晨雾与海面反光，形体在光中溶解但主体轮廓可辨；高调粉紫/灰蓝/暖金，阴影不用黑色。保留主体身份、姿态、构图、文字与海边设施；不要数字模糊、水墨或工笔。',
  },
  'h3-manuscript': {
    name: '金箔手抄本',
    prompt: '图1是唯一参考图。转为中世纪泥金手抄本：平涂蛋彩、深墨线、平透视、羊皮纸底、朱红/群青/金箔、卷草纹边框与磨损金箔；主体和设施变成手抄本插画，但保留身份、姿态、构图和文字位置；金饰不遮挡主体与文字，不要写实照片。',
  },
  'h3-dunhuang': {
    name: '敦煌壁画',
    prompt: '图1是唯一参考图。转为唐代敦煌土壁壁画：朱砂、石青、石绿、赭石等矿物颜料，土壁颗粒与局部剥落，细线人物、飘带与卷云纹，平涂加局部晕染；保留主体身份、姿态、构图和设施关系；不要电影光、金属反射或3D。',
  },
  'h3-gongbi': {
    name: '工笔重彩',
    prompt: '图1是唯一参考图。转为中国工笔重彩绢本：细密线描、矿物色分层罩染、绢丝纹理与留白，人物衣纹和发丝用细线；保留身份、姿态、构图、文字位置；不要写意、油画笔触或照片质感。',
  },
  'h3-collage': {
    name: '剪纸拼贴',
    prompt: '图1是唯一参考图。转为手工剪纸与旧杂志拼贴：分层色纸、清晰刀口与纸边、错位剪影、撕裂纸边、半调网点与印刷颗粒；钴蓝/米白/橙红/银灰有限色板，保留主体轮廓、姿态、构图和文字。',
  },
  'h3-pixel': {
    name: '像素海报',
    prompt: '图1是唯一参考图。转为复古像素海报：硬边像素格、混合像素尺度、有限调色板、有序抖动、单色小字纹理、套色偏移与低分辨率屏幕质感；保留主体身份、姿态、构图和文字可读性，不要平滑渐变或3D卡通。',
  },
  'h3-film': {
    name: '电影胶片',
    prompt: '图1是唯一参考图。转为35mm电影胶片/纪实照片：自然光、浅景深、真实肤色、细颗粒、轻微 halation 与柔和高光；中低对比、克制色彩；保留主体身份、姿态、构图、文字和现场关系；不要插画、绘画或重度美颜。',
  },
  'h3-concept': {
    name: '概念场景',
    prompt: '图1是唯一参考图。转为AAA游戏/电影概念场景 matte painting：前景清晰、中景有结构、远景大气透视；层次光、手绘笔触与照片纹理结合；保留主体轮廓、姿态、主要构图和设施；不要UI、字幕、水印或3D塑料感。',
  },
  'h3-shadow': {
    name: '皮影戏',
    prompt: '图1是唯一参考图。转为传统中国皮影戏：油灯从背后照亮米色布幕，主体变成半透明皮革关节偶，镂空纹样、细竹签控制杆、手影与红木框；保留主体身份、姿态、构图和设施，做成平面影戏，不要3D或写实照片。',
  },
  'h3-eastern': {
    name: '东方幻想线稿',
    prompt: '图1是唯一参考图。转为东方幻想动画/工笔重彩线稿：细长流畅的线、朱砂/金箔/墨绿/赭石平面色块、云火纹与飘带，装饰性平面构图；保留主体身份、姿态、构图和文字位置；不要写实照片或厚涂油画。',
  },
  'h3-oldphone': {
    name: '旧手机快照',
    prompt: '图1是唯一参考图。转为2017年 iPhone 7 后置直出照片：28mm、无美颜/滤镜、自然偏暖、中等饱和、动态范围有限、随手拍轻微倾斜、深景深；保留主体、姿态、构图和现场；不要电影感、HDR或专业摄影。',
  },
  'h3-flashfilm': {
    name: '闪光胶片',
    prompt: '图1是唯一参考图。转为复古直打闪光 35mm 胶片时尚人像：正面硬闪、面部高光、背景压暗、细颗粒、轻微褪色、真实皮肤；保留主体身份、姿态、构图和文字；不要柔光棚拍或重度磨皮。',
  },
  'h3-dv': {
    name: 'DV 家庭录像',
    prompt: '图1是唯一参考图。转为2001年 MiniDV 家庭录像抽帧：4:3、CCD 低清、阴影彩色噪点、压缩块、自动白平衡偏色、高光溢出、手持轻微倾斜；保留主体、姿态、构图和现场；不要电影调色、胶片颗粒滤镜或高清锐化。',
  },
  'h3-sticker': {
    name: '贴纸残胶海报',
    prompt: '图1是唯一参考图。转为实验字体/贴纸残胶海报：磨损冷灰金属门、透明胶带、乳白撕纸、荧光橙标签、卷曲银膜，字形由材料真实边缘构成；保留主体作为照片碎片和识别特征，留白与手工拼贴质感，不要标准字体填充。',
  },
  'h3-sheet': {
    name: '游戏角色设定',
    prompt: '图1是唯一参考图。转为AAA游戏角色设定图：同一主体正面、背面、三分之四全身三视图，比例一致，中性灰棚拍，写实服装/盔甲材质与局部特写；保留主体身份、姿态和关键配饰；不要UI、网页边框或水印。',
  },
  'h3-infographic': {
    name: '信息图',
    prompt: '图1是唯一参考图。转为编辑级信息图/科普图解：米白纸底、扁平矢量和少量照片碎片、清晰分区、细箭头与短标签、有限色板；保留主体识别特征和构图关系；文字用简短可读标签，不伪造数据，不要复杂3D。',
  },
  'h3-cad': {
    name: '工程蓝图',
    prompt: '图1是唯一参考图。转为工程蓝图/CAD 图纸：蓝底白线或白底黑线，正交前/侧/俯视图、等距线稿、尺寸线、剖面线与短标签；保留主体结构、比例和关键部件；不要照片、阴影、渐变或3D渲染。',
  },
  'h3-surreal': {
    name: '超现实时尚',
    prompt: '图1是唯一参考图。转为复古超现实时尚大片：真实布景与大道具、鲜艳撞色、直闪、胶片颗粒、低角度广角；保留主体身份、姿态、构图和衣着；加入一个超现实但可信的道具/场景关系，不要卡通或CG塑料感。',
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
      if (method === 'GET' && seg.length === 2 && seg[0] === 'style-preview') {
        let id = seg[1].replace(/\.jpg$/i, '')
        const full = id.endsWith('-full')
        if (full) id = id.slice(0, -5)
        if (!/^[a-z0-9-]{1,63}$/.test(id) || !CLOUD_STYLES[id]) {
          return json(res, 404, { error: '风格预览不存在' })
        }
        const file = full ? join(STYLE_PREVIEW_DIR, 'full', id + '.jpg') : join(STYLE_PREVIEW_DIR, id + '.jpg')
        return serveStored(res, file, 'image/jpeg')
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
        const limit = url.searchParams.get('limit') ?? 20
        const offset = url.searchParams.get('offset') ?? 0
        return json(res, 200, await storage.listHistory(limit, offset))
      }
      if (method === 'DELETE' && path === 'history') {
        return json(res, 200, await storage.clearHistory())
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
