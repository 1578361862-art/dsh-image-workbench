import assert from 'node:assert/strict'
import test from 'node:test'
import { createJobQueue } from '../lib/job-queue.js'
import { createSqliteJobStore } from '../lib/sqlite-job-store.js'
import { openIndex } from '../lib/sqlite.js'

test('persists queue jobs and restores queued work', async t => {
  const index = await openIndex(':memory:')
  if (!index) { t.skip('node:sqlite unavailable'); return }
  t.after(() => index.close())
  const store = createSqliteJobStore(index)
  let runs = 0
  const queue = createJobQueue({ store, runner: async job => { runs += 1; return { status: 'succeeded', result: { ok: job.idempotencyKey } } } })
  const job = queue.enqueue({ idempotencyKey: 'sqlite-1', snapshot: { prompt: 'x' }, meta: { artworkId: 'art_x' } })
  assert.equal(store.get(job.id).meta.artworkId, 'art_x')
  await queue.kick()
  assert.equal(store.get(job.id).status, 'succeeded')
  assert.equal(store.get(job.id).result.ok, 'sqlite-1')
  assert.equal(runs, 1)
})

test('marks interrupted running jobs unknown on restore', async t => {
  const index = await openIndex(':memory:')
  if (!index) { t.skip('node:sqlite unavailable'); return }
  t.after(() => index.close())
  const store = createSqliteJobStore(index)
  store.put({ id: 'job_x', idempotencyKey: 'x', status: 'running', snapshot: {}, provider: 'minimax', meta: {}, result: null, error: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' })
  const queue = createJobQueue({ store, runner: async () => ({ status: 'succeeded' }) })
  queue.restore(store.list())
  assert.equal(store.get('job_x').status, 'unknown')
})
