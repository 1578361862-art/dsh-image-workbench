// Volcengine Ark / Seedream image generation.
// Docs: POST https://ark.cn-beijing.volces.com/api/v3/images/generations
const DEFAULT_BASE = 'https://ark.cn-beijing.volces.com/api/v3'
const DEFAULT_MODEL = 'doubao-seedream-4-0-250828'
const SIZE_RE = /^(\d{3,5})x(\d{3,5})$/i

function apiError(message, status = 400, code = 'seedream_error') {
  return Object.assign(new Error(message), { status, code, beforeRequest: status < 500 })
}

function validateSize(size) {
  const match = SIZE_RE.exec(String(size ?? '').trim())
  if (!match) return null
  const width = Number(match[1])
  const height = Number(match[2])
  const area = width * height
  const ratio = Math.max(width, height) / Math.min(width, height)
  if (width < 128 || height < 128) return null
  if (area < 921600 || area > 16777216) return null
  if (ratio > 16) return null
  return { width, height, value: `${width}x${height}` }
}

function mimeFor(format, buffer) {
  const f = String(format ?? '').toLowerCase()
  if (f === 'png') return 'image/png'
  if (f === 'webp') return 'image/webp'
  if (f === 'jpeg' || f === 'jpg') return 'image/jpeg'
  if (buffer?.[0] === 0x89 && buffer?.[1] === 0x50) return 'image/png'
  if (buffer?.[0] === 0x52 && buffer?.[1] === 0x49) return 'image/webp'
  return 'image/jpeg'
}

export async function generateSeedream({
  prompt,
  size,
  images = [],
  key,
  baseUrl = DEFAULT_BASE,
  model = DEFAULT_MODEL,
  timeoutMs = 600_000,
  downloadTimeoutMs = 120_000,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof key !== 'string' || !key.trim()) throw apiError('还没有保存 Seedream API Key', 400, 'missing_key')
  if (typeof prompt !== 'string' || !prompt.trim()) throw apiError('提示词不能为空', 400, 'invalid_prompt')
  const checked = validateSize(size)
  if (!checked) throw apiError('Seedream size 需要 WxH，面积 921600–16777216，比例不超过 16:1', 400, 'invalid_size')
  const body = {
    model,
    prompt: prompt.trim(),
    size: checked.value,
    response_format: 'url',
    output_format: 'jpeg',
    watermark: false,
  }
  if (Array.isArray(images) && images.length) body.image = images.length === 1 ? images[0] : images

  let response
  try {
    response = await fetchImpl(`${String(baseUrl).replace(/\/+$/, '')}/images/generations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key.trim()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError'
    throw Object.assign(
      new Error(timedOut ? 'Seedream 请求超时；可能已生成并计费' : 'Seedream 网络请求失败'),
      { code: timedOut ? 'timeout' : 'network', status: 0, unknown: true, cause: err },
    )
  }
  const text = await response.text().catch(() => '')
  let payload = null
  try { payload = text ? JSON.parse(text) : null } catch { payload = null }
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || text.slice(0, 500) || `Seedream HTTP ${response.status}`
    throw apiError(message, response.status, response.status === 401 ? 'auth' : response.status === 402 ? 'insufficient_balance' : 'seedream_error')
  }
  if (!payload || typeof payload !== 'object') throw apiError('Seedream 返回的不是有效 JSON', 502, 'bad_response')
  const item = Array.isArray(payload.data) ? payload.data[0] : null
  if (!item) throw apiError('Seedream 响应里没有图片结果', 502, 'bad_response')
  if (item.error) throw apiError(item.error.message || 'Seedream 图片生成失败', 422, 'generation_failed')

  let buffer = null
  let mime = 'image/jpeg'
  if (item.url) {
    try {
      const download = await fetchImpl(item.url, { signal: AbortSignal.timeout(downloadTimeoutMs) })
      if (!download.ok) throw new Error(`HTTP ${download.status}`)
      buffer = Buffer.from(await download.arrayBuffer())
      const header = String(download.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
      mime = header.startsWith('image/') ? header : mimeFor(payload.output_format, buffer)
    } catch (err) {
      if (!item.b64_json) {
        throw Object.assign(new Error('Seedream 图片已生成但下载失败；可能已计费'), {
          code: 'download_failed', status: 0, unknown: true, cause: err,
        })
      }
    }
  }
  if (!buffer && item.b64_json) {
    buffer = Buffer.from(String(item.b64_json), 'base64')
    mime = mimeFor(payload.output_format, buffer)
  }
  if (!buffer?.length) throw apiError('Seedream 响应里没有可用的图片数据', 502, 'bad_response')
  const actual = /^(\d{3,5})x(\d{3,5})$/i.exec(String(item.size ?? ''))
  return {
    buffer,
    mime,
    revisedPrompt: item.revised_prompt ?? prompt,
    usage: payload.usage ?? null,
    rawMeta: {
      model,
      size: actual ? `${actual[1]}x${actual[2]}` : checked.value,
      requestId: payload.request_id ?? payload.id ?? null,
      status: response.status,
    },
  }
}

export { DEFAULT_MODEL as SEEDREAM_DEFAULT_MODEL, DEFAULT_BASE as SEEDREAM_DEFAULT_BASE }

/** Seedream 5.5 layer decomposition: returns remote layer URLs. */
export async function decomposeSeedream({
  imageDataUrl,
  maxImages = 30,
  key,
  baseUrl = DEFAULT_BASE,
  model = DEFAULT_MODEL,
  timeoutMs = 600_000,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof key !== 'string' || !key.trim()) throw apiError('还没有保存 Seedream API Key', 400, 'missing_key')
  if (typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) throw apiError('图层拆分需要一张图片', 400, 'invalid_image')
  const max = Math.min(100, Math.max(2, Number(maxImages) || 30))
  let response
  try {
    response = await fetchImpl(`${String(baseUrl).replace(/\/+$/, '')}/images/generations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key.trim()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: '将图片拆分为独立图层：每个可独立编辑的主体/文字/装饰元素各成一层，背景保留在底图；图层之间边界清晰，保留原文字和细节。',
        image: imageDataUrl,
        layer_decomposition: true,
        layer_decomposition_options: { max_images: max },
        response_format: 'url',
        output_format: 'png',
        watermark: false,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    throw Object.assign(new Error('Seedream 图层拆分网络失败'), { code: 'network', status: 0, unknown: true, cause: err })
  }
  const text = await response.text().catch(() => '')
  let payload = null
  try { payload = text ? JSON.parse(text) : null } catch { payload = null }
  if (!response.ok) throw apiError(payload?.error?.message || text.slice(0, 500) || `Seedream HTTP ${response.status}`, response.status)
  const items = Array.isArray(payload?.data) ? payload.data : []
  const images = items.filter(function (x) { return x && x.url }).map(function (x, i) {
    return {
      url: x.url,
      name: x.name || ('图层 ' + (i + 1)),
      index: x.z_index ?? i,
      description: x.description || '',
      textRecognition: x.text_recognition || null,
      w: x.size ? Number(String(x.size).split('x')[0]) : 0,
      h: x.size ? Number(String(x.size).split('x')[1]) : 0,
    }
  })
  if (!images.length) throw apiError('Seedream 没有返回图层', 502, 'bad_response')
  return { images, usage: payload.usage || null, model, requestId: payload.request_id || null }
}
