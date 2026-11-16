import assert from 'node:assert/strict'
import test from 'node:test'
import { decomposeSeedream } from '../lib/seedream.js'

test('parses Seedream layer z_index and bounding_box', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({
    data: [
      { url: 'https://x/base.png', z_index: 0, size: '1024x1024', name: '底图' },
      { url: 'https://x/layer.png', z_index: 1, size: '900x1000', name: '猫', description: '猫', bounding_box: { absolute: [10, 20, 910, 1020], normalized: [0.01, 0.02, 0.89, 1] } },
    ],
    usage: { generated_images: 2 },
  }), { status: 200, headers: { 'content-type': 'application/json' } })
  const result = await decomposeSeedream({ imageDataUrl: 'data:image/png;base64,AA==', key: 'k', maxImages: 4, fetchImpl })
  assert.equal(result.images.length, 2)
  assert.equal(result.images[1].zIndex, 1)
  assert.deepEqual(result.images[1].boundingBox.absolute, [10, 20, 910, 1020])
  assert.equal(result.usage.generated_images, 2)
})
