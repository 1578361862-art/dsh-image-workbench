// 本机持久化：原图去重、批次落盘、历史索引、ZIP 导出组装。
// 所有路径都由固定根目录 + 校验过的 id/文件名拼出，渲染结果绝不接受调用方给的路径。
import { createHash, randomBytes } from 'node:crypto'
import { chmod, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import { fail } from './errors.js'
import { createZip } from './zip.js'

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024
export const MAX_EXPORT_BYTES = 80 * 1024 * 1024
const MAX_BATCH_RESULTS = 50
const MAX_EXPORT_FILES = 500
const ASSET_ID_RE = /^[a-f0-9]{16}$/
const BATCH_ID_RE = /^[A-Za-z0-9_-]{1,64}$/
const STYLE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/
const PACK_ID_RE = /^[a-z0-9][a-z0-9-]{1,32}$/
const PACK_BASES = new Set(['halftone', 'duotone', 'riso', 'cyanotype', 'film', 'poster'])
const BUILTIN_IDS = new Set(['halftone', 'duotone', 'riso', 'cyanotype', 'film', 'poster', 'h3-illus', 'h3-silver'])

const MIME_EXT = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])

export function sha256Hex(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

/**
 * 解析 data URL。返回 { buffer, mime, ext }；解码后超过 maxBytes 抛 413。
 */
export function parseDataUrl(dataUrl, { maxBytes = MAX_IMAGE_BYTES, allowedMimes = [...MIME_EXT.keys()] } = {}) {
  if (typeof dataUrl !== 'string') fail('dataUrl 无效')
  const match = /^data:([^;,]+)((?:;[^,]*)?),(.*)$/s.exec(dataUrl)
  if (!match) fail('dataUrl 格式无效')
  const mime = match[1].trim().toLowerCase()
  const params = match[2] ?? ''
  const payload = match[3] ?? ''
  if (!MIME_EXT.has(mime) || !allowedMimes.includes(mime)) fail('只支持 JPEG / PNG / WebP 图片')

  let buffer
  if (/;base64(?:;|$)/i.test(params)) {
    const normalized = payload.replace(/\s+/g, '').replaceAll('-', '+').replaceAll('_', '/')
    if (!/^[A-Za-z0-9+/=]*$/.test(normalized)) fail('dataUrl 不是有效的 base64')
    buffer = Buffer.from(normalized, 'base64')
  } else {
    try {
      buffer = Buffer.from(decodeURIComponent(payload), 'binary')
    } catch {
      fail('dataUrl 不是有效的图片数据')
    }
  }
  if (!buffer?.length) fail('图片内容为空')
  if (buffer.length > maxBytes) fail('图片太大', 413)
  return { buffer, mime, ext: MIME_EXT.get(mime) }
}

export function safeFileName(name, fallback = 'file') {
  let base = String(name ?? '').split(/[\\/]/).pop() ?? ''
  base = base
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '_')
    .replace(/^\.+/, '')
    .trim()
  if (!base) base = fallback
  if (Buffer.byteLength(base, 'utf8') > 180) {
    const dot = base.lastIndexOf('.')
    const ext = dot > 0 && base.length - dot <= 12 ? base.slice(dot) : ''
    const stem = ext ? base.slice(0, dot) : base
    let trimmed = stem
    while (trimmed.length > 1 && Buffer.byteLength(trimmed + ext, 'utf8') > 180) {
      trimmed = trimmed.slice(0, -1)
    }
    base = trimmed + ext
  }
  return base
}

function uniqueName(name, used) {
  if (!used.has(name)) {
    used.add(name)
    return name
  }
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  let index = 2
  while (used.has(`${stem}-${index}${ext}`)) index += 1
  const next = `${stem}-${index}${ext}`
  used.add(next)
  return next
}

function displayName(name, ext) {
  const cleaned = String(name ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 200)
  return cleaned || `image.${ext}`
}

function dimension(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0 || n > 100000) return 0
  return Math.round(n)
}

async function writeAtomic(path, data, mode = 0o644) {
  await mkdir(dirname(path), { recursive: true })
  const tmp = `${path}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`
  try {
    await writeFile(tmp, data, { mode })
    await chmod(tmp, mode)
    await rename(tmp, path)
  } catch (err) {
    await rm(tmp, { force: true }).catch(() => {})
    throw err
  }
}

export { writeAtomic }

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (err) {
    if (err.code === 'ENOENT' || err instanceof SyntaxError) return null
    throw err
  }
}

async function dirBytes(dir) {
  let total = 0
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return 0
  }
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) total += await dirBytes(path)
    else if (entry.isFile()) {
      try {
        total += (await stat(path)).size
      } catch {
        // 文件刚好被删掉：忽略，不影响用量统计
      }
    }
  }
  return total
}

