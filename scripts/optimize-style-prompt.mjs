#!/usr/bin/env node
// One-off authoring helper. NOT used by the runtime UI.
// Usage:
//   MINIMAX_API_KEY=... node scripts/optimize-style-prompt.mjs prompt.txt [out.json]
// Optional: MINIMAX_API_BASE=https://api.minimax.io
import { readFile, writeFile } from 'node:fs/promises'

const input = process.argv[2]
const output = process.argv[3]
if (!input) {
  console.error('usage: MINIMAX_API_KEY=... node scripts/optimize-style-prompt.mjs <prompt.txt> [out.json]')
  process.exit(2)
}
const key = process.env.MINIMAX_API_KEY
if (!key) {
  console.error('MINIMAX_API_KEY is required; this call is billed per input token.')
  process.exit(2)
}
const base = (process.env.MINIMAX_API_BASE || 'https://api.minimax.cn').replace(/\/+$/, '')
const prompt = (await readFile(input, 'utf8')).trim()
if (!prompt) {
  console.error('prompt file is empty')
  process.exit(2)
}
const res = await fetch(`${base}/v1/h3_image_context_ir`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'MiniMax-H3-Image', prompt }),
  signal: AbortSignal.timeout(600_000),
})
const text = await res.text()
let body = null
try { body = text ? JSON.parse(text) : null } catch {}
if (!res.ok) {
  console.error(`Context-IR HTTP ${res.status}: ${text.slice(0, 1000)}`)
  process.exit(1)
}
const revised = body?.revised_prompt ?? body?.revisedPrompt
if (typeof revised !== 'string' || !revised.trim()) {
  console.error('Context-IR returned no revised_prompt')
  process.exit(1)
}
const result = {
  model: 'MiniMax-H3-Image',
  usage: body?.usage ?? null,
  aspectRatio: body?.aspect_ratio ?? body?.aspectRatio ?? null,
  revisedPrompt: revised,
}
const json = JSON.stringify(result, null, 2)
if (output) await writeFile(output, json + '\n', { mode: 0o600 })
console.log(json)
