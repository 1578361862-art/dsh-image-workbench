// 供应商适配：把执行器快照翻译成 MiniMax / Seedream 的真实调用，并取回原始 bytes。
import { readFile } from 'node:fs/promises'
import { TERMINAL_STATUSES } from './jobs.js'

function providerError(message, code = 'provider_error', extra = {}) {
  return Object.assign(new Error(message), { code, ...extra })
}

function resultPathFromUrl(storage, output) {
  const match = /\/result\/([\w-]+)\/([\w.-]+)\.(jpg|jpeg|png|webp)$/i.exec(output?.url || '')
  if (!match) throw providerError('结果地址无法读取', 'invalid_result')
  const path = storage.resultPath(match[1], match[2], match[3])
  if (!path) throw providerError('结果文件不存在', 'missing_result')
  return path
}

export function createProviderRunner({ cloud, storage, readConfig, readKey, readSeedreamKey, generateSeedream, readFileImpl = readFile, pollMs = 150 } = {}) {
  if (!cloud || !storage) throw new Error('provider runner dependencies missing')
  async function wait(id) {
    for (;;) {
      const job = cloud.getJob(id)
      if (!job) throw providerError('供应商任务不存在', 'missing_job')
      if (TERMINAL_STATUSES.includes(job.status)) return job
      await new Promise(resolve => setTimeout(resolve, pollMs))
    }
  }
  async function minimax(snapshot, config) {
    const key = readKey ? await readKey() : null
    if (!key) throw providerError('还没有保存 API Key', 'missing_key', { status: 400 })
    const output = {
      outputFormat: snapshot.format,
      compression: snapshot.compression,
      background: snapshot.background,
      watermark: snapshot.watermark,
      enhance: snapshot.enhance,
    }
    let accepted
    if (snapshot.sourceAssetId) {
      accepted = await cloud.createJob({
        assetId: snapshot.sourceAssetId, styleId: snapshot.styleId || 'h3-edit', prompt: snapshot.prompt,
        size: snapshot.size, params: {}, parentId: snapshot.parentJobId, recipeId: snapshot.recipeId,
      }, config, { output })
    } else {
      accepted = await cloud.createTextJob({ prompt: snapshot.prompt, size: snapshot.size }, config, { output })
    }
    const job = await wait(accepted.id)
    if (job.status !== 'succeeded' || !job.output) {
      throw providerError(job.error?.message || 'MiniMax 生成失败', job.error?.code || job.status, { status: 422, unknown: job.status === 'unknown' || job.error?.unknown === true })
    }
    const buffer = await readFileImpl(resultPathFromUrl(storage, job.output))
    return { buffer, width: job.output.w || snapshot.width, height: job.output.h || snapshot.height, format: snapshot.format, usage: job.usage || null, revisedPrompt: job.revisedPrompt || null }
  }
  async function seedream(snapshot, config) {
    if (typeof generateSeedream !== 'function' || typeof readSeedreamKey !== 'function') throw providerError('Seedream 适配器未配置', 'unsupported')
    const key = await readSeedreamKey()
    if (!key) throw providerError('还没有保存 Seedream API Key', 'missing_key', { status: 400 })
    const images = []
    if (snapshot.sourceAssetId) {
      const asset = await storage.getAsset(snapshot.sourceAssetId)
      if (!asset) throw providerError('源图不存在', 'invalid_image', { status: 404 })
      const buffer = await readFileImpl(asset.path)
      images.push(`data:${asset.mime || 'image/jpeg'};base64,${buffer.toString('base64')}`)
    }
    const result = await generateSeedream({
      prompt: snapshot.prompt, size: snapshot.size, images, key,
      model: snapshot.modelId || config.seedreamModel, outputFormat: snapshot.format,
      background: snapshot.background, watermark: snapshot.watermark,
    })
    const size = /^(\d{2,5})x(\d{2,5})$/i.exec(String(result.rawMeta?.size || snapshot.size))
    return { buffer: result.buffer, width: size ? Number(size[1]) : snapshot.width, height: size ? Number(size[2]) : snapshot.height, format: snapshot.format, usage: result.usage || null, revisedPrompt: result.revisedPrompt || null }
  }
  async function run(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') throw providerError('任务快照无效', 'invalid_snapshot', { status: 400 })
    await cloud.ready
    const config = await readConfig()
    if (snapshot.provider === 'minimax') return minimax(snapshot, config)
    if (snapshot.provider === 'seedream') return seedream(snapshot, config)
    throw providerError('不支持的模型', 'unknown_provider', { status: 400 })
  }
  return { run, wait }
}
