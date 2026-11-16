import assert from 'node:assert/strict'
import test from 'node:test'
import { capabilityWarnings, getCapabilities } from '../lib/capabilities.js'

test('capabilities expose verified model ids and conservative layer flags', () => {
  assert.equal(getCapabilities('minimax').modelId, 'MiniMax-H3-Image')
  assert.equal(getCapabilities('seedream').modelId, 'doubao-seedream-5-5-261028')
  assert.equal(getCapabilities('seedream').layerSplit.verified, true)
  assert.equal(getCapabilities('seedream').layerSplit.maxLayers, 99)
  assert.match(capabilityWarnings('seedream').join(' '), /工作流接线/)
  assert.throws(() => getCapabilities('nope'), /未知模型/)
})
