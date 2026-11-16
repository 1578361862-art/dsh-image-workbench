import assert from 'node:assert/strict'
import test from 'node:test'
import { createJobQueue } from '../lib/job-queue.js'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

test('runs one task at a time in FIFO order and deduplicates idempotency keys', async () => {
  let running = 0
  let max = 0
  const order = []
  const queue = createJobQueue({ runner: async job => {
    running += 1; max = Math.max(max, running); order.push(job.idempotencyKey)
    await sleep(20); running -= 1
    return { status: 'succeeded', result: job.idempotencyKey }
  } })
  const a = queue.enqueue({ idempotencyKey: 'a', snapshot: { prompt: 'a' } })
  const b = queue.enqueue({ idempotencyKey: 'b', snapshot: { prompt: 'b' } })
  const duplicate = queue.enqueue({ idempotencyKey: 'a', snapshot: { prompt: 'other' } })
  assert.equal(a.id, duplicate.id)
  await queue.kick()
  assert.equal(max, 1)
  assert.deepEqual(order, ['a', 'b'])
  assert.equal(queue.get(a.id).status, 'succeeded')
  assert.equal(queue.get(b.id).status, 'succeeded')
})

test('cancels only queued jobs and preserves unknown as non-retryable', async () => {
  let release
  const gate = new Promise(resolve => { release = resolve })
  const queue = createJobQueue({ runner: async job => {
    if (job.idempotencyKey === 'first') { await gate; return { status: 'failed', error: { code: 'network', message: 'x' } } }
    if (job.idempotencyKey === 'unknown') throw Object.assign(new Error('timeout'), { unknown: true })
    return { status: 'succeeded' }
  } })
  const first = queue.enqueue({ idempotencyKey: 'first', snapshot: {} })
  const queued = queue.enqueue({ idempotencyKey: 'queued', snapshot: {} })
  const unknown = queue.enqueue({ idempotencyKey: 'unknown', snapshot: {} })
  const running = queue.kick()
  await sleep(5)
  assert.equal(queue.cancel(first.id).status, 'submitting') // already running: cannot cancel remote
  assert.equal(queue.cancel(queued.id).status, 'cancelled')
  release()
  await running
  assert.equal(queue.get(first.id).status, 'failed')
  assert.equal(queue.get(unknown.id).status, 'unknown')
  queue.retry(unknown.id)
  assert.equal(queue.get(unknown.id).status, 'unknown')
})
