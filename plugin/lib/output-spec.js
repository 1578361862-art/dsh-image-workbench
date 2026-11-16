// 能力驱动的输出规格：不通过简单乘法假定供应商接受任意尺寸。
import { getCapabilities } from './capabilities.js'

const TIER_AREA = Object.freeze({ '1K': 1048576, '2K': 4194304, '4K': 16777216 })
const FORMAT_ALIASES = Object.freeze({ jpg: 'jpeg' })

function normalizeFormat(value, caps) {
  const raw = String(value ?? '').toLowerCase()
  const format = FORMAT_ALIASES[raw] || raw
  if (!caps.formats.includes(format)) throw Object.assign(new Error('当前模型不支持该输出格式'), { status: 400, code: 'invalid_format' })
  return format
}

function ratioValue(ratio) {
  const match = /^(\d{1,3}):(\d{1,3})$/.exec(String(ratio ?? ''))
  if (!match) throw Object.assign(new Error('画面比例无效'), { status: 400, code: 'invalid_ratio' })
  const a = Number(match[1]); const b = Number(match[2])
  if (!a || !b) throw Object.assign(new Error('画面比例无效'), { status: 400, code: 'invalid_ratio' })
  return a / b
}

export function resolveOutputSpec({ provider, ratio = '1:1', tier = '2K', format, transparent = false } = {}) {
  const caps = getCapabilities(provider)
  if (!caps.aspectRatios.includes(ratio)) throw Object.assign(new Error('当前模型不支持该画面比例'), { status: 400, code: 'invalid_ratio' })
  if (!caps.tiers.includes(tier)) throw Object.assign(new Error('当前模型不支持该清晰度档位'), { status: 400, code: 'invalid_tier' })
  const chosen = normalizeFormat(format == null ? caps.defaultFormat : format, caps)
  if (transparent) {
    if (!caps.transparent) throw Object.assign(new Error('当前模型未核验透明背景能力'), { status: 400, code: 'transparent_unsupported' })
    if (chosen !== 'png') throw Object.assign(new Error('透明背景需要 PNG'), { status: 400, code: 'transparent_requires_png' })
  }
  const ratioValueNumber = ratioValue(ratio)
  if (ratioValueNumber > caps.maxRatio || 1 / ratioValueNumber > caps.maxRatio) {
    throw Object.assign(new Error('画面比例超出模型限制'), { status: 400, code: 'invalid_ratio' })
  }
  const area = TIER_AREA[tier]
  if (area < caps.minArea || area > caps.maxArea) throw Object.assign(new Error('清晰度档位超出模型面积限制'), { status: 400, code: 'invalid_tier' })
  let width = Math.round(Math.sqrt(area * ratioValueNumber))
  let height = Math.round(width / ratioValueNumber)
  width = Math.max(caps.minSide, Math.min(caps.maxSide, width))
  height = Math.max(caps.minSide, Math.min(caps.maxSide, height))
  // 边界夹取后重新保证面积/比例在允许范围；必要时向内收。
  while (width * height < caps.minArea && width < caps.maxSide && height < caps.maxSide) { width += 1; height = Math.max(caps.minSide, Math.round(width / ratioValueNumber)) }
  while (width * height > caps.maxArea && width > caps.minSide && height > caps.minSide) { width -= 1; height = Math.max(caps.minSide, Math.round(width / ratioValueNumber)) }
  if (width * height < caps.minArea || width * height > caps.maxArea) throw Object.assign(new Error('无法得到合法输出尺寸'), { status: 400, code: 'invalid_size' })
  const actualRatio = Math.max(width / height, height / width)
  if (actualRatio > caps.maxRatio + 0.01) throw Object.assign(new Error('输出尺寸比例超出限制'), { status: 400, code: 'invalid_size' })
  return {
    width, height, size: `${width}x${height}`, format: chosen, tier, ratio, transparent,
    compression: chosen === 'png' ? null : 90,
    warnings: caps.transparent ? [] : (transparent ? ['透明背景未启用'] : []),
  }
}
