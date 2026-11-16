// 单并发、可恢复的任务队列。任务快照不可变；unknown 不自动重发。
import { randomBytes } from 'node:crypto'

export const QUEUE_STATUSES = Object.freeze([
  'queued', 'submitting', 'generating', 'fetching_asset', 'saving_original', 'splitting_layers',
  'saving_layers', 'succeeded', 'partial_success', 'failed', 'unknown', 'cancelled',
])
const TERMINAL = new Set(['succeeded', 'partial_success', 'failed', 'unknown', 'cancelled'])
const ACTIVE = new Set(['submitting', 'generating', 'fetching_asset', 'saving_original', 'splitting_layers', 'saving_layers'])

export function createMemoryJobStore() {
  const jobs = new Map()
  return {
    get: id => jobs.get(id) ?? null,
    list: () => [...jobs.values()],
    put: job => { jobs.set(job.id, job); return job },
    delete: id => jobs.delete(id),
  }
}

export function createJobQueue({ store = createMemoryJobStore(), runner, clock = () => new Date(), onChange = () => {}, concurrency = 1 } = {}) {
  if (typeof runner !== 'function') throw new Error('runner required')
  if (concurrency !== 1) throw new Error('V2.1 only supports single concurrency')
  let active = null
  let kicked = false
  const emit = job => { try { onChange(job) } catch {} }

  function save(job) {
    job.updatedAt = clock().toISOString()
    store.put(job)
    emit({ ...job })
    return job
  }
  function findByIdempotency(key) {
    return store.list().find(job => job.idempotencyKey === key) || null
  }
  function enqueue({ idempotencyKey, snapshot, provider = 'minimax', meta = {} } = {}) {
    if (typeof idempotencyKey !== 'string' || !idempotencyKey) throw new Error('idempotencyKey required')
    const existing = findByIdempotency(idempotencyKey)
    if (existing) return existing
    const now = clock().toISOString()
    const job = {
      id: `job_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`,
      idempotencyKey, provider, status: 'queued', snapshot, meta, createdAt: now, updatedAt: now,
      error: null, result: null, layerManifest: null,
    }
    save(job)
    queueMicrotask(kick)
    return job
  }
  function cancel(id) {
    const job = store.get(id)
    if (!job) return null
    if (job.status !== 'queued') return job
    job.status = 'cancelled'
    return save(job)
  }
  function retry(id) {
    const job = store.get(id)
    if (!job || job.status !== 'failed' || job.retryable === false) return job
    job.status = 'queued'
    job.error = null
    job.result = null
    save(job)
    queueMicrotask(kick)
    return job
  }
  function restore(jobs = []) {
    for (const job of jobs) {
      if (TERMINAL.has(job.status)) continue
      if (job.status === 'queued') { save(job); continue }
      job.status = 'unknown'
      job.error = { code: 'interrupted', message: '宿主重启时任务仍在执行，状态未知' }
      save(job)
    }
    queueMicrotask(kick)
    return jobs
  }
  async function kick() {
    if (active || kicked) return
    kicked = true
    try {
      for (;;) {
        if (active) return
        const next = store.list().filter(job => job.status === 'queued').sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]
        if (!next) return
        active = next.id
        await run(next)
        active = null
      }
    } finally {
      kicked = false
    }
  }
  async function run(job) {
    const checkpoint = patch => save(Object.assign(job, patch))
    try {
      save(Object.assign(job, { status: 'submitting' }))
      const result = await runner({ ...job }, checkpoint)
      if (TERMINAL.has(result?.status)) {
        save(Object.assign(job, result, { finishedAt: clock().toISOString() }))
      } else {
        save(Object.assign(job, { status: 'failed', error: { code: 'invalid_result', message: '任务没有终态' } }))
      }
    } catch (error) {
      const status = error?.unknown ? 'unknown' : 'failed'
      save(Object.assign(job, { status, error: { code: error?.code || 'failed', message: error?.message || '任务失败' }, retryable: status === 'failed' && error?.retryable !== false }))
    }
  }
  function list() { return store.list().slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }
  function get(id) { return store.get(id) }
  return { enqueue, cancel, retry, restore, kick, list, get, store }
}
