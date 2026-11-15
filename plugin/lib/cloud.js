// P3 云端编排：作业 + 预算闸门 + 台账 + 结果落盘。
// 默认关闭（config.cloudEnabled !== true 时路由层直接 403）；这里不碰客户端设置默认值。
import { mkdir, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { checkBudget, estimate as estimateCost } from './budget.js'
import { fail } from './errors.js'
import { createJobs, hashParams, JOB_STATUSES, MAX_SEED, normalizeSeed, retryBlockedReason } from './jobs.js'
import { createLedger } from './ledger.js'
import { baseUrlFor, generateEdit, generateText, isValidSize } from './minimax.js'
import { writeAtomic } from './storage.js'

const STYLE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/

function numberOr(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function createCloud({
  root,
  storage,
  readKey,
  clock = () => new Date(),
  generate = generateEdit,
  generateText: textGenerate = generateText,
}) {
  const ledger = createLedger(join(root, 'ledger.jsonl'), { clock })
  const jobsDir = join(root, 'jobs')
  async function persistJob(job) {
    await writeAtomic(join(jobsDir, `${job.id}.json`), JSON.stringify(job, null, 2), 0o600)
  }
  const jobs = createJobs({ clock, onChange: persistJob })
  const ready = (async () => {
    let names = []
    try { names = await readdir(jobsDir) } catch { return }
    const records = []
    for (const name of names) {
      if (!name.endsWith('.json')) continue
      try {
        const parsed = JSON.parse(await readFile(join(jobsDir, name), 'utf8'))
        if (parsed && typeof parsed === 'object') records.push(parsed)
      } catch {
        // 损坏的 job 文件不影响其他作业
      }
    }
    jobs.hydrate(records)
  })().catch(() => {})

  function assertEnabled(config) {
    if (config?.cloudEnabled !== true) fail('云端功能未启用', 403)
  }

  async function persistResult(job, result, config, estimated) {
    const dir = join(root, 'outputs', job.id)
    await mkdir(dir, { recursive: true })
    const file = join(dir, `${job.styleId}.jpg`)
    await writeAtomic(file, result.buffer, 0o644)

    const actual = /^(\d{2,5})x(\d{2,5})$/i.exec(String(result.rawMeta?.size ?? ''))
    const wanted = /^(\d{2,5})x(\d{2,5})$/i.exec(String(job.size ?? ''))
    const width = actual ? Number(actual[1]) : wanted ? Number(wanted[1]) : 0
    const height = actual ? Number(actual[2]) : wanted ? Number(wanted[2]) : 0
    const output = {
      w: width,
      h: height,
      bytes: result.buffer.length,
      costYuan: estimated.costYuan,
      url: `/image-workbench/result/${job.id}/${job.styleId}.jpg`,
    }

    const model = typeof result.rawMeta?.model === 'string' ? result.rawMeta.model : null

    await writeAtomic(
      join(dir, 'batch.json'),
      JSON.stringify(
        {
          kind: 'cloud',
          id: job.id,
          assetId: job.assetId,
          styleId: job.styleId,
          prompt: job.prompt,
          model,
          seed: job.seed ?? null,
          size: job.size,
          params: job.params,
          parentId: job.parentId ?? null,
          recipeId: job.recipeId ?? null,
          createdAt: job.createdAt,
          results: [{ styleId: job.styleId, params: job.params, w: width, h: height, costYuan: estimated.costYuan, url: output.url }],
        },
        null,
        2,
      ),
      0o644,
    ).catch(() => {})

    await storage.indexCloudJob({
      id: job.id,
      createdAt: job.createdAt,
      assetId: job.assetId,
      styleIds: [job.styleId],
      model,
      seed: job.seed ?? null,
      size: job.size,
      params: job.params,
      parentId: job.parentId ?? null,
      recipeId: job.recipeId ?? null,
      results: [{ styleId: job.styleId, costYuan: estimated.costYuan, url: output.url }],
    }).catch(() => {})

    await ledger
      .append({
        at: clock().toISOString(),
        jobId: job.id,
        batchId: job.id,
        assetId: job.assetId,
        styleId: job.styleId,
        provider: 'minimax',
        model: result.rawMeta?.model ?? null,
        speed: result.rawMeta?.speed ?? config.model,
        size: job.size,
        billing: config.billing,
        usage: result.usage ?? null,
        estimatedYuan: estimated.costYuan,
        costYuan: config.billing === 'mplan' ? 0 : estimated.costYuan,
        requestId: result.rawMeta?.requestId ?? null,
        requestStatus: result.rawMeta?.status ?? null,
      })
      .catch(() => {})

    return { output }
  }

  async function runJob(job, { config, key, asset, extraAssets = [], estimated, reference }) {
    jobs.update(job.id, { status: 'preparing' })
    let imageBuffer
    let extraBuffers = []
    try {
      imageBuffer = await readFile(asset.path)
      extraBuffers = await Promise.all(extraAssets.map((a) => readFile(a.path)))
    } catch (err) {
      jobs.failBeforeRequest(job.id, Object.assign(err, { code: 'asset_read_failed' }))
      return job
    }

    return jobs.start(job.id, async (current) => {
      const result = await generate({
        imageBuffer,
        mime: asset.meta.mime,
        referenceBuffer: reference?.buffer,
        referenceMime: reference?.mime,
        extraBuffers: extraBuffers,
        prompt: current.prompt,
        size: current.size,
        key,
        baseUrl: baseUrlFor(config),
        speed: config.model,
      })
      const persisted = await persistResult(current, result, config, estimated)
      return {
        output: persisted.output,
        usage: result.usage ?? null,
        revisedPrompt: result.revisedPrompt ?? null,
        rawMeta: result.rawMeta ?? null,
      }
    })
  }

  async function createJob(body = {}, config, extras = {}) {
    assertEnabled(config)
    if (!body || typeof body !== 'object' || Array.isArray(body)) fail('请求内容无效')

    const { assetId, styleId, prompt, size, params, seed, parentId, recipeId } = body
    const assetIds = Array.isArray(body.assetIds) ? body.assetIds.filter((id) => typeof id === 'string' && id) : []
    const primaryId = assetId || assetIds[0]
    if (typeof primaryId !== 'string' || !primaryId) fail('assetId 无效')
    if (typeof styleId !== 'string' || !STYLE_ID_RE.test(styleId)) fail('styleId 无效')
    if (typeof prompt !== 'string' || !prompt.trim()) fail('prompt 不能为空')
    if (prompt.length > 32000) fail('prompt 太长')
    if (typeof size !== 'string' || !isValidSize(size)) fail('size 需要 WxH 或 1K/2K/4K')
    if (params !== undefined && (params === null || typeof params !== 'object' || Array.isArray(params))) {
      fail('params 无效')
    }
    if (seed !== undefined && seed !== null && normalizeSeed(seed) === null) {
      fail(`seed 需要是 0–${MAX_SEED} 的整数`)
    }

    const asset = await storage.getAsset(primaryId)
    if (!asset) fail('原图不存在', 404)
    const extraAssets = []
    for (const id of assetIds.slice(1)) {
      const a = await storage.getAsset(id)
      if (!a) fail('参考图不存在', 404)
      extraAssets.push(a)
    }

    const key = await readKey()
    if (!key) fail('还没有保存 API Key', 400)

    const estimated = estimateCost({
      size,
      speed: config.model,
      billing: config.billing,
      count: 1,
      now: clock(),
    })
    const spentToday = await ledger.spentToday(clock())
    const decision = checkBudget({
      spentToday,
      estimated: estimated.costYuan,
      limit: numberOr(config.budget, 10),
      billing: config.billing,
      allow: body.allowOverBudget === true,
    })
    if (!decision.allowed) {
      fail('超出每日预算，需要手动放行', 402, {
        code: 'budget_exceeded',
        estimatedYuan: decision.estimatedYuan,
        spentTodayYuan: decision.spentTodayYuan,
        budgetYuan: decision.limitYuan,
      })
    }

    const cleanPrompt = prompt.trim()
    const job = jobs.create({
      assetId: primaryId,
      styleId,
      prompt: cleanPrompt,
      size,
      seed: normalizeSeed(seed),
      params: params ?? {},
      model: config.model,
      parentId,
      recipeId,
      paramsHash: hashParams({ prompt: cleanPrompt, size, params: params ?? {} }),
    })

    // 异步执行；错误全部收敛到 job.status，不会冒泡成未处理异常。
    setImmediate(() => {
      runJob(job, { config, key, asset, extraAssets, estimated, reference: extras.reference }).catch((err) => {
        jobs.failBeforeRequest(job.id, err)
      })
    })

    return { id: job.id, status: job.status }
  }

  async function runTextJob(job, { config, key, estimated }) {
    jobs.update(job.id, { status: 'preparing' })
    return jobs.start(job.id, async (current) => {
      const result = await textGenerate({
        prompt: current.prompt,
        size: current.size,
        key,
        baseUrl: baseUrlFor(config),
        speed: config.model,
      })
      const persisted = await persistResult(current, result, config, estimated)
      return {
        output: persisted.output,
        usage: result.usage ?? null,
        revisedPrompt: result.revisedPrompt ?? null,
        rawMeta: result.rawMeta ?? null,
      }
    })
  }

  async function createTextJob(body = {}, config) {
    assertEnabled(config)
    if (!body || typeof body !== 'object' || Array.isArray(body)) fail('请求内容无效')
    const { prompt, size } = body
    if (typeof prompt !== 'string' || !prompt.trim()) fail('prompt 不能为空')
    if (prompt.length > 32000) fail('prompt 太长')
    if (typeof size !== 'string' || !/^\d{2,5}x\d{2,5}$/i.test(size) || !isValidSize(size)) {
      fail('关闭 Prompt 增强时，文生图 size 必须是 WxH')
    }
    const key = await readKey()
    if (!key) fail('还没有保存 API Key', 400)
    const estimated = estimateCost({
      size,
      speed: config.model,
      billing: config.billing,
      count: 1,
      now: clock(),
    })
    const spentToday = await ledger.spentToday(clock())
    const decision = checkBudget({
      spentToday,
      estimated: estimated.costYuan,
      limit: numberOr(config.budget, 10),
      billing: config.billing,
      allow: body.allowOverBudget === true,
    })
    if (!decision.allowed) {
      fail('超出每日预算，需要手动放行', 402, {
        code: 'budget_exceeded',
        estimatedYuan: decision.estimatedYuan,
        spentTodayYuan: decision.spentTodayYuan,
        budgetYuan: decision.limitYuan,
      })
    }
    const job = jobs.create({
      assetId: '',
      styleId: 'h3-text',
      prompt: prompt.trim(),
      size,
      params: {},
      model: config.model,
      paramsHash: hashParams({ prompt: prompt.trim(), size, params: {} }),
    })
    setImmediate(() => {
      runTextJob(job, { config, key, estimated }).catch((err) => {
        jobs.failBeforeRequest(job.id, err)
      })
    })
    return { id: job.id, status: job.status }
  }

  function getJob(id) {
    const job = jobs.get(id)
    if (!job) fail('作业不存在', 404)
    return job
  }

  // 队列列表：只做只读快照，顺序/过滤/limit 全部由 jobs.js 负责。
  function listJobs({ status, provider, limit } = {}) {
    const wantedStatus = typeof status === 'string' && status ? status : undefined
    if (wantedStatus && !JOB_STATUSES.includes(wantedStatus)) fail('status 无效', 400)
    return jobs.list({ status: wantedStatus, provider, limit })
  }

  function cancelJob(id) {
    const job = jobs.get(id)
    if (!job) fail('作业不存在', 404)
    if (job.requestSentAt) fail('请求已发出，不能取消；可能已生成并计费', 409)
    const next = jobs.cancel(id)
    return next
  }

  /**
   * 重试一个确定性失败的 H3 作业：复位同一个 job，再异步执行一次。
   * 只复用已落盘的复现字段；unknown（请求可能已发出）永不重发。
   */
  async function retryJob(id, config, extras = {}) {
    const job = jobs.get(id)
    if (!job) fail('作业不存在，不能重试', 409)
    if (job.provider !== 'minimax') {
      fail(
        job.provider === 'seedream'
          ? 'Seedream 作业暂不支持重试：源图数据未持久化'
          : '该作业暂不支持重试',
        409,
      )
    }
    const blocked = retryBlockedReason(job)
    if (blocked) fail(blocked, 409)

    const key = await readKey()
    if (!key) fail('还没有保存 API Key', 400)

    const estimated = estimateCost({
      size: job.size,
      speed: config?.model,
      billing: config?.billing,
      count: 1,
      now: clock(),
    })
    const spentToday = await ledger.spentToday(clock())
    const decision = checkBudget({
      spentToday,
      estimated: estimated.costYuan,
      limit: numberOr(config?.budget, 10),
      billing: config?.billing,
      allow: false,
    })
    if (!decision.allowed) {
      fail('超出每日预算，需要手动放行', 402, {
        code: 'budget_exceeded',
        estimatedYuan: decision.estimatedYuan,
        spentTodayYuan: decision.spentTodayYuan,
        budgetYuan: decision.limitYuan,
      })
    }

    // 复用 assetId/styleId/prompt/size/params/seed/parentId/recipeId；不接收客户端新参数。
    // assetIds 第 2 张起的参考图没有持久化，重试时不再发送（只有 style 参考图会重算）。
    if (job.assetId) {
      const asset = await storage.getAsset(job.assetId)
      if (!asset) fail('原图不存在，无法重试', 409)
      jobs.reset(job.id)
      setImmediate(() => {
        runJob(job, {
          config,
          key,
          asset,
          extraAssets: [],
          estimated,
          reference: extras.reference,
        }).catch((err) => {
          jobs.failBeforeRequest(job.id, err)
        })
      })
    } else {
      jobs.reset(job.id)
      setImmediate(() => {
        runTextJob(job, { config, key, estimated }).catch((err) => {
          jobs.failBeforeRequest(job.id, err)
        })
      })
    }
    return { id: job.id, status: job.status }
  }

  async function usage() {
    return ledger.summary(clock())
  }

  return { createJob, createTextJob, getJob, listJobs, cancelJob, retryJob, usage, ledger, jobs }
}
