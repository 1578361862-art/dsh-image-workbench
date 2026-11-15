// MiniMax H3-Image 编辑接口（POST /v1/images/edits，multipart）。
// 关键约束：非幂等、超时不重试、URL 结果立即下载；错误里绝不带 Key。
import { Buffer } from 'node:buffer'

export const MODEL_STANDARD = 'MiniMax-H3-Image'
export const MODEL_HIGHSPEED = 'MiniMax-H3-Image-Highspeed'
export const BASES = Object.freeze({
  cn: 'https://api.minimax.cn',
  intl: 'https://api.minimax.io',
})
export const DEFAULT_TIMEOUT_MS = 600_000

const SIZE_RE = /^(\d{2,5})x(\d{2,5})$/i
const AREA_MIN = 655_360
const AREA_MAX = 20_000_000

export function baseUrlFor(config = {}) {
  return config.base === 'intl' ? BASES.intl : BASES.cn
}

export function modelFor(speed) {
  return speed === 'highspeed' ? MODEL_HIGHSPEED : MODEL_STANDARD
}

export function redactKey(text, key) {
  let out = String(text ?? '')
  if (key) out = out.split(String(key)).join('***')
  out = out.replace(/Bearer\s+[A-Za-z0-9._\-+/=]+/gi, 'Bearer ***')
  return out
}

export function sniffMime(buffer, fallback = 'image/jpeg') {
  if (!buffer || buffer.length < 12) return fallback
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png'
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  return fallback
}

function mimeForFormat(format, buffer) {
  const value = String(format ?? '').toLowerCase()
  if (value === 'png') return 'image/png'
  if (value === 'webp') return 'image/webp'
  if (value === 'jpeg' || value === 'jpg') return 'image/jpeg'
  return sniffMime(buffer)
}

