import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createWorkflowService, normalizeWorkflow } from '../lib/workflow.js'

const request = {
  id: 'test-workflow-0001',
  first: { provider: 'minimax', prompt: 'first', size: '4096x4096', styleId: 'h3-illus' },
  edit: { provider: 'seedream', prompt: 'edit', size: '2048x2048' },
}

test('checks both prompts and Seedream dimensions before submission', () => {
  assert.throws(() => normalizeWorkflow({ ...request, edit: { ...request.edit, size: '4096x4096' } }), /尺寸/)
  assert.throws(() => normalizeWorkflow({ ...request, edit: { ...request.edit, prompt: ' ' } }), /提示词/)
  assert.equal(normalizeWorkflow(request).edit.size, '2048x2048')
})

test('keeps the first output and retries only the second stage', async t => {
  const root = await mkdtemp(join(tmpdir(), 'iw-workflow-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const first = { url: '/image-workbench/result/first/h3-text.jpg', w: 4096, h: 4096 }
  const second = { url: '/image-workbench/result/edit/seedream.jpg', w: 2048, h: 2048 }
  const calls = []
  const service = createWorkflowService({
    root,
    start: async (config, source) => {
      calls.push({ config, source })
      return { id: String(calls.length) }
    },
    wait: async id => id === '1' ? { status: 'succeeded', output: first }
      : id === '2' ? { status: 'failed', error: { message: 'edit failed' } }
        : { status: 'succeeded', output: second },
  })
  await Promise.all([service.create(request), service.create(request)])
  const failed = await service.settle(request.id)
  assert.equal(failed.status, 'edit-failed')
  assert.deepEqual(failed.firstOutput, first)
  assert.equal(calls.length, 2)
  assert.deepEqual(calls[1].source, first)
  await service.retry(request.id)
  const complete = await service.settle(request.id)
  assert.equal(complete.status, 'done')
  assert.deepEqual(complete.editOutput, second)
  assert.equal(calls.length, 3)
})