function assetUrl(id) {
  return `/image-workbench/asset/${id}`
}

function resultUrl(batchId, styleId) {
  return `/image-workbench/result/${batchId}/${styleId}.jpg`
}

export function createStorage(root) {
  const libraryRoot = join(root, 'library')
  const stylesRoot = join(root, 'styles')
  const outputsRoot = join(root, 'outputs')
  const indexFile = join(root, 'index.jsonl')
  let indexChain = Promise.resolve()

  function withIndexLock(task) {
    const run = indexChain.then(task, task)
    indexChain = run.then(
      () => {},
      () => {},
    )
    return run
  }

  async function readIndexRows() {
    let text
    try {
      text = await readFile(indexFile, 'utf8')
    } catch (err) {
      if (err.code === 'ENOENT') return []
      throw err
    }
    const rows = []
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const row = JSON.parse(trimmed)
        if (row && typeof row === 'object' && typeof row.id === 'string' && row.id) rows.push(row)
      } catch {
        // 容忍半截/损坏的历史行
      }
    }
    return rows
  }

  async function writeIndexRows(rows) {
    const body = rows.length ? `${rows.map((row) => JSON.stringify(row)).join('\n')}\n` : ''
    await writeAtomic(indexFile, body, 0o644)
  }

  function assetPath(id) {
    if (!ASSET_ID_RE.test(id)) return null
    return {
      dir: join(libraryRoot, id),
      meta: join(libraryRoot, id, 'meta.json'),
    }
  }

  async function getAsset(id) {
    const paths = assetPath(id)
    if (!paths) return null
    const meta = await readJson(paths.meta)
    if (!meta || meta.id !== id || typeof meta.sha256 !== 'string') return null
    if (meta.sha256.slice(0, 16) !== id) return null
    const ext = MIME_EXT.get(meta.mime)
    if (!ext) return null
    return {
      meta,
      path: join(paths.dir, `original.${ext}`),
      url: assetUrl(id),
    }
  }

  async function putAsset({ dataUrl, name, w, h } = {}) {
    const { buffer, mime, ext } = parseDataUrl(dataUrl)
    const sha256 = sha256Hex(buffer)
    const id = sha256.slice(0, 16)
    const dir = join(libraryRoot, id)
    const metaPath = join(dir, 'meta.json')

    const previous = await readJson(metaPath)
    if (previous) {
      if (previous.sha256 !== sha256) fail('资产哈希冲突', 500)
      return { dedupe: true, meta: previous, url: assetUrl(id) }
    }

    const meta = {
      id,
      name: displayName(name, ext),
      mime,
      bytes: buffer.length,
      w: dimension(w),
      h: dimension(h),
      sha256,
      createdAt: new Date().toISOString(),
    }
    await mkdir(dir, { recursive: true })
    await writeAtomic(join(dir, `original.${ext}`), buffer, 0o644)
    await writeAtomic(metaPath, JSON.stringify(meta, null, 2), 0o644)
    return { dedupe: false, meta, url: assetUrl(id) }
  }

  async function appendIndexRow(row) {
    return withIndexLock(async () => {
      const rows = await readIndexRows()
      rows.push(row)
      await writeIndexRows(rows)
    })
  }

  async function createBatch(body = {}) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) fail('请求内容无效')
    const { assetId, text, frame, results } = body
    const asset = await getAsset(assetId)
    if (!asset) fail('原图不存在', 404)

    const textIsObject = text !== null && typeof text === 'object' && !Array.isArray(text)
    if (typeof text !== 'string' && !textIsObject) fail('text 必须是字符串或对象')
    let textLength
    try {
      textLength = typeof text === 'string' ? text.length : JSON.stringify(text).length
    } catch {
      fail('text 无效')
    }
    if (textLength > 20000) fail('text 太长')

    if (frame !== undefined && (typeof frame !== 'string' || frame.length > 32)) fail('frame 无效')
    const safeFrame = typeof frame === 'string' && frame ? frame : '3:2'

    if (!Array.isArray(results) || results.length === 0) fail('results 不能为空')
    if (results.length > MAX_BATCH_RESULTS) fail(`单批最多 ${MAX_BATCH_RESULTS} 张结果`)

    const batchId = `b${Date.now().toString(36)}${randomBytes(3).toString('hex')}`
    const createdAt = new Date().toISOString()
    const seen = new Set()
    const saved = []

    const batchDir = join(outputsRoot, batchId)
    await mkdir(batchDir, { recursive: true })
    try {
      for (const [index, item] of results.entries()) {
        if (!item || typeof item !== 'object') fail(`第 ${index + 1} 个结果无效`)
        const styleId = item.styleId
        if (typeof styleId !== 'string' || !STYLE_ID_RE.test(styleId)) fail(`第 ${index + 1} 个 styleId 无效`)
        if (seen.has(styleId)) fail(`styleId 重复: ${styleId}`)
        seen.add(styleId)

        const { buffer } = parseDataUrl(item.dataUrl, { allowedMimes: ['image/jpeg'] })
        const params = item.params === undefined ? {} : item.params
        if (!params || typeof params !== 'object' || Array.isArray(params)) fail(`第 ${index + 1} 个 params 无效`)

        const file = join(batchDir, `${styleId}.jpg`)
        await writeAtomic(file, buffer, 0o644)
        saved.push({
          styleId,
          params,
          w: dimension(item.w),
          h: dimension(item.h),
          url: resultUrl(batchId, styleId),
        })
      }
    } catch (err) {
      await rm(batchDir, { recursive: true, force: true }).catch(() => {})
      throw err
    }

    const batch = { id: batchId, assetId, frame: safeFrame, text, createdAt, results: saved }
    await writeAtomic(join(outputsRoot, batchId, 'batch.json'), JSON.stringify(batch, null, 2), 0o644)
    await appendIndexRow({
      id: batchId,
      createdAt,
      assetId,
      sourceName: asset.meta.name,
      styleIds: saved.map((item) => item.styleId),
      results: saved.map((item) => ({ styleId: item.styleId, url: item.url })),
    })

    return {
      id: batchId,
      createdAt,
      source: {
        id: asset.meta.id,
        name: asset.meta.name,
        w: asset.meta.w,
        h: asset.meta.h,
        url: asset.url,
      },
      text,
      frame: safeFrame,
      results: saved,
    }
  }

  async function indexCloudJob({ id, createdAt, assetId, styleIds, results }) {
    if (typeof id !== 'string' || !BATCH_ID_RE.test(id)) fail('批次 id 无效')
    return withIndexLock(async () => {
      const rows = await readIndexRows()
      if (rows.some((row) => row.id === id)) return false
      rows.push({
        id,
        createdAt: typeof createdAt === 'string' ? createdAt : new Date().toISOString(),
        assetId: typeof assetId === 'string' ? assetId : '',
        sourceName: '',
        styleIds: Array.isArray(styleIds) ? styleIds : [],
        results: Array.isArray(results) ? results : [],
      })
      await writeIndexRows(rows)
      return true
    })
  }

  async function backfillCloudIndex() {
    let entries = []
    try {
      entries = await readdir(outputsRoot, { withFileTypes: true })
    } catch {
      return 0
    }
    let added = 0
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const batch = await readJson(join(outputsRoot, entry.name, 'batch.json')).catch(() => null)
      if (!batch || batch.kind !== 'cloud' || batch.id !== entry.name) continue
      if (!Array.isArray(batch.results) || batch.results.length === 0) continue
      const indexed = await indexCloudJob({
        id: batch.id,
        createdAt: batch.createdAt,
        assetId: batch.assetId,
        styleIds: batch.results.map((item) => item.styleId).filter(Boolean),
        results: batch.results.map((item) => ({ styleId: item.styleId, url: item.url })),
      })
      if (indexed) added += 1
    }
    return added
  }

  function sanitizePack(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) fail('风格包内容无效')
    const id = String(input.id ?? '').trim()
    if (!PACK_ID_RE.test(id)) fail('风格包 id 需为 2–33 位小写字母/数字/连字符')
    if (BUILTIN_IDS.has(id)) fail('不能覆盖内置风格 id')
    const name = String(input.name ?? '').trim().slice(0, 40)
    if (!name) fail('风格包 name 不能为空')
    const base = String(input.base ?? '').trim()
    if (!PACK_BASES.has(base)) fail('base 必须是内置本机风格')
    const params = input.params && typeof input.params === 'object' && !Array.isArray(input.params) ? input.params : {}
    const clean = {}
    if (Number.isFinite(Number(params.strength))) clean.strength = Math.min(1, Math.max(0, Number(params.strength)))
    if (Number.isFinite(Number(params.grain))) clean.grain = Math.min(1, Math.max(0, Number(params.grain)))
    if (['vermilion', 'indigo', 'ink'].includes(params.ink)) clean.ink = params.ink
    if (['640', '960', '1200'].includes(params.size)) clean.size = params.size
    let preview = ''
    if (typeof input.preview === 'string' && input.preview.startsWith('data:image/')) {
      const parsed = parseDataUrl(input.preview, { maxBytes: 2 * 1024 * 1024, allowedMimes: [...MIME_EXT.keys()] })
      preview = `data:${parsed.mime};base64,${parsed.buffer.toString('base64')}`
    }
    return {
      schema: 1,
      id,
      name,
      renderer: 'preset',
      base,
      params: clean,
      preview,
      createdAt: new Date().toISOString(),
    }
  }

  async function listStyles() {
    let entries = []
    try {
      entries = await readdir(stylesRoot, { withFileTypes: true })
    } catch {
      return []
    }
    const styles = []
    for (const entry of entries) {
      if (!entry.isDirectory() || !PACK_ID_RE.test(entry.name)) continue
      const style = await readJson(join(stylesRoot, entry.name, 'style.json'))
      if (style && style.id === entry.name && style.renderer === 'preset') styles.push(style)
    }
    return styles.sort((a, b) => String(a.name).localeCompare(String(b.name), 'zh'))
  }

  async function putStyle(input) {
    const style = sanitizePack(input)
    const dir = join(stylesRoot, style.id)
    await mkdir(dir, { recursive: true })
    await writeAtomic(join(dir, 'style.json'), JSON.stringify(style, null, 2), 0o644)
    return style
  }

  async function getBatch(id) {
    if (typeof id !== 'string' || !BATCH_ID_RE.test(id)) return null
    const batch = await readJson(join(outputsRoot, id, 'batch.json'))
    if (!batch || typeof batch !== 'object' || batch.id !== id) return null
    return batch
  }

  async function sourceFor(assetId, fallbackName) {
    const asset = await getAsset(assetId)
    if (asset) {
      return { id: asset.meta.id, name: asset.meta.name, w: asset.meta.w, h: asset.meta.h, url: asset.url }
    }
    return {
      id: typeof assetId === 'string' ? assetId : '',
      name: typeof fallbackName === 'string' ? fallbackName : '',
      w: 0,
      h: 0,
      url: typeof assetId === 'string' && ASSET_ID_RE.test(assetId) ? assetUrl(assetId) : '',
    }
  }

  async function historyEntry(row) {
    const batch = await getBatch(row.id)
    if (batch) {
      const text =
        typeof batch.text === 'string' || (batch.text && typeof batch.text === 'object' && !Array.isArray(batch.text))
          ? batch.text
          : ''
      return {
        id: batch.id,
        createdAt: batch.createdAt ?? row.createdAt ?? '',
        source: await sourceFor(batch.assetId ?? row.assetId, row.sourceName),
        text,
        frame: typeof batch.frame === 'string' && batch.frame ? batch.frame : '3:2',
        results: Array.isArray(batch.results) ? batch.results : [],
      }
    }
    const results = Array.isArray(row.results)
      ? row.results.map((item) => ({
          styleId: item?.styleId ?? '',
          params: {},
          w: 0,
          h: 0,
          url: typeof item?.url === 'string' ? item.url : '',
        }))
      : []
    return {
      id: row.id,
      createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
      source: await sourceFor(row.assetId, row.sourceName),
      text: '',
      frame: typeof row.frame === 'string' && row.frame ? row.frame : '3:2',
      results,
    }
  }

  async function listHistory(limit = 20) {
    const parsed = Number(limit)
    const take = Number.isFinite(parsed) ? Math.min(100, Math.max(1, Math.floor(parsed))) : 20
    const rows = await readIndexRows()
    const byId = new Map()
    for (const row of rows) byId.set(row.id, row)
    const ordered = [...byId.values()].sort((a, b) => {
      const left = Date.parse(a.createdAt ?? '') || 0
      const right = Date.parse(b.createdAt ?? '') || 0
      return right - left
    })
    const page = ordered.slice(0, take)
    const entries = []
    for (const row of page) entries.push(await historyEntry(row))
    return { entries, total: ordered.length }
  }

  async function deleteBatch(id) {
    if (typeof id !== 'string' || !BATCH_ID_RE.test(id)) fail('批次 id 无效')
    await rm(join(outputsRoot, id), { recursive: true, force: true })
    await withIndexLock(async () => {
      const rows = await readIndexRows()
      await writeIndexRows(rows.filter((row) => row.id !== id))
    })
    return { ok: true }
  }

  function resultPath(batchId, styleId) {
    if (typeof batchId !== 'string' || !BATCH_ID_RE.test(batchId)) return null
    if (typeof styleId !== 'string' || !STYLE_ID_RE.test(styleId)) return null
    const base = resolve(outputsRoot)
    const path = resolve(base, batchId, `${styleId}.jpg`)
    if (path !== join(base, batchId, `${styleId}.jpg`) || !path.startsWith(base + sep)) return null
    return path
  }

  async function exportZip(files, manifest) {
    if (!Array.isArray(files)) fail('files 必须是数组')
    if (files.length > MAX_EXPORT_FILES) fail(`单次最多导出 ${MAX_EXPORT_FILES} 个文件`)
    if (manifest !== undefined && manifest !== null) {
      if (typeof manifest !== 'object' || Array.isArray(manifest)) fail('manifest 必须是对象')
    }
    const used = new Set()
    const entries = []
    let total = 0
    for (const [index, file] of files.entries()) {
      if (!file || typeof file !== 'object') fail(`第 ${index + 1} 个文件无效`)
      const { buffer } = parseDataUrl(file.dataUrl, { maxBytes: MAX_EXPORT_BYTES })
      total += buffer.length
      if (total > MAX_EXPORT_BYTES) fail('导出内容太大', 413)
      const name = uniqueName(safeFileName(file.name, `image-${index + 1}.jpg`), used)
      entries.push({ name: `results/${name}`, data: buffer })
    }
    const manifestBody = `${JSON.stringify(manifest ?? {}, null, 2)}\n`
    entries.push({ name: 'manifest.json', data: Buffer.from(manifestBody, 'utf8') })
    return { buffer: createZip(entries), count: files.length }
  }

  async function cleanupOld({ days = 90, now = new Date() } = {}) {
    const keepDays = Number(days)
    if (!Number.isFinite(keepDays) || keepDays < 1 || keepDays > 3650) fail('清理天数要在 1–3650 之间')
    const cutoff = now.getTime() - Math.floor(keepDays) * 86_400_000
    const removed = { batches: 0, assets: 0, jobs: 0, bytes: 0 }
    await withIndexLock(async () => {
      const rows = await readIndexRows()
      const keep = []
      const referenced = new Set()
      for (const row of rows) {
        const at = Date.parse(row.createdAt ?? '')
        if (Number.isFinite(at) && at < cutoff) {
          const dir = join(outputsRoot, row.id)
          removed.bytes += await dirBytes(dir).catch(() => 0)
          await rm(dir, { recursive: true, force: true })
          removed.batches += 1
        } else {
          keep.push(row)
          if (typeof row.assetId === 'string') referenced.add(row.assetId)
        }
      }
      await writeIndexRows(keep)

      let assets = []
      try { assets = await readdir(libraryRoot, { withFileTypes: true }) } catch { assets = [] }
      for (const entry of assets) {
        if (!entry.isDirectory() || !ASSET_ID_RE.test(entry.name)) continue
        const meta = await readJson(join(libraryRoot, entry.name, 'meta.json'))
        if (!meta || referenced.has(entry.name)) continue
        const at = Date.parse(meta.createdAt ?? '')
        if (!Number.isFinite(at) || at >= cutoff) continue
        removed.bytes += await dirBytes(join(libraryRoot, entry.name)).catch(() => 0)
        await rm(join(libraryRoot, entry.name), { recursive: true, force: true })
        removed.assets += 1
      }

      let jobs = []
      try { jobs = await readdir(join(root, 'jobs'), { withFileTypes: true }) } catch { jobs = [] }
      for (const entry of jobs) {
        if (!entry.isFile() || !entry.name.endsWith('.json')) continue
        const job = await readJson(join(root, 'jobs', entry.name))
        if (!job || !['succeeded', 'failed', 'unknown', 'canceled'].includes(job.status)) continue
        const at = Date.parse(job.updatedAt ?? job.createdAt ?? '')
        if (!Number.isFinite(at) || at >= cutoff) continue
        await rm(join(root, 'jobs', entry.name), { force: true })
        removed.jobs += 1
      }
    })
    return { days: Math.floor(keepDays), cutoff: new Date(cutoff).toISOString(), ...removed }
  }

  async function stats() {
    let entries = []
    try {
      entries = await readdir(libraryRoot, { withFileTypes: true })
    } catch {
      entries = []
    }
    let count = 0
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (await stat(join(libraryRoot, entry.name, 'meta.json')).catch(() => null)) count += 1
    }
    const bytes = (await dirBytes(libraryRoot)) + (await dirBytes(outputsRoot))
    return { dir: root, count, bytes }
  }

  return {
    root,
    putAsset,
    getAsset,
    createBatch,
    getBatch,
    indexCloudJob,
    backfillCloudIndex,
    listStyles,
    putStyle,
    listHistory,
    cleanupOld,
    deleteBatch,
    resultPath,
    exportZip,
    stats,
    readIndexRows,
  }
}
