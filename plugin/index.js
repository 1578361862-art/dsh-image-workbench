// 图像风格工作台 — Host 半侧。
// P1 设置/示例图 + P2 原图/批次/历史/导出；P3 云端能力默认关闭（config.cloudEnabled）。
import { createReadStream } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { chmod, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCloud } from './lib/cloud.js'
import { estimate } from './lib/budget.js'
import { baseUrlFor, generateContextIR, modelFor, sniffMime } from './lib/minimax.js'
import { generateSeedream, SEEDREAM_DEFAULT_BASE, SEEDREAM_DEFAULT_MODEL } from './lib/seedream.js'

const SEEDREAM_MODELS = ['doubao-seedream-5-5-261028', 'doubao-seedream-4-5-251128', 'doubao-seedream-4-0-250828']
import { MAX_EXPORT_BYTES, MAX_IMAGE_BYTES, createStorage } from './lib/storage.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(homedir(), 'Data', 'dsh-image-workbench')
const CONFIG = join(ROOT, 'config.json')
const SAMPLE = join(HERE, 'assets', 'sample.jpg')
const STYLE_PREVIEW_DIR = join(HERE, 'assets', 'style-previews')
const CREDENTIAL = 'dsh-image-workbench/minimax'
const SEEDREAM_CREDENTIAL = 'dsh-image-workbench/seedream'
const SIZES = ['640', '960', '1200']
const MAX_BODY = 64 * 1024
const MAX_ASSET_BODY = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 2 * 1024 * 1024
const MAX_BATCH_BODY = 64 * 1024 * 1024
const MAX_STYLE_BODY = 4 * 1024 * 1024
const MAX_EXPORT_BODY = Math.ceil((MAX_EXPORT_BYTES * 4) / 3) + 8 * 1024 * 1024
const MAX_CLOUD_BODY = 256 * 1024
const MAX_SEEDREAM_BODY = 48 * 1024 * 1024
const DEFAULTS = Object.freeze({
  budget: 10,
  privacyConfirm: true,
  defaultSize: '960',
  concurrency: 2,
  base: 'cn',
  model: 'standard',
  billing: 'payg',
  seedreamModel: 'doubao-seedream-5-5-261028',
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
    const merged = { ...DEFAULTS, ...saved }
    merged.seedreamModel = 'doubao-seedream-5-5-261028'
    return merged
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
  if (body.seedreamModel !== undefined) {
    if (!SEEDREAM_MODELS.includes(body.seedreamModel)) fail('Seedream 模型无效')
    next.seedreamModel = body.seedreamModel
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

async function readSeedreamKeyValue(ctx) {
  try {
    const record = await ctx.get('credentials')?.readRecord(SEEDREAM_CREDENTIAL)
    if (record?.kind !== 'api-key' || !record.key) return null
    return String(record.key)
  } catch {
    return null
  }
}

async function seedreamKeyInfo(ctx) {
  const key = await readSeedreamKeyValue(ctx)
  if (!key) return { hasSeedreamKey: false, seedreamKeyHint: '' }
  return { hasSeedreamKey: true, seedreamKeyHint: key.slice(-4).toUpperCase() }
}

async function publicSettings(ctx) {
  const config = await readConfig()
  const key = await keyInfo(ctx)
  const seedream = await seedreamKeyInfo(ctx)
  return { ...config, ...key, ...seedream, cloud: config.cloudEnabled === true && key.hasKey, phase: 'P2' }
}

async function applySeedreamKey(ctx, body) {
  const store = ctx.get('credentials')
  if (body.clearKey === true) {
    if (store) await store.deleteRecord(SEEDREAM_CREDENTIAL)
    return
  }
  if (typeof body.key !== 'string') return
  const key = body.key.trim()
  if (!key) return
  if (key.length > 4096) fail('API Key 太长')
  if (!store) fail('当前 Harness 没有可用的凭据存储')
  await store.modifyRecord(SEEDREAM_CREDENTIAL, async () => ({ kind: 'api-key', key }))
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
const CLOUD_EDIT_HEAD = '图1是唯一参考图与构图来源。先读图1：锁定主体数量、身份、姿态、朝向、手部动作、服装轮廓、关键配饰、前中后景关系、镜头高度、裁切范围，以及原文字的位置与排版。成图逐项保持这些关系；不新增、删除或替换主体，不改变动作、视线与空间关系。只改变画种、介质、光线、色彩、边缘与表面质感。最终必须像一张真正完成的完整作品，而不是原图加滤镜。'
const CLOUD_EDIT_TAIL = '保留原图文字的位置和图形轮廓，不生成新的可读句子；全尺寸下仍能看到材质的真实细节；不要水印、签名、UI、网页边框、平滑数字渐变或塑料感。'
const CLOUD_SCENE_HEAD = '图1是唯一主体参考。锁定主体数量、身份、面部或关键特征、体型、姿态和主体间关系；成图保留这些核心特征。允许重新设计服装、时代、环境、景别、镜头、光线和空间尺度；不新增或删除主体；新服装或环境必须与主体有真实接触、遮挡、透视和光影关系。最终必须像一张完整完成的作品，而不是原图加滤镜。'
const CLOUD_SCENE_TAIL = '保留原图文字的位置与图形轮廓，不生成新的可读句子；全尺寸下仍能看到材质与光影细节；不要水印、签名、UI、网页边框或无关长文。'
const CLOUD_REF_HEAD = '图1是用户上传照片与唯一主体/身份来源；图2只是风格、材质、光线、色彩、笔触与场景语言的参考，绝对不能复制图2中的具体人物、物体、文字、构图或背景内容。保留图1的主体数量、身份、面部或关键特征、姿态和主体间关系；只把图2的视觉语言应用到图1。'
const CLOUD_SCENE_REF_HEAD = '图1是唯一主体与身份来源；图2只是风格、材质、光线、色彩、场景语言参考，不复制图2中的具体人物、物体、文字或构图。保留图1主体身份、面部特征、姿态和主体间关系；允许重设服装、环境、景别、镜头和空间尺度，但新环境必须与主体有真实接触、遮挡、透视和光影关系。'
const CLOUD_LAYOUT_HEAD = '图1是唯一设计参考与主体来源。先读图1：锁定主体数量、身份、标志性轮廓、姿态、服装或结构、关键配饰、比例与主要部件关系。成图保持主体设计和身份一致，但允许按该风格重新组织版面与视图；不新增、删除或替换主体，不改变核心结构。只改变呈现方式、介质、光线、色彩与标注体系。最终必须像一张正式完成的设计图、图解或图纸，而不是原图加滤镜。'
const CLOUD_LAYOUT_TAIL = '标签只描述图中可见的结构与特征，用简短、可读、不重叠的文字；不编造数据、来源或结论；不要水印、签名、UI、网页边框或无关长文。'
function cloudPrompt(body, layout = false) {
  return (layout ? CLOUD_LAYOUT_HEAD : CLOUD_EDIT_HEAD) + body + (layout ? CLOUD_LAYOUT_TAIL : CLOUD_EDIT_TAIL)
}

function cloudScenePrompt(body) {
  return CLOUD_SCENE_HEAD + body + CLOUD_SCENE_TAIL
}

function cloudRefPrompt(body) {
  return CLOUD_REF_HEAD + body + CLOUD_EDIT_TAIL
}

function cloudSceneRefPrompt(body) {
  return CLOUD_SCENE_REF_HEAD + body + CLOUD_SCENE_TAIL
}

function cloudSealPrompt(body) {
  return body
}

const CLOUD_STYLES = Object.freeze({
  'h3-illus': {
    name: 'H3 插画化',
    prompt: cloudPrompt('暖色叙事插画，不是照片滤镜：深棕手绘轮廓、分层平涂与少量厚涂、纸张或画布的细纹；暖琥珀、砖红、奶油白、橄榄绿，低饱和；柔侧光从左上方照到主体，暖反光、轻光晕与细颗粒；头发、织物、远景用不同密度的笔触，边缘有轻微色晕，主体与背景用空气透视分开；像一本艺术书里的完整插画，不是平滑数字渐变、3D或塑料皮肤。'),
  },
  'h3-silver': {
    name: 'H3 银盐',
    prompt: cloudPrompt('实体黑白银盐照片或暗房印相：深黑保留细节、银灰中间调、柔和高光；细颗粒与轻微 halation；侧逆光或柔侧光塑造体积，相纸纤维和轻微暗角；真实皮肤、发丝和织物纹理；像一张冲印出来的银盐作品，不是数码黑白滤镜、HDR、磨皮或残留彩色。'),
  },
  'h3-oil': {
    name: '古典油画',
    prompt: cloudPrompt('17世纪欧洲布面油画，老大师/卡拉瓦乔—伦勃朗传统：深橄榄绿、琥珀棕的暗部，单侧暖光从左上照到主体面部和手部；厚涂高光与薄透明罩染并用，保留可见的猪鬃笔触，保留亚麻画布纹理、陈年清漆的暖金和细裂纹；暗部有层次和大面积呼吸空间，构图稳定；像博物馆原作，不是照片、3D、统一裂纹滤镜或过厚颜料。'),
  },
  'h3-impression': {
    name: '印象派',
    prompt: cloudPrompt('实体法国印象派布面油画，莫奈晚期方法：湿画法、粗猪鬃短笔触、纯色并置；形体在光雾中溶解但主体仍可辨；高调粉紫、灰蓝、暖金，阴影只用淡紫和蓝，不用黑；每一寸都有可数的笔触，亮部厚涂，暗部干笔，画布纹理可见；空气和雾由笔触构成，不用数字模糊、平滑渐变、水墨或工笔。'),
  },
  'h3-manuscript': {
    name: '金箔手抄本',
    prompt: cloudPrompt('中世纪泥金手抄本插画：羊皮纸底、平涂蛋彩、深墨线、平透视；朱红、群青、古董金，宽卷草纹边框，磨损金箔和不规则手绘；主体变成手抄本中的人物或物件，但保留身份、姿态、构图和原文字位置；金饰和边框不遮挡主体与文字；像真实手抄本页面，不是照片、数字贴金或均匀做旧。'),
  },
  'h3-dunhuang': {
    name: '敦煌壁画',
    prompt: cloudPrompt('唐代敦煌土壁壁画，平面壁画而不是电影场景：土黄壁面、矿物朱砂、石青、石绿、赭石，颗粒和局部剥落露出墙体；细线人物轮廓、飘带、卷云，平涂加局部晕染，重叠关系代替精确透视；保留主体数量、姿态和布局；不要体积光、金属反射、3D、照相机景深或均匀裂纹滤镜。'),
  },
  'h3-gongbi': {
    name: '工笔重彩',
    prompt: cloudPrompt('中国工笔重彩绢本：细密均匀的线描、矿物色分层罩染、绢丝纹理和留白；衣纹、发丝和结构边缘用细线，色块薄而多层；主体清晰，背景克制；像手绘绢本，不是写意、油画笔触、照片或数字平滑；不要厚涂、强高光和塑料质感。'),
  },
  'h3-collage': {
    name: '剪纸拼贴',
    prompt: cloudPrompt('手工剪纸与旧杂志拼贴：分层色纸、清晰刀口和纸边、撕裂边、错位剪影，半调网点和印刷颗粒；钴蓝、米白、橙红、银灰有限色板；主体处理成黑白或单色照片剪贴，轮廓外留干净白边；保留主体、姿态、构图和原文字；像平扫的真实纸拼贴，不是数字拼贴、3D或平滑插画。'),
  },
  'h3-pixel': {
    name: '像素海报',
    prompt: cloudPrompt('实验像素艺术海报：硬边像素方块、混合像素尺度、有限调色板、有序抖动、套色偏移和低分辨率屏幕纹理；主体轮廓由方块构成，眼睛和关键细节保留少量照片信息，边缘逐渐像素化；保留构图和原文字，文字用像素字形；不要平滑渐变、抗锯齿、3D卡通或高光塑料感。'),
  },
  'h3-film': {
    name: '电影胶片',
    prompt: cloudPrompt('真实35mm纪实或电影胶片照片：自然光或现场现有光，不新增棚拍人工光；35—50mm标准镜头、中景深、真实肤色和材质；中低对比、克制色彩、细颗粒、轻微halation和柔和高光；保留现场光线方向和环境气氛，不添加雾、道具或人物；不要插画、绘画、重度美颜、HDR或过度锐化。'),
  },
  'h3-concept': {
    name: '概念场景',
    prompt: cloudPrompt('AAA游戏或电影概念场景matte painting：清晰前景、结构明确的中景和大气透视远景；写实3D材质与手绘笔触、照片纹理结合；层次光、边缘光、空气尘雾；主体和关键设施保持；只扩展环境的尺度和氛围，不新增叙事主体；不要UI、字幕、水印、塑料3D或廉价CG。'),
  },
  'h3-shadow': {
    name: '皮影戏',
    prompt: cloudPrompt('传统中国皮影戏：油灯从背后照亮米色布幕，主体变成半透明皮革关节偶，镂空纹样、竹签控制杆和手影；红木框和流苏，暖黄光晕；平面影戏，保留主体数量、姿态和构图；不要3D、写实照片、现代灯光或塑料质感。'),
  },
  'h3-eastern': {
    name: '东方幻想线稿',
    prompt: cloudPrompt('东方幻想动画或工笔重彩线稿：细长流畅的墨线、朱砂、金箔、墨绿、赭石平面色块，云火纹、飘带、珠串；装饰性平面构图，长线贯穿头发、衣褶和饰物；纸纹和斑驳金箔；主体成为画面中心，保留姿态、构图和原文字位置；不要写实照片、厚涂油画、新增角色或无关文字。'),
  },
  'h3-oldphone': {
    name: '旧手机快照',
    prompt: cloudPrompt('2017年iPhone 7后置直出照片：28mm、12MP、无美颜、无滤镜、无编辑；自然偏暖、中等饱和、真实肤色；深景深、无人像模式；动态范围有限，高光轻微溢出、阴影有细噪点；随手拍轻微倾斜和不够完美的构图；保留现场；不要电影感、HDR、专业布光、锐化或磨皮。'),
  },
  'h3-flashfilm': {
    name: '闪光胶片',
    prompt: cloudPrompt('复古直打闪光35mm胶片时尚人像：单灯正面硬闪、脸部高光、背景压暗、清晰硬阴影；真实皮肤纹理、细颗粒、轻微褪色和柔光晕；中近景、实景；保留人物、姿态、构图和原文字；不要柔光棚拍、重度磨皮、HDR或胶片滤镜叠加。'),
  },
  'h3-dv': {
    name: 'DV 家庭录像',
    prompt: cloudPrompt('2001年MiniDV家庭录像抽帧：4:3、小CCD低清、软细节、阴影彩色噪点、压缩块、自动白平衡偏色、高光溢出和轻微运动拖影；手持轻微倾斜、现场感构图；保留主体、姿态和构图；不要电影调色、胶片颗粒、VHS线、时间码或高清锐化。'),
  },
  'h3-sticker': {
    name: '贴纸残胶海报',
    prompt: cloudPrompt('实验字体与贴纸残胶海报：磨损冷灰金属门、透明胶带、乳白撕纸、荧光橙标签、卷曲银膜；主体照片碎片保留轮廓和身份，与材料层叠；原文字由材料真实边缘构成，不换成标准字体；留出干净白场，手工拼贴和扫描质感；不要重3D、无关大字、水印或塑料高光。'),
  },
  'h3-sheet': {
    name: '游戏角色设定',
    prompt: cloudPrompt('AAA游戏角色设定图，一张完整版面：同一主体正面、背面、三分之四全身三视图，比例、姿态、服装和配饰一致；中性灰渐变棚拍，柔和顶侧光；写实金属、皮革、织物磨损和缝线；视图之间放局部材质特写；保留主体身份和关键设计；三视图必须在同一张图里，不是三张独立图；不要分屏网页、UI、文字水印或改变角色设计。', true),
  },
  'h3-infographic': {
    name: '信息图',
    prompt: cloudPrompt('编辑级信息图或科普图解，一张完整版面：米白纸底、扁平矢量加少量照片碎片、清晰分区、细箭头、短标签和比例尺；主体作为中心图示，保留识别特征；有限色板：米白、墨绿、陶土橙、灰蓝；标签只描述可见结构，文字简短、可读、不重叠；不要复杂3D、重复卡片、长文、编造数据或来源。', true),
  },
  'h3-cad': {
    name: '工程蓝图',
    prompt: cloudPrompt('正式工程蓝图或CAD图纸：深蓝底加细网格、白色细线；同一主体正交前视、侧视、俯视和等轴测线稿，比例一致；尺寸线、剖面线、中心线、短标签和标题栏；保留主体结构、比例和关键部件；不要照片、阴影、渐变、3D渲染、UI或无关文字。', true),
  },
  'h3-surreal': {
    name: '超现实时尚',
    prompt: cloudPrompt('复古超现实时尚摄影：真实布景和大道具，鲜艳撞色，直闪加自然光，胶片颗粒，低角度广角；主体保留身份、姿态、服装和构图；只加入一个超现实但物理可信的道具或空间关系，与主体发生真实接触、遮挡和接触阴影；像实拍的复古时尚大片，不要卡通、CG、塑料感或新增人物。'),
  },
  'h3-sacred': {
    name: '圣光暗童话',
    prompt: cloudRefPrompt('白色大理石/石膏雕塑摄影，暗黑神圣与天光：把图1主体转成纯白大理石或石膏雕塑，保留主体身份、数量、姿态、朝向、服装或外形轮廓和构图；石材表面有凿痕、石粉、细裂纹和柔和冷光，衣褶与结构呈硬质雕刻；主体置于纯黑虚空，背后一圈极细的白色霓虹光环，下方由云团或石台承托；冷银灰单色，几乎没有环境色，最多一点冷蓝边缘光；像博物馆雕塑或高级暗黑童话封面；不要活体毛发、森林、树叶、照片、3D游戏、彩色、复杂背景、可爱化或新增角色。图2只作白石雕像、黑底光环、冷银材质的参考，不复制图2的雕像人物。'),
  },
  'h3-mystic': {
    name: '玄黄奇境',
    prompt: cloudSceneRefPrompt('2D丝网印刷/木刻版画海报，不是3D概念场景：把图1主体压缩成深青色硬边剪影，保留主体身份、数量、姿态、朝向和关键轮廓，不画真实毛发、皮肤或体积；深青、墨蓝、明黄、琥珀四色平涂；巨大黄色日轮或月轮占据上方，云层像木刻龙形卷云，背景加同心圆和细线装饰；纸纹、套色偏移、边缘颗粒、少量旧印刷磨损；强对比、几乎无渐变、无景深；图2只作黄青平涂、硬边剪影、木刻云纹和版画颗粒的参考，不复制其中的人物、龙、建筑、文字或构图；不要写实风景、照片、体积云、3D、景深、霓虹、UI或文字。'),
  },
  'h3-observer': {
    name: '旁观者视角',
    prompt: cloudSceneRefPrompt('宽景数字插画，旁观者视角：主体在前景或中景，以背影、侧背朝向镜头，成为观众代入的那个瞬间；远处是超现实粉彩地形、白色道路轨迹、小车辆、巨型粉彩云柱和明亮太阳，蓝天留出白色航迹；前景米色岩石、深灰巨石、低矮荒漠植物形成框架；大色块、清晰地平线、空气透视、电影感静止瞬间；保留主体身份、姿态和服装；不要正面肖像、普通风景或过度细节。'),
  },
  'h3-west1960': {
    name: '1960 西部动画',
    prompt: cloudSceneRefPrompt('16:9横向宽银幕，1960西部电影×日系手绘数字动画：中近景，主体在干旱灌木平原、木屋或马匹旁；正午硬光、深阴影、地面暖反光、踢起的尘土薄雾；低饱和青绿、赭黄、暗红，手绘动画线稿、纸纹与胶片颗粒；保留主体身份、姿态、服装轮廓与电影式构图；不要现代摄影、3D、海报字体或UI。'),
  },
  'h3-blackgold': {
    name: '暗金圣骑',
    prompt: cloudSceneRefPrompt('暗黑奇幻/巴洛克圣骑士壁纸：黑金高对比，主体重铸为黑钢与暗金ornate甲胄，披风、月牙或圣徽、细密金线、尖刺与层叠甲片；体积圣光与尘雾，纯黑虚空，不要岩石、苔藓、森林、地面或绿色；主体由黑色石台或虚无承托，金属高光与磨损；保留主体身份、面部关键特征和姿态；像一张完成的角色海报，不要塑料3D、游戏UI、文字或水印。'),
  },
  'h3-ramayana': {
    name: '罗摩衍那',
    prompt: cloudSceneRefPrompt('印度史诗《罗摩衍那》油画/古典插画：红金主色，强烈动态对角线，战车、黑马、弓与箭、飘动红披风、金色珠宝与繁复纹样；厚涂油画与古典插画质感，烟尘和夕阳；主体成为史诗英雄或神祇，保留身份、姿态、服装轮廓和关键特征；允许战车与马匹作为环境叙事元素，不替换主体；不要现代照片、3DCG、文字或UI。'),
  },
  'h3-cosmic': {
    name: '星河神性',
    prompt: cloudSceneRefPrompt('星河神性/超现实古典油画：深黑星空与金色星云、黑洞吸积盘，云海翻涌；主体以古典衣褶坐在悬崖或岩石上，背对或侧对观众，仰望深渊；古典油画厚涂、金色神光、巨大尺度、神圣敬畏；保留主体身份、姿态和服装轮廓；允许宇宙环境替换背景；不要普通星空照片、科幻UI、塑料3D或文字。'),
  },  'h3-seal': {
    name: '金石印谱',
    prompt: cloudSealPrompt('图1是唯一参考照片。请将这张照片制作成一张独立的高级设计海报，不多图拼接，单张输出。整体采用3:4竖版构图，上下两个区域高度严格1:1，各占画面50%。上下两格在中线处直接、干净地拼接，不加粗分隔条、边框、额外画格或标签；所有风格化处理、纸张肌理与色彩变化都只发生在下半部分。\n\n上半部分保留原始照片，保持主体身份、数量、结构、姿态、朝向、真实质感、自然光影与原有色彩氛围，仅进行轻微高级调色，使其具有艺术摄影与东方展览图像质感。为适配画幅，可自然扩展环境背景，但不得拉伸、扭曲、镜像或改变主体；若上传的图像本身是插画，则上半部分照原样保留。\n\n下半部分是一页印谱：中央偏上是一方用朱砂印泥钤出的肖形印印蜕，印面把上方照片中最具识别性的主体压缩为一个篆刻式的剪影符号，刀痕可见、线条古拙、正负形分明，可以是朱文或白文，方形、圆形或随形边框。\n\n下半部分按题材只保留让主体一眼可辨的最少信息：人物保留数量、姿态、朝向、发型与服装主色，不刻画五官细节；动物保留物种特征、花纹与姿态；建筑保留屋顶走势、主要入口与比例；交通工具保留朝向、车轮或船身弧线；风景保留一条地平线、山脊或岸线。删除密集植被、重复窗格、杂乱背景与广告招牌。\n\n印蜕旁边是这方印侧面边款的墨拓：黑色拓片中隐约可见几行刻字与刀痕，形成一红一黑、一印一拓的呼应关系。\n\n材质强调真实篆刻：印泥的颗粒与压印不均、边框的残破与刀口的崩口、宣纸的纤维与轻微晕染、墨拓的浓淡与纸面凹凸。避免数码印章素材、完美矢量边框和3D渲染。\n\n构图：印蜕只占下半部分宽度约20%–25%，边款拓片更窄更长，两者错落放置，纸白不少于70%。\n\n色彩：朱砂红、墨黑与宣纸白构成全部色彩，只允许从上方照片中提取一种颜色以极小的铅笔注记出现。\n\n文字：边款拓片中的刻字与页面角落一行极小的小字说明（印名、尺寸），不限制语种。\n\n整体呈现肖形印蜕、边款墨拓、刀痕古拙与大量纸白构成的东方金石视觉。核心原则是：把一个瞬间，刻进一方石头，再印下来。避免数码印章素材、满版印章、廉价国潮、过度对称、卡通感和模板化 logo。'),
  },
})

const STYLE_REFERENCE_IDS = new Set(['h3-sacred', 'h3-mystic', 'h3-observer', 'h3-west1960', 'h3-blackgold', 'h3-ramayana', 'h3-cosmic'])

async function styleReferenceFor(id) {
  if (!STYLE_REFERENCE_IDS.has(id)) return null
  try {
    return { buffer: await readFile(join(STYLE_PREVIEW_DIR, 'full', id + '.jpg')), mime: 'image/jpeg' }
  } catch {
    return null
  }
}


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
          const reference = await styleReferenceFor(args.style)
          const job = await cloud.createJob(
            {
              assetId: saved.meta.id,
              styleId: args.style,
              prompt: typeof args.prompt === 'string' && args.prompt.trim() ? args.prompt : style.prompt,
              size: quality,
              params: {},
            },
            config,
            { reference },
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

    async function saveSeedreamResult(result) {
      const id = `seed_${Date.now().toString(36)}${randomBytes(3).toString('hex')}`
      const dir = join(ROOT, 'outputs', id)
      await mkdir(dir, { recursive: true })
      const file = join(dir, 'seedream.jpg')
      await writeFile(file, result.buffer, { mode: 0o644 })
      const url = `/image-workbench/result/${id}/seedream.jpg`
      const size = /^(\d{3,5})x(\d{3,5})$/i.exec(String(result.rawMeta?.size ?? ''))
      await storage.indexCloudJob({
        id,
        createdAt: new Date().toISOString(),
        assetId: '',
        styleIds: ['seedream'],
        results: [{ styleId: 'seedream', url, w: size ? Number(size[1]) : 0, h: size ? Number(size[2]) : 0 }],
      }).catch(() => {})
      return {
        url,
        w: size ? Number(size[1]) : 0,
        h: size ? Number(size[2]) : 0,
        costYuan: 0.2,
        model: result.rawMeta?.model || null,
      }
    }

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
      if (method === 'DELETE' && seg.length === 2 && seg[0] === 'styles') {
        return json(res, 200, await storage.deleteStyle(seg[1]))
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
      if (seg[0] === 'seedream') {
        if (method === 'POST' && path === 'seedream/key') {
          const body = await readBody(req, MAX_BODY)
          await applySeedreamKey(ctx, body ?? {})
          return json(res, 200, await publicSettings(ctx))
        }
        if (method === 'POST' && path === 'seedream/text') {
          const body = await readBody(req, MAX_SEEDREAM_BODY)
          const key = await readSeedreamKeyValue(ctx)
          if (!key) fail('还没有保存 Seedream API Key', 400)
          const result = await generateSeedream({
            prompt: body?.prompt,
            size: body?.size,
            key,
            model: SEEDREAM_MODELS.includes(body?.model) ? body.model : ((await readConfig()).seedreamModel || 'doubao-seedream-5-5-261028'),
            baseUrl: SEEDREAM_DEFAULT_BASE,
          })
          return json(res, 200, await saveSeedreamResult(result))
        }
        if (method === 'POST' && path === 'seedream/edit') {
          const body = await readBody(req, MAX_SEEDREAM_BODY)
          const key = await readSeedreamKeyValue(ctx)
          if (!key) fail('还没有保存 Seedream API Key', 400)
          if (typeof body?.imageDataUrl !== 'string' || !body.imageDataUrl.startsWith('data:image/')) {
            fail('图片数据无效')
          }
          const result = await generateSeedream({
            prompt: body?.prompt,
            size: body?.size,
            images: [body.imageDataUrl],
            key,
            model: SEEDREAM_MODELS.includes(body?.model) ? body.model : ((await readConfig()).seedreamModel || 'doubao-seedream-5-5-261028'),
            baseUrl: SEEDREAM_DEFAULT_BASE,
          })
          return json(res, 200, await saveSeedreamResult(result))
        }
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
          const reference = await styleReferenceFor(body?.styleId)
          return json(res, 202, await cloud.createJob(body ?? {}, config, { reference }))
        }
        if (method === 'POST' && path === 'cloud/text-jobs') {
          const body = await readBody(req, MAX_CLOUD_BODY)
          return json(res, 202, await cloud.createTextJob(body ?? {}, config))
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
