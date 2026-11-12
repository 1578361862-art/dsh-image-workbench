// 费用台账：JSONL 追加（tmp+rename 原子替换），读取时容忍损坏行；按本地日期汇总今日/本月花费。
import { randomBytes } from 'node:crypto'
import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

function pad(n) {
  return String(n).padStart(2, '0')
}

export function localDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function localMonthKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

function round4(value) {
  return Math.round(value * 10000) / 10000
}

function costOf(entry) {
  const value = Number(entry?.costYuan)
  return Number.isFinite(value) && value > 0 ? value : 0
}

async function writeAtomic(path, data, mode) {
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

export function createLedger(file, { clock = () => new Date() } = {}) {
  let chain = Promise.resolve()

  function withLock(task) {
    const run = chain.then(task, task)
    chain = run.then(
      () => {},
      () => {},
    )
    return run
  }

  async function readAll() {
    let text
    try {
      text = await readFile(file, 'utf8')
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
        if (row && typeof row === 'object' && !Array.isArray(row)) rows.push(row)
      } catch {
        // 损坏行不影响其余台账
      }
    }
    return rows
  }

  async function append(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('ledger entry 必须是对象')
    const { key, apiKey, authorization, ...rest } = input
    const entry = {
      ...rest,
      at: typeof rest.at === 'string' && !Number.isNaN(Date.parse(rest.at)) ? rest.at : clock().toISOString(),
      costYuan: costOf(rest),
    }
    return withLock(async () => {
      const rows = await readAll()
      rows.push(entry)
      const body = rows.length ? `${rows.map((row) => JSON.stringify(row)).join('\n')}\n` : ''
      await writeAtomic(file, body, 0o600)
      return entry
    })
  }

  async function summary(now = clock()) {
    const rows = await readAll()
    const todayKey = localDateKey(now)
    const monthKey = localMonthKey(now)
    const total = { costYuan: 0, count: 0 }
    const today = { date: todayKey, costYuan: 0, count: 0 }
    const month = { month: monthKey, costYuan: 0, count: 0 }
    const entries = []

    for (const row of rows) {
      const at = new Date(row.at)
      if (Number.isNaN(at.getTime())) continue
      const cost = costOf(row)
      total.costYuan += cost
      total.count += 1
      if (localDateKey(at) === todayKey) {
        today.costYuan += cost
        today.count += 1
      }
      if (localMonthKey(at) === monthKey) {
        month.costYuan += cost
        month.count += 1
      }
      entries.push(row)
    }

    entries.sort((a, b) => (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0))

    return {
      currency: 'CNY',
      today: { ...today, costYuan: round4(today.costYuan) },
      month: { ...month, costYuan: round4(month.costYuan) },
      total: { costYuan: round4(total.costYuan), count: total.count },
      entries: entries.slice(0, 50),
    }
  }

  async function spentToday(now = clock()) {
    return (await summary(now)).today.costYuan
  }

  return { file, append, readAll, summary, spentToday }
}
