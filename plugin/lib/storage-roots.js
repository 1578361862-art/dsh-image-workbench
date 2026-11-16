// 存储根：默认 ~/Pictures/图像工作台；路径只接受绝对路径，写入前试写。
import { homedir } from 'node:os'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fail } from './errors.js'

export const DEFAULT_ROOT = join(homedir(), 'Pictures', '图像工作台')

export function normalizeRoot(value) {
  if (typeof value !== 'string' || !value.trim()) fail('存储目录不能为空', 400)
  if (value.includes('\0')) fail('存储目录无效', 400)
  if (!isAbsolute(value)) fail('存储目录必须是绝对路径', 400)
  const root = resolve(value)
  if (root === '/' || root === homedir()) fail('不能直接使用系统根目录或家目录', 400)
  return root
}

export async function checkRoot(root) {
  const normalized = normalizeRoot(root)
  try {
    await mkdir(normalized, { recursive: true })
    const probe = join(normalized, `.iw-write-${process.pid}-${Date.now()}.tmp`)
    await writeFile(probe, 'ok', { mode: 0o600 })
    await rm(probe, { force: true })
    return { root: normalized, writable: true, checkedAt: new Date().toISOString() }
  } catch (error) {
    return { root: normalized, writable: false, error: error.code || error.message, checkedAt: new Date().toISOString() }
  }
}

export function createStorageRoots({ file, clock = () => new Date() }) {
  async function load() {
    try {
      const parsed = JSON.parse(await readFile(file, 'utf8'))
      const roots = Array.isArray(parsed?.roots) ? parsed.roots : []
      return { active: parsed?.active || DEFAULT_ROOT, roots: roots.filter(root => typeof root?.path === 'string') }
    } catch (error) {
      if (error.code === 'ENOENT' || error instanceof SyntaxError) return { active: DEFAULT_ROOT, roots: [] }
      throw error
    }
  }
  async function save(state) {
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, JSON.stringify({ ...state, updatedAt: clock().toISOString() }, null, 2), { mode: 0o600 })
  }
  async function list() {
    const state = await load()
    const roots = new Map(state.roots.map(root => [root.path, root]))
    if (!roots.has(DEFAULT_ROOT)) roots.set(DEFAULT_ROOT, { path: DEFAULT_ROOT, status: 'default' })
    if (!roots.has(state.active)) roots.set(state.active, { path: state.active, status: 'active' })
    return { active: state.active, roots: [...roots.values()].map(root => ({ ...root, active: root.path === state.active })) }
  }
  async function setActive(value) {
    const checked = await checkRoot(value)
    if (!checked.writable) fail(`目录不可写：${checked.error || '权限不足'}`, 422, { root: checked.root })
    const state = await load()
    state.active = checked.root
    state.roots = state.roots.filter(root => root.path !== checked.root)
    state.roots.unshift({ path: checked.root, status: 'active', checkedAt: checked.checkedAt })
    await save(state)
    return checked
  }
  async function markOffline(value) {
    const state = await load()
    const root = state.roots.find(entry => entry.path === value)
    if (root) root.status = 'offline'
    await save(state)
    return list()
  }
  async function relink(from, to) {
    const normalize = value => normalizeRoot(value)
    const source = normalize(from); const target = normalize(to)
    if (source === target) fail('新旧目录相同', 400)
    const checked = await checkRoot(target)
    if (!checked.writable) fail(`目标目录不可写：${checked.error || '权限不足'}`, 422)
    const state = await load()
    state.roots = state.roots.map(root => root.path === source ? { ...root, path: target, status: 'active', checkedAt: checked.checkedAt } : root)
    if (!state.roots.some(root => root.path === target)) state.roots.unshift({ path: target, status: 'active', checkedAt: checked.checkedAt })
    if (state.active === source || !state.roots.some(root => root.path === state.active)) state.active = target
    await save(state)
    return { from: source, to: target, writable: true }
  }
  return { load, list, setActive, relink, markOffline, check: checkRoot, defaultRoot: DEFAULT_ROOT }
}
