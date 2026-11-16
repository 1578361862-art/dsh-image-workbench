// 生成执行器：一次 job 只产出/保存一个版本；队列负责单并发，作品库负责 DAG。
import { hashParams } from './jobs.js'
import { createJobQueue } from './job-queue.js'

function jobError(error) {
  const wrapped = new Error(error?.message || '生成失败')
  wrapped.code = error?.code || 'generation_failed'
  wrapped.status = error?.status || 0
  wrapped.unknown = error?.unknown === true
  wrapped.retryable = error?.retryable !== false && !wrapped.unknown
  return wrapped
}

export function createExecutionService({ queue: suppliedQueue, store, artworks, provider, sourceLoader, clock = () => new Date(), onChange = () => {} }) {
  if (!artworks || typeof provider !== 'function') throw new Error('execution service dependencies missing')

  async function runner(job, checkpoint) {
    checkpoint({ status: 'generating' })
    let output
    try {
      output = await provider(job.snapshot, { job, checkpoint })
    } catch (error) {
      throw jobError(error)
    }
    if (!output || !Buffer.isBuffer(output.buffer) || !output.buffer.length) {
      throw Object.assign(new Error('模型没有返回可保存的图片'), { code: 'empty_output' })
    }
    checkpoint({ status: 'saving_original' })
    let artworkId = job.meta?.artworkId
    if (!artworkId) {
      const artwork = await artworks.create({ title: job.snapshot?.title || job.snapshot?.prompt || '未命名作品' })
      artworkId = artwork.id
    }
    if (!job.meta?.parentVersionId && job.snapshot?.sourceAssetId && typeof sourceLoader === 'function') {
      try {
        const source = await sourceLoader(job.snapshot.sourceAssetId)
        if (source?.buffer?.length) await artworks.attachSource(artworkId, source.buffer, source.mime)
      } catch { /* source attachment is best-effort; generation result stays */ }
    }
    const format = output.format || job.snapshot.format || 'png'
    const version = await artworks.addVersion({
      artworkId,
      parentVersionId: job.meta?.parentVersionId || null,
      buffer: output.buffer,
      format,
      width: output.width || job.snapshot.width,
      height: output.height || job.snapshot.height,
      prompt: job.snapshot.prompt,
      snapshot: { ...job.snapshot, idempotencyKey: job.idempotencyKey },
      status: 'succeeded',
      jobId: job.id,
      layerManifest: output.layerManifest || null,
    })
    return {
      status: output.partial ? 'partial_success' : 'succeeded',
      result: { artworkId, versionId: version.id, file: version.file, width: version.width, height: version.height, sha256: version.sha256, layerManifest: version.layerManifest || null },
      artworkId,
    }
  }

  const queueService = suppliedQueue || createJobQueue({ store, runner, clock, onChange })
  function submit({ artworkId = null, parentVersionId = null, snapshot, idempotencyKey } = {}) {
    if (!snapshot || typeof snapshot !== 'object') throw Object.assign(new Error('任务快照无效'), { status: 400 })
    const key = idempotencyKey || hashParams({ ...snapshot, artworkId, parentVersionId })
    return queueService.enqueue({ idempotencyKey: key, snapshot, provider: snapshot.provider, meta: { artworkId, parentVersionId } })
  }
  async function run() { await queueService.kick() }
  return { queue: queueService, runner, submit, run, get: id => queueService.get(id), list: () => queueService.list() }
}

export function createExecutionQueue(options) {
  return createExecutionService(options)
}
