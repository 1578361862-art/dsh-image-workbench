import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createArtworkRepository } from '../lib/artworks.js'
import { createExecutionService } from '../lib/execution.js'
import { createMemoryJobStore } from '../lib/job-queue.js'
import { openIndex } from '../lib/sqlite.js'

async function setup(t) {
  const root = await mkdtemp(join(tmpdir(), 'iw-exec-'))
  const index = await openIndex(':memory:')
  if (!index) { t.skip('node:sqlite unavailable'); return {} }
  t.after(async () => { index.close(); await rm(root, { recursive: true, force: true }) })
  return { root, index, artworks: createArtworkRepository({ root, index }) }
}

const snapshot = { provider: 'minimax', operation: 'text_to_image', prompt: 'a cat', width: 1024, height: 1024, format: 'png' }

test('saves one version per execution and supports parented edits', async t => {
  const { artworks } = await setup(t)
  const service = createExecutionService({
    store: createMemoryJobStore(),
    artworks,
    provider: async (input) => ({ buffer: Buffer.from(input.prompt + '-bytes'), width: input.width, height: input.height, format: 'png' }),
  })
  const first = service.submit({ snapshot, idempotencyKey: 'same-key' })
  const duplicate = service.submit({ snapshot, idempotencyKey: 'same-key' })
  assert.equal(first.id, duplicate.id)
  await service.run()
  const done = service.get(first.id)
  assert.equal(done.status, 'succeeded')
  assert.ok(done.result.artworkId)
  const second = service.submit({ artworkId: done.result.artworkId, parentVersionId: done.result.versionId, snapshot, idempotencyKey: 'edit' })
  await service.run()
  const edited = service.get(second.id)
  assert.equal(edited.status, 'succeeded')
  const artwork = artworks.get(done.result.artworkId)
  assert.equal(artwork.versions.length, 2)
  assert.equal(artwork.versions[1].parent_version_id, done.result.versionId)
})

test('failed provider creates no version', async t => {
  const { artworks } = await setup(t)
  const service = createExecutionService({
    store: createMemoryJobStore(), artworks,
    provider: async () => { throw Object.assign(new Error('no'), { code: 'auth', unknown: false, retryable: false }) },
  })
  const job = service.submit({ snapshot, idempotencyKey: 'fail' })
  await service.run()
  assert.equal(service.get(job.id).status, 'failed')
  assert.equal((await artworks.list()).length, 0)
})
