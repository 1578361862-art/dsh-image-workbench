import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveOutputSpec } from '../lib/output-spec.js'

test('resolves legal sizes and formats', () => {
  const h3 = resolveOutputSpec({ provider: 'minimax', ratio: '16:9', tier: '2K', format: 'jpeg' })
  assert.equal(h3.format, 'jpeg')
  assert.ok(h3.width * h3.height >= 655360 && h3.width * h3.height <= 20000000)
  const seed = resolveOutputSpec({ provider: 'seedream', ratio: '1:1', tier: '2K', format: 'png', transparent: true })
  assert.equal(seed.format, 'png')
  assert.equal(seed.width, seed.height)
  assert.ok(seed.width * seed.height <= 4624220)
})

test('rejects unsupported formats/tiers and transparent non-png', () => {
  assert.throws(() => resolveOutputSpec({ provider: 'seedream', ratio: '1:1', tier: '4K' }), /清晰度/)
  assert.throws(() => resolveOutputSpec({ provider: 'seedream', ratio: '1:1', tier: '2K', format: 'webp' }), /格式/)
  assert.throws(() => resolveOutputSpec({ provider: 'minimax', ratio: '1:1', tier: '2K', transparent: true }), /透明/)
  assert.throws(() => resolveOutputSpec({ provider: 'seedream', ratio: '1:1', tier: '2K', format: 'jpeg', transparent: true }), /PNG/)
})