function extForMime(mime) {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

function makeError(message, { code = 'unknown', status = 0, unknown = false, beforeRequest = false, cause } = {}) {
  const err = new Error(message)
  err.code = code
  err.status = status
  err.unknown = unknown
  err.beforeRequest = beforeRequest
  err.retryable = false
  if (cause) err.cause = cause
  return err
}

export function isValidSize(size) {
  return validateSize(size) !== null
}

function validateSize(size) {
  const value = String(size ?? '').trim()
  if (value === 'auto') return { mode: 'auto' }
  if (/^(1k|2k|4k)$/i.test(value)) return { mode: 'area', area: value.toUpperCase() }
  const match = SIZE_RE.exec(value)
  if (!match) return null
  const width = Number(match[1])
  const height = Number(match[2])
  const area = width * height
  const ratio = Math.max(width, height) / Math.min(width, height)
  if (area < AREA_MIN || area > AREA_MAX) return null
  if (ratio > 3) return null
  return { mode: 'exact', width, height, value: `${width}x${height}` }
}

function classifyStatus(status, text, payload) {
  if (status === 401 || status === 403) return { code: 'auth', unknown: false }
  if (status === 402) return { code: 'insufficient_balance', unknown: false }
  if (status === 429) return { code: 'rate_limited', unknown: false }
  if (status === 422) return { code: 'content_safety', unknown: false }
  if (status === 400) {
    return { code: /safety|sensitive|1026|1027/i.test(text) ? 'content_safety' : 'invalid_request', unknown: false }
  }
  // 502/503/504：网关层失败，上游可能已经生成并计费，按 unknown 处理。
  if (status === 502 || status === 503 || status === 504) return { code: 'upstream_unavailable', unknown: true }
  // 500：官方文档说明“所有图片都失败”时返回 500，未成功的不计费。
  if (status >= 500) return { code: 'server_error', unknown: false }
  return { code: 'http_error', unknown: false }
}

function errorMessageFromPayload(payload, fallback) {
  if (typeof payload?.error?.message === 'string') return payload.error.message
  if (typeof payload?.error === 'string') return payload.error
  if (typeof payload?.base_resp?.status_msg === 'string') return payload.base_resp.status_msg
  return fallback
}

function perImageError(item, key) {
  if (!item?.error) return null
  const code = String(item.error.code ?? '')
  const mapped = code === '1026' || code === '1027' ? 'content_safety' : code === '1008' ? 'insufficient_balance' : 'generation_failed'
  return makeError(redactKey(item.error.message || `图片生成失败（${code || 'unknown'}）`, key), {
    code: mapped,
    unknown: false,
  })
}

/**
 * 生成一次编辑结果。只调用一次，不重试。
 * @param {object} options
 * @returns {Promise<{ buffer: Buffer, mime: string, revisedPrompt: string|null, usage: object|null, rawMeta: object }>}
 */
export async function generateEdit({
  imageBuffer,
  mime = 'image/jpeg',
  referenceBuffer,
  referenceMime,
  extraBuffers = [],
  prompt,
  size = '2K',
  key,
  baseUrl,
  speed = 'standard',
  timeoutMs = DEFAULT_TIMEOUT_MS,
  downloadTimeoutMs = 120_000,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof key !== 'string' || !key.trim()) {
    throw makeError('还没有保存 API Key', { code: 'missing_key', status: 400, beforeRequest: true })
  }
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw makeError('原图内容为空', { code: 'invalid_image', status: 400, beforeRequest: true })
  }
  if (typeof prompt !== 'string' || !prompt.trim()) {
    throw makeError('提示词不能为空', { code: 'invalid_prompt', status: 400, beforeRequest: true })
  }
  const checkedSize = validateSize(size)
  if (!checkedSize) {
    throw makeError('size 需要 WxH（面积 655360–20000000，比例 1:3–3:1）或 1K/2K/4K', {
      code: 'invalid_size',
      status: 400,
      beforeRequest: true,
    })
  }

  const endpoint = `${String(baseUrl || BASES.cn).replace(/\/+$/, '')}/v1/images/edits`
  const model = modelFor(speed)
  const form = new FormData()
  form.append('model', model)
  form.append('prompt', prompt)
  if (checkedSize.mode === 'area') {
    form.append('size', 'auto')
    form.append('area', checkedSize.area)
  } else {
    form.append('size', checkedSize.mode === 'auto' ? 'auto' : checkedSize.value)
  }
  form.append('response_format', 'url')
  form.append('output_format', 'jpeg')
  form.append('n', '1')
  form.append('image', new Blob([imageBuffer], { type: mime }), `source.${extForMime(mime)}`)
  for (let i = 0; i < extraBuffers.length; i++) {
    const buf = extraBuffers[i]
    if (!Buffer.isBuffer(buf) || !buf.length) continue
    const mime = sniffMime(buf)
    form.append('image', new Blob([buf], { type: mime }), `reference-${i + 2}.${extForMime(mime)}`)
  }
  if (Buffer.isBuffer(referenceBuffer) && referenceBuffer.length) {
    const refMime = referenceMime || sniffMime(referenceBuffer)
    form.append('image', new Blob([referenceBuffer], { type: refMime }), `reference.${extForMime(refMime)}`)
  }

  let response
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${key.trim()}` },
      body: form,
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError'
    throw makeError(
      timedOut
        ? `请求已发出，${Math.round(timeoutMs / 1000)} 秒内没有响应；可能已生成并计费，请不要自动重试`
        : '请求已发出但连接中断；可能已生成并计费，请不要自动重试',
      {
        code: timedOut ? 'timeout' : 'network',
        unknown: true,
        cause: err,
      },
    )
  }

  const responseText = await response.text().catch(() => '')
  let payload = null
  try {
    payload = responseText ? JSON.parse(responseText) : null
  } catch {
    payload = null
  }

  if (!response.ok) {
    const classification = classifyStatus(response.status, responseText, payload)
    const message = redactKey(errorMessageFromPayload(payload, responseText || `MiniMax 返回 HTTP ${response.status}`), key).slice(0, 500)
    throw makeError(message || `MiniMax 返回 HTTP ${response.status}`, {
      code: classification.code,
      status: response.status,
      unknown: classification.unknown,
    })
  }
  if (!payload || typeof payload !== 'object') {
    throw makeError('MiniMax 返回的响应不是有效 JSON', { code: 'bad_response', status: response.status, unknown: true })
  }
  if (payload.base_resp?.status_code && payload.base_resp.status_code !== 0) {
    throw makeError(redactKey(payload.base_resp.status_msg || 'MiniMax 返回错误', key), {
      code: 'api_error',
      status: 0,
      unknown: false,
    })
  }

  const item = Array.isArray(payload.data) ? payload.data[0] : null
  if (!item) {
    throw makeError('MiniMax 响应里没有图片结果', { code: 'bad_response', status: response.status, unknown: true })
  }
  const imageFailure = perImageError(item, key)
  if (imageFailure) throw imageFailure

  const outputFormat = payload.output_format ?? null
  let buffer = null
  let outMime = null

  if (item.url) {
    try {
      const download = await fetchImpl(item.url, { signal: AbortSignal.timeout(downloadTimeoutMs) })
      if (!download.ok) throw new Error(`HTTP ${download.status}`)
      buffer = Buffer.from(await download.arrayBuffer())
      const header = String(download.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
      outMime = header.startsWith('image/') ? header : mimeForFormat(outputFormat, buffer)
    } catch (err) {
      if (!item.b64_json) {
        throw makeError('图片已生成但下载失败；可能已计费，请到 MiniMax 控制台核对', {
          code: 'download_failed',
          unknown: true,
          cause: err,
        })
      }
    }
  }
  if (!buffer && item.b64_json) {
    buffer = Buffer.from(String(item.b64_json), 'base64')
    outMime = mimeForFormat(outputFormat, buffer)
  }
  if (!buffer?.length) {
    throw makeError('MiniMax 响应里没有可用的图片数据', { code: 'bad_response', status: response.status, unknown: true })
  }

  return {
    buffer,
    mime: outMime || sniffMime(buffer),
    revisedPrompt: item.revised_prompt ?? payload.revised_prompt ?? null,
    usage: payload.usage ?? item.usage ?? null,
    rawMeta: {
      requestId: payload.request_id ?? item.id ?? null,
      status: response.status,
      model,
      speed,
      size: item.size ?? checkedSize.value ?? checkedSize.area ?? 'auto',
      outputFormat: outputFormat ?? null,
      createdAt: payload.created ?? null,
    },
  }
}


/**
 * Context-IR 预览：只返回模型改写后的提示词/宽高比，不出图。
 * 只调用一次；官方端点或字段差异会原样报错，不伪造成功。
 */
export async function generateContextIR({
  prompt,
  key,
  baseUrl,
  model = 'MiniMax-H3-Image',
  timeoutMs = 60_000,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof key !== 'string' || !key.trim()) {
    throw makeError('还没有保存 API Key', { code: 'missing_key', status: 400, beforeRequest: true })
  }
  if (typeof prompt !== 'string' || !prompt.trim()) {
    throw makeError('提示词不能为空', { code: 'invalid_prompt', status: 400, beforeRequest: true })
  }
  const endpoint = `${String(baseUrl || BASES.cn).replace(/\/+$/, '')}/v1/h3_image_context_ir`
  let response
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: prompt.trim(), model }),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    throw makeError(redactKey(err?.name === 'TimeoutError' ? 'Context-IR 请求超时' : 'Context-IR 网络失败', key), {
      code: err?.name === 'TimeoutError' ? 'timeout' : 'network',
      unknown: true,
      cause: err,
    })
  }
  let payload = null
  try { payload = await response.json() } catch { payload = null }
  if (!response.ok) {
    const mapped = classifyStatus(response.status, JSON.stringify(payload ?? {}), payload)
    throw makeError(redactKey(errorMessageFromPayload(payload, `Context-IR HTTP ${response.status}`), key), {
      code: mapped.code,
      status: response.status,
      unknown: mapped.unknown,
    })
  }
  const revisedPrompt = payload?.revised_prompt ?? payload?.revisedPrompt ?? payload?.data?.revised_prompt ?? null
  const aspectRatio = payload?.aspect_ratio ?? payload?.aspectRatio ?? payload?.data?.aspect_ratio ?? null
  if (typeof revisedPrompt !== 'string' || !revisedPrompt.trim()) {
    throw makeError('Context-IR 没有返回 revised_prompt', { code: 'invalid_response', status: 502, unknown: true })
  }
  return { revisedPrompt, aspectRatio, usage: payload?.usage ?? null }
}

/**
 * 纯文生图：/v1/images/generations，显式关闭 Prompt 增强。
 * disable_prompt_enhanced 要求 size 为明确的 WxH。
 */
export async function generateText({
  prompt,
  size,
  key,
  baseUrl,
  speed = 'standard',
  timeoutMs = DEFAULT_TIMEOUT_MS,
  downloadTimeoutMs = 120_000,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof key !== 'string' || !key.trim()) {
    throw makeError('还没有保存 API Key', { code: 'missing_key', status: 400, beforeRequest: true })
  }
  if (typeof prompt !== 'string' || !prompt.trim()) {
    throw makeError('提示词不能为空', { code: 'invalid_prompt', status: 400, beforeRequest: true })
  }
  const checkedSize = validateSize(size)
  if (!checkedSize || checkedSize.mode !== 'exact') {
    throw makeError('关闭 Prompt 增强时，文生图 size 必须是 WxH', {
      code: 'invalid_size',
      status: 400,
      beforeRequest: true,
    })
  }
  const endpoint = `${String(baseUrl || BASES.cn).replace(/\/+$/, '')}/v1/images/generations`
  const model = modelFor(speed)
  let response
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key.trim()}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: prompt.trim(),
        size: checkedSize.value,
        disable_prompt_enhanced: true,
        response_format: 'url',
        output_format: 'jpeg',
        n: 1,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError'
    throw makeError(
      timedOut
        ? `请求已发出，${Math.round(timeoutMs / 1000)} 秒内没有响应；可能已生成并计费，请不要自动重试`
        : '请求已发出但连接中断；可能已生成并计费，请不要自动重试',
      { code: timedOut ? 'timeout' : 'network', unknown: true, cause: err },
    )
  }
  const responseText = await response.text().catch(() => '')
  let payload = null
  try { payload = responseText ? JSON.parse(responseText) : null } catch { payload = null }
  if (!response.ok) {
    const classification = classifyStatus(response.status, responseText, payload)
    const message = redactKey(errorMessageFromPayload(payload, responseText || `MiniMax 返回 HTTP ${response.status}`), key).slice(0, 500)
    throw makeError(message || `MiniMax 返回 HTTP ${response.status}`, {
      code: classification.code,
      status: response.status,
      unknown: classification.unknown,
    })
  }
  if (!payload || typeof payload !== 'object') {
    throw makeError('MiniMax 返回的响应不是有效 JSON', { code: 'bad_response', status: response.status, unknown: true })
  }
  if (payload.base_resp?.status_code && payload.base_resp.status_code !== 0) {
    throw makeError(redactKey(payload.base_resp.status_msg || 'MiniMax 返回错误', key), {
      code: 'api_error', status: 0, unknown: false,
    })
  }
  const item = Array.isArray(payload.data) ? payload.data[0] : null
  if (!item) throw makeError('MiniMax 响应里没有图片结果', { code: 'bad_response', status: response.status, unknown: true })
  const imageFailure = perImageError(item, key)
  if (imageFailure) throw imageFailure

  const outputFormat = payload.output_format ?? null
  let buffer = null
  let outMime = null
  if (item.url) {
    try {
      const download = await fetchImpl(item.url, { signal: AbortSignal.timeout(downloadTimeoutMs) })
      if (!download.ok) throw new Error(`HTTP ${download.status}`)
      buffer = Buffer.from(await download.arrayBuffer())
      const header = String(download.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
      outMime = header.startsWith('image/') ? header : mimeForFormat(outputFormat, buffer)
    } catch (err) {
      if (!item.b64_json) {
        throw makeError('图片已生成但下载失败；可能已计费，请到 MiniMax 控制台核对', {
          code: 'download_failed', unknown: true, cause: err,
        })
      }
    }
  }
  if (!buffer && item.b64_json) {
    buffer = Buffer.from(String(item.b64_json), 'base64')
    outMime = mimeForFormat(outputFormat, buffer)
  }
  if (!buffer?.length) {
    throw makeError('MiniMax 响应里没有可用的图片数据', { code: 'bad_response', status: response.status, unknown: true })
  }
  return {
    buffer,
    mime: outMime || sniffMime(buffer),
    revisedPrompt: item.revised_prompt ?? payload.revised_prompt ?? null,
    usage: payload.usage ?? item.usage ?? null,
    rawMeta: {
      requestId: payload.request_id ?? item.id ?? null,
      status: response.status,
      model,
      speed,
      size: item.size ?? checkedSize.value,
      outputFormat: outputFormat ?? null,
    },
  }
}
