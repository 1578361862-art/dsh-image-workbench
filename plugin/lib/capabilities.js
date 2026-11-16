// 模型能力表：UI 和 Host 都从这里读取“能做什么”。
// 未核实的供应商能力不静默打开；调用方必须检查 verified / capabilityWarnings。
const BASE_RATIOS = Object.freeze(['1:1', '4:5', '3:4', '16:9', '9:16'])
const BASE_TIERS = Object.freeze(['1K', '2K', '4K'])

export const CAPABILITIES = Object.freeze({
  minimax: Object.freeze({
    provider: 'minimax',
    label: 'MiniMax H3 Image',
    modelId: 'MiniMax-H3-Image',
    verified: true,
    operations: Object.freeze(['text_to_image', 'image_to_image', 'edit']),
    aspectRatios: BASE_RATIOS,
    tiers: BASE_TIERS,
    formats: Object.freeze(['png', 'jpeg', 'webp']),
    defaultFormat: 'png',
    transparent: false,
    watermark: false,
    layerSplit: Object.freeze({ supported: false, verified: false, reason: '供应商未确认图层接口' }),
    promptEnhancement: true,
    minArea: 655360,
    maxArea: 20000000,
    minSide: 128,
    maxSide: 8192,
    maxRatio: 3,
    lossy: true,
  }),
  seedream: Object.freeze({
    provider: 'seedream',
    label: 'Seedream 5.5',
    modelId: 'doubao-seedream-5-5-261028',
    verified: true,
    operations: Object.freeze(['text_to_image', 'image_to_image', 'edit']),
    aspectRatios: BASE_RATIOS,
    tiers: Object.freeze(['1K', '2K']),
    formats: Object.freeze(['png', 'jpeg']),
    defaultFormat: 'png',
    transparent: true,
    watermark: true,
    layerSplit: Object.freeze({ supported: false, verified: false, reason: '供应商未确认图层接口' }),
    promptEnhancement: true,
    minArea: 921600,
    maxArea: 4624220,
    minSide: 128,
    maxSide: 4096,
    maxRatio: 16,
    lossy: true,
  }),
})

export function getCapabilities(provider) {
  const caps = CAPABILITIES[provider]
  if (!caps) throw Object.assign(new Error('未知模型'), { status: 400, code: 'unknown_provider' })
  return caps
}

export function capabilityWarnings(provider) {
  const caps = getCapabilities(provider)
  const warnings = []
  if (!caps.verified) warnings.push(`${caps.label} 的能力尚未核验`)
  if (!caps.layerSplit.verified) warnings.push('图层拆分未核验，暂不可用')
  for (const operation of caps.operations) if (!['text_to_image', 'image_to_image', 'edit'].includes(operation)) warnings.push(`未知操作 ${operation}`)
  return warnings
}

export function supports(caps, field, value) {
  if (field === 'format') return caps.formats.includes(value)
  if (field === 'tier') return caps.tiers.includes(value)
  if (field === 'ratio') return caps.aspectRatios.includes(value)
  return false
}
