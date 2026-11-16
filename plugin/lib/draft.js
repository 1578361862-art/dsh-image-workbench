// 草稿协调：切换模型/操作时只回退不兼容字段，不清提示词。
import { getCapabilities } from './capabilities.js'

const DEFAULT_RATIO = '1:1'
const DEFAULT_TIER = '2K'

export function reconcileDraft(draft = {}, provider) {
  const caps = getCapabilities(provider)
  const next = { ...draft, provider }
  const changes = []
  const set = (field, value, reason) => {
    if (next[field] === value) return
    changes.push({ field, from: next[field] ?? null, to: value, reason })
    next[field] = value
  }
  if (!caps.operations.includes(next.operation)) set('operation', 'text_to_image', '模型不支持当前操作')
  if (!caps.aspectRatios.includes(next.ratio)) set('ratio', DEFAULT_RATIO, '模型不支持当前比例')
  if (!caps.tiers.includes(next.tier)) set('tier', caps.tiers.includes(DEFAULT_TIER) ? DEFAULT_TIER : caps.tiers[0], '模型不支持当前清晰度')
  if (!caps.formats.includes(next.format)) set('format', caps.defaultFormat, '模型不支持当前格式')
  if (next.transparent && (!caps.transparent || next.format !== 'png')) {
    if (!caps.transparent) set('transparent', false, '模型未核验透明背景')
    if (next.format !== 'png') set('format', 'png', '透明背景需要 PNG')
  }
  if (next.watermark && !caps.watermark) set('watermark', false, '模型不支持水印')
  if (next.enhance && !caps.promptEnhancement) set('enhance', false, '模型不支持提示词优化')
  if (next.layerSplit && !caps.layerSplit.verified) set('layerSplit', false, '图层拆分未核验')
  if (next.format === 'png') set('compression', null, 'PNG 不需要有损压缩')
  if (next.format !== 'png' && (!Number.isInteger(next.compression) || next.compression < 0 || next.compression > 100)) set('compression', 90, '有损格式需要 0–100 的质量')
  return { draft: next, changes }
}

export function validateSnapshot(snapshot, caps) {
  if (!snapshot || typeof snapshot !== 'object') throw Object.assign(new Error('任务快照无效'), { status: 400 })
  const required = ['provider', 'operation', 'prompt', 'ratio', 'tier', 'format', 'width', 'height']
  for (const key of required) if (snapshot[key] == null || snapshot[key] === '') throw Object.assign(new Error('任务快照缺少 ' + key), { status: 400 })
  if (typeof snapshot.prompt !== 'string' || !snapshot.prompt.trim()) throw Object.assign(new Error('提示词不能为空'), { status: 400 })
  if (!caps.operations.includes(snapshot.operation)) throw Object.assign(new Error('模型不支持该操作'), { status: 400 })
  return true
}
