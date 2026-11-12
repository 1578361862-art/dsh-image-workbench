// 内存作业表：状态机 + 请求前落点（requestSentAt / paramsHash）。
// 云端接口非幂等，所以 start() 只调用任务一次；超时/断连进入 unknown，绝不自动重试。
import { createHash, randomBytes } from 'node:crypto'

export const JOB_STATUSES = Object.freeze([
  'queued',
  'preparing',
  'running',
  'succeeded',
  'failed',
  'canceled',
  'unknown',
])

export const TERMINAL_STATUSES = Object.freeze(['succeeded', 'failed', 'canceled', 'unknown'])

const TERMINAL = new Set(TERMINAL_STATUSES)
const DEFINITIVE_CODES = new Set([
  'auth',
  'invalid_request',
  'invalid_prompt',
  'invalid_size',
  'invalid_image',
  'missing_key',
  'content_safety',
  'insufficient_balance',
  'rate_limited',
  'generation_failed',
  'api_error',
  'server_error',
  'http_error',
])

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const keys = Object.keys(value).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
}

export function hashParams(params) {
  return createHash('sha256').update(stableStringify(params ?? {})).digest('hex')
}

export function createJobs({ clock = () => new Date() } = {}) {
  const jobs = new Map()

  function nowIso() {
    return clock().toISOString()
  }

  function create(input = {}) {
    const id = `job_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`
    const at = nowIso()
    const job = {
      id,
      status: 'queued',
      createdAt: at,
      updatedAt: at,
      provider: 'minimax',
      assetId: input.assetId ?? null,
      styleId: input.styleId ?? null,
      prompt: input.prompt ?? '',
      size: input.size ?? null,
      params: input.params ?? {},
      paramsHash: input.paramsHash ?? hashParams(input.params ?? {}),
      model: input.model ?? 'standard',
      requestSentAt: null,
      attempts: 0,
      output: null,
      usage: null,
      revisedPrompt: null,
      error: null,
    }
    jobs.set(id, job)
    return job
  }

  function get(id) {
    if (typeof id !== 'string' || !id) return null
    return jobs.get(id) ?? null
  }

  function update(id, patch = {}) {
    const job = get(id)
    if (!job) return null
    Object.assign(job, patch, { updatedAt: nowIso() })
    return job
  }

  function finishError(job, err) {
    let status
    if (err?.beforeRequest === true) status = 'failed'
    else if (err?.unknown === true) status = 'unknown'
    else if (Number(err?.status) >= 400 && Number(err?.status) < 500) status = 'failed'
    else if (DEFINITIVE_CODES.has(err?.code)) status = 'failed'
    else status = job.requestSentAt ? 'unknown' : 'failed'

    job.status = status
    job.updatedAt = nowIso()
    job.error = {
      code: typeof err?.code === 'string' ? err.code : 'unknown',
      message: String(err?.message ?? '云端作业失败').slice(0, 500),
      status: Number.isFinite(Number(err?.status)) ? Number(err.status) : 0,
      retryable: false,
      at: job.updatedAt,
    }
    return job
  }

  /**
   * 标记请求已发出并执行一次任务。任务只调用一次，任何异常都不会触发重试。
   */
  async function start(id, task) {
    const job = get(id)
    if (!job) throw new Error('作业不存在')
    if (TERMINAL.has(job.status) || job.attempts > 0) return job

    job.status = 'running'
    job.requestSentAt = nowIso()
    job.updatedAt = job.requestSentAt
    job.attempts += 1

    try {
      const result = (await task(job)) ?? {}
      job.status = 'succeeded'
      job.updatedAt = nowIso()
      job.output = result.output ?? null
      job.usage = result.usage ?? null
      job.revisedPrompt = result.revisedPrompt ?? null
      job.rawMeta = result.rawMeta ?? null
      job.error = null
    } catch (err) {
      finishError(job, err)
    }
    return job
  }

  function failBeforeRequest(id, err) {
    const job = get(id)
    if (!job || TERMINAL.has(job.status)) return job
    job.status = 'failed'
    job.updatedAt = nowIso()
    job.error = {
      code: typeof err?.code === 'string' ? err.code : 'pre_send_failed',
      message: String(err?.message ?? '请求发出前失败').slice(0, 500),
      status: Number.isFinite(Number(err?.status)) ? Number(err.status) : 0,
      retryable: false,
      at: job.updatedAt,
    }
    return job
  }

  function cancel(id) {
    const job = get(id)
    if (!job) return null
    if (TERMINAL.has(job.status)) return job
    job.status = 'canceled'
    job.updatedAt = nowIso()
    return job
  }

  return { create, get, update, start, failBeforeRequest, cancel }
}
