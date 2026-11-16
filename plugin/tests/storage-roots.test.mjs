import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createStorageRoots, normalizeRoot } from '../lib/storage-roots.js'

test('normalizes only absolute directories and persists active root', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'iw-roots-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const file = join(dir, 'storage.json')
  const repo = createStorageRoots({ file })
  assert.throws(() => normalizeRoot('relative'), /绝对路径/)
  assert.throws(() => normalizeRoot('/'), /根目录/)
  const active = join(dir, '作品')
  const result = await repo.setActive(active)
  assert.equal(result.writable, true)
  const state = await repo.list()
  assert.equal(state.active, active)
  assert.equal(state.roots.find(root => root.path === active).active, true)
  assert.ok(state.roots.some(root => root.active === false))
})
