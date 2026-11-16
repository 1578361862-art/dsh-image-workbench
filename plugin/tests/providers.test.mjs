import assert from 'node:assert/strict'
import test from 'node:test'
import { createProviderRunner } from '../lib/providers.js'

const snapshot = { provider: 'minimax', operation: 'text_to_image', prompt: 'cat', size: '1024x1024', width: 1024, height: 1024, format: 'png' }

function fakeCloud({ status = 'succeeded', output } = {}) {
  let polls = 0
  return {
    ready: Promise.resolve(),
    createTextJob: async () => ({ id: 'job_1', status: 'running' }),
    createJob: async () => ({ id: 'job_2', status: 'running' }),
    getJob: () => {
      polls += 1
      return polls < 2 ? { id: 'job_1', status: 'running' } : { id: 'job_1', status, output: output ?? { url: '/image-workbench/result/job_1/h3-text.png', w: 1024, h: 1024 } }
    },
  }
}

test('MiniMax text job downloads the original result bytes', async () => {
  const runner = createProviderRunner({
    cloud: fakeCloud(), storage: { resultPath: () => '/tmp/result.png' },
    readConfig: async () => ({ seedreamModel: 'doubao-seedream-5-5-261028' }),
    readKey: async () => 'key', pollMs: 1,
    readFileImpl: async path => { assert.equal(path, '/tmp/result.png'); return Buffer.from('png-bytes') },
  })
  const out = await runner.run(snapshot)
  assert.equal(out.buffer.toString(), 'png-bytes')
  assert.equal(out.width, 1024)
  assert.equal(out.format, 'png')
})

test('surfaces provider failure without inventing a result', async () => {
  const runner = createProviderRunner({
    cloud: fakeCloud({ status: 'failed', output: null }), storage: { resultPath: () => '/tmp/result.png' },
    readConfig: async () => ({}), readKey: async () => 'key', pollMs: 1,
    readFileImpl: async () => Buffer.from('x'),
  })
  await assert.rejects(() => runner.run(snapshot), /生成失败|failed/)
})

test('Seedream adapter sends source bytes and validates result metadata', async () => {
  const runner = createProviderRunner({
    cloud: { ready: Promise.resolve() },
    storage: {
      getAsset: async () => ({ path: '/tmp/source.png', mime: 'image/png' }),
      resultPath: () => '/tmp/result.png',
    },
    readConfig: async () => ({ seedreamModel: 'doubao-seedream-5-5-261028' }),
    readSeedreamKey: async () => 'seed-key',
    readFileImpl: async () => Buffer.from('source-bytes'),
    generateSeedream: async ({ images, outputFormat }) => {
      assert.equal(images.length, 1)
      assert.match(images[0], /^data:image\/png;base64,/)
      assert.equal(outputFormat, 'png')
      return { buffer: Buffer.from('seed-output'), rawMeta: { size: '2048x2048' } }
    },
    pollMs: 1,
  })
  const out = await runner.run({ ...snapshot, provider: 'seedream', sourceAssetId: 'a1', width: 2048, height: 2048 })
  assert.equal(out.buffer.toString(), 'seed-output')
  assert.deepEqual([out.width, out.height], [2048, 2048])
})
