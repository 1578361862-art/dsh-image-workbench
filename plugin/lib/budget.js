// 预算闸门：按 DESIGN §5.3 的编辑单价估算；M Plan 不显示金额、不受日预算限制。
// 预估只是拦截和提示，真实花费以响应 usage 与账单为准。

const PROMO_4K_UNTIL = Date.parse('2026-11-18T00:00:00+08:00')

export const PRICES = Object.freeze({
  '1K': 0.1744,
  '2K': 0.1747,
  '4K': 0.4809,
  '4K-promo': 0.2404,
})

const HIGHSPEED_FACTOR = 1.5
export const CONFIRM_THRESHOLD_YUAN = 2

function round4(value) {
  return Math.round(value * 10000) / 10000
}

export function sizeTier(size) {
  const text = String(size ?? '').trim()
  if (/^1k$/i.test(text)) return '1K'
  if (/^2k$/i.test(text)) return '2K'
  if (/^4k$/i.test(text)) return '4K'
  const match = /^(\d{2,5})x(\d{2,5})$/i.exec(text)
  if (match) {
    const area = Number(match[1]) * Number(match[2])
    if (area <= 1300000) return '1K'
    if (area <= 5000000) return '2K'
    return '4K'
  }
  return '2K'
}

export function unitPrice({ size = '2K', speed = 'standard', now = new Date() } = {}) {
  const tier = sizeTier(size)
  let price
  if (tier === '4K') {
    price = now.getTime() < PROMO_4K_UNTIL ? PRICES['4K-promo'] : PRICES['4K']
  } else {
    price = PRICES[tier]
  }
  if (speed === 'highspeed') price *= HIGHSPEED_FACTOR
  return round4(price)
}

export function estimate({ size = '2K', speed = 'standard', billing = 'payg', count = 1, now = new Date() } = {}) {
  const safeCount = Number.isFinite(Number(count)) && Number(count) > 0 ? Math.floor(Number(count)) : 1
  const unit = unitPrice({ size, speed, now })
  return {
    costYuan: round4(unit * safeCount),
    unitPriceYuan: unit,
    tier: sizeTier(size),
    speed,
    billing,
    count: safeCount,
  }
}

export function checkBudget({
  spentToday = 0,
  estimated = 0,
  limit = 10,
  billing = 'payg',
  allow = false,
  confirmThreshold = CONFIRM_THRESHOLD_YUAN,
} = {}) {
  const spent = Number.isFinite(Number(spentToday)) ? Math.max(0, Number(spentToday)) : 0
  const cost = Number.isFinite(Number(estimated)) ? Math.max(0, Number(estimated)) : 0
  const cap = Number.isFinite(Number(limit)) ? Math.max(0, Number(limit)) : 0

  if (billing === 'mplan') {
    return {
      allowed: true,
      requiresConfirmation: false,
      reason: null,
      dailyLimitExceeded: false,
      billing,
      spentTodayYuan: round4(spent),
      estimatedYuan: round4(cost),
      limitYuan: round4(cap),
      remainingYuan: null,
    }
  }

  const dailyLimitExceeded = spent + cost > cap + 1e-9
  const allowed = allow === true || !dailyLimitExceeded
  return {
    allowed,
    requiresConfirmation: cost > confirmThreshold || dailyLimitExceeded,
    reason: allowed ? null : 'daily_limit',
    dailyLimitExceeded,
    billing,
    spentTodayYuan: round4(spent),
    estimatedYuan: round4(cost),
    limitYuan: round4(cap),
    remainingYuan: round4(Math.max(0, cap - spent)),
  }
}
