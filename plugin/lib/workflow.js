import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fail } from './errors.js'
import { hashParams, retryBlockedReason } from './jobs.js'
import { isValidSize } from './minimax.js'
import { validateSeedreamSize } from './seedream.js'
import { writeAtomic } from './storage.js'

const ID = /^[a-zA-Z0-9_-]{12,80}$/
const SIZE = /^\d{2,5}x\d{2,5}$/
const ACTIVE = new Set(['first-running', 'edit-running'])

export function workflowSize(provider, size) {
  if (typeof size !== 'string' || !SIZE.test(size)) return false
  return provider === 'seedream' ? !!validateSeedreamSize(size, 'doubao-seedream-5-5-261028') : isValidSize(size)
}

export function normalizeWorkflow(value) {
  if (typeof value?.id !== 'string' || !ID.test(value.id)) fail('工作流 ID 无效')
  const stage = (input, name, inherit = false) => {
    if (!['minimax', 'seedream'].includes(input?.provider)) fail(name + '模型无效')
    const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : ''
    if (!prompt || Array.from(prompt).length > 32000) fail(name + '提示词需在 1–32000 字之间')
    if (!(inherit && input.size === 'inherit') && !workflowSize(input.provider, input.size)) fail(name + '尺寸不受模型支持')
    const format = input.format ?? 'jpeg'
    if (!(input.provider === 'minimax' ? ['jpeg', 'png', 'webp'] : ['jpeg', 'png']).includes(format)) fail(name + '格式无效')
    const background = input.provider === 'seedream' ? input.background ?? 'auto' : undefined
    if (background && !['auto', 'opaque', 'transparent'].includes(background)) fail(name + '背景无效')
    if (background === 'transparent' && format !== 'png') fail('透明背景需要 PNG')
    const compression = input.compression == null ? undefined : Number(input.compression)
    if (compression !== undefined && (!Number.isInteger(compression) || compression < 0 || compression > 100)) fail(name + '压缩质量无效')
    return { provider: input.provider, prompt, size: input.size, format, compression, background, watermark: input.watermark === true,
      enhance: typeof input.enhance === 'boolean' ? input.enhance : undefined }
  }
  const first = stage(value.first, '首轮')
  const edit = stage(value.edit, '二次编辑', true)
  if (edit.size === 'inherit' && !workflowSize(edit.provider, first.size)) fail('二次编辑无法沿用首轮尺寸，请选择支持的编辑尺寸')
  const sourceId = value.first.sourceId
  if (sourceId != null && (typeof sourceId !== 'string' || !/^[\w-]{1,80}$/.test(sourceId))) fail('源图无效')
  const styleId = value.first.styleId
  if (typeof styleId !== 'string' || !/^[a-zA-Z0-9][\w.-]{0,63}$/.test(styleId)) fail('风格无效')
  return { id: value.id, first: { ...first, sourceId: sourceId || null, styleId }, edit }
}

export function createWorkflowService({ root, start, wait, check = async () => {} }) {
  const active = new Map()
  const locks = new Map()
  const path = id => join(root, id + '.json')
  const save = async record => {
    record.updatedAt = new Date().toISOString()
    await writeAtomic(path(record.id), JSON.stringify(record), 0o600)
  }
  async function load(id) {
    if (typeof id !== 'string' || !ID.test(id)) fail('工作流不存在', 404)
    try { return JSON.parse(await readFile(path(id), 'utf8')) }
    catch (error) { if (error.code === 'ENOENT') return null; throw error }
  }
  function locked(id, task) {
    const run = (locks.get(id) || Promise.resolve()).catch(() => {}).then(task)
    locks.set(id, run)
    void run.finally(() => { if (locks.get(id) === run) locks.delete(id) }).catch(() => {})
    return run
  }
  function launch(record) {
    if (active.has(record.id)) return
    const task = advance(record).finally(() => active.delete(record.id))
    active.set(record.id, task)
    void task.catch(() => {})
  }
  async function round(record, key, input, source, parentId) {
    if (!record[key]) {
      if (record.submitting) fail('上次请求提交状态未知，请查看队列', 409, { unknown: true })
      record.submitting = true
      await save(record)
      const accepted = await start(input, source, parentId)
      record[key] = accepted.id
      record.submitting = false
      await save(record)
    }
    const job = await wait(record[key])
    if (job.status !== 'succeeded' || !job.output) {
      fail(job.error?.message || '模型任务未完成', 422, { unknown: job.status === 'unknown', retryable: !retryBlockedReason(job) })
    }
    return job.output
  }
  async function advance(record) {
    try {
      if (!record.firstOutput) {
        record.firstOutput = await round(record, 'firstJobId', record.first, record.first.sourceId, null)
        record.status = 'edit-running'
        await save(record)
      }
      const size = record.edit.size === 'inherit' ? record.firstOutput.w + 'x' + record.firstOutput.h : record.edit.size
      if (!workflowSize(record.edit.provider, size)) fail('实际首轮尺寸不受编辑模型支持，请选择编辑尺寸', 400, { retryable: true })
      record.editOutput = await round(record, 'editJobId', { ...record.edit, size }, record.firstOutput, record.firstJobId)
      record.status = 'done'
    } catch (error) {
      record.status = (error.unknown || error.details?.unknown) ? 'unknown' : record.firstOutput ? 'edit-failed' : 'first-failed'
      record.error = error.message
      record.retryable = record.status === 'edit-failed' && ((error.retryable === true || error.details?.retryable === true) || error.status >= 400 && error.status < 500 && !record.editJobId)
    }
    record.submitting = false
    await save(record)
  }
  async function get(id) {
    const record = await load(id)
    if (!record) fail('工作流不存在', 404)
    if (ACTIVE.has(record.status)) launch(record)
    return record
  }
  async function create(value) {
    const request = normalizeWorkflow(value)
    return locked(request.id, async () => {
      let record = await load(request.id)
      const hash = hashParams(request)
      if (record) {
        if (record.hash !== hash) fail('工作流 ID 已被使用', 409)
      } else {
        await check(request)
        record = { ...request, hash, status: 'first-running' }
        await save(record)
      }
      if (ACTIVE.has(record.status)) launch(record)
      return record
    })
  }
  async function retry(id, size) {
    return locked(id, async () => {
      const record = await get(id)
      if (record.status !== 'edit-failed' || !record.retryable) fail('当前任务不能重试二次编辑', 409)
      if (size !== undefined) {
        if (!workflowSize(record.edit.provider, size)) fail('二次编辑尺寸不受模型支持')
        record.edit.size = size
      }
      record.status = 'edit-running'
      record.editJobId = null
      record.error = null
      record.retryable = false
      await save(record)
      launch(record)
      return record
    })
  }
  async function list() {
    let entries
    try { entries = await readdir(root) }
    catch (error) { if (error.code === 'ENOENT') return []; throw error }
    const records = await Promise.all(entries.filter(name => name.endsWith('.json') && ID.test(name.slice(0, -5)))
      .map(name => load(name.slice(0, -5)).catch(() => null)))
    return records.filter(record => record?.firstOutput).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 20)
      .map(({ id, first, firstOutput, editOutput, status, updatedAt }) => ({ id, styleId: first.styleId, firstOutput, editOutput, status, updatedAt }))
  }
  return { create, get, list, retry, async settle(id) { await active.get(id); return get(id) } }
}
