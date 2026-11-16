import assert from 'node:assert/strict'
import test from 'node:test'
import { reconcileDraft } from '../lib/draft.js'

test('keeps prompt and style, falls back incompatible fields', () => {
  const { draft, changes } = reconcileDraft({ provider: 'minimax', prompt: 'keep me', styleId: 'h3-illus', ratio: '16:9', tier: '4K', format: 'webp', transparent: true, compression: 80 }, 'seedream')
  assert.equal(draft.prompt, 'keep me')
  assert.equal(draft.styleId, 'h3-illus')
  assert.equal(draft.format, 'png')
  assert.equal(draft.tier, '2K')
  assert.equal(draft.transparent, true)
  assert.ok(changes.some(change => change.field === 'tier'))
})
