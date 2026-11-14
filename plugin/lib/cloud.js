// P3 云端编排：作业 + 预算闸门 + 台账 + 结果落盘。
// 默认关闭（config.cloudEnabled !== true 时路由层直接 403）；这里不碰客户端设置默认值。
import { mkdir, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { checkBudget, estimate as estimateCost } from './budget.js'
import { fail } from './errors.js'
import { createJobs, hashParams } from './jobs.js'
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

    await writeAtomic(
      join(dir, 'batch.json'),
      JSON.stringify(
        {
          kind: 'cloud',
          id: job.id,
          assetId: job.assetId,
          styleId: job.styleId,
          prompt: job.prompt,
          size: job.size,
          params: job.params,
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

  async function runJob(job, { config, key, asset, estimated, reference }) {
    jobs.update(job.id, { status: 'preparing' })
    let imageBuffer
    try {
      imageBuffer = await readFile(asset.path)
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

    const { assetId, styleId, prompt, size, params } = body
    if (typeof assetId !== 'string' || !assetId) fail('assetId 无效')
    if (typeof styleId !== 'string' || !STYLE_ID_RE.test(styleId)) fail('styleId 无效')
    if (typeof prompt !== 'string' || !prompt.trim()) fail('prompt 不能为空')
    if (prompt.length > 32000) fail('prompt 太长')
    if (typeof size !== 'string' || !isValidSize(size)) fail('size 需要 WxH 或 1K/2K/4K')
    if (params !== undefined && (params === null || typeof params !== 'object' || Array.isArray(params))) {
      fail('params 无效')
    }

    const asset = await storage.getAsset(assetId)
    if (!asset) fail('原图不存在', 404)

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
      assetId,
      styleId,
      prompt: cleanPrompt,
      size,
      params: params ?? {},
      model: config.model,
      paramsHash: hashParams({ prompt: cleanPrompt, size, params: params ?? {} }),
    })

    // 异步执行；错误全部收敛到 job.status，不会冒泡成未处理异常。
    setImmediate(() => {
      runJob(job, { config, key, asset, estimated, reference: extras.reference }).catch((err) => {
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

  function cancelJob(id) {
    const job = jobs.get(id)
    if (!job) fail('作业不存在', 404)
    if (job.requestSentAt) fail('请求已发出，不能取消；可能已生成并计费', 409)
    const next = jobs.cancel(id)
    return next
  }

  async function usage() {
    return ledger.summary(clock())
  }

  return { createJob, createTextJob, getJob, usage, ledger, jobs }
}
