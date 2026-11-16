// 作品目录 + 版本 DAG。图片文件在用户选择的根目录；SQLite 只存索引。
import { createHash, randomBytes } from 'node:crypto'
import { mkdir, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fail } from './errors.js'
import { writeAtomic } from './storage.js'

const ID_RE = /^[a-z][a-z0-9_]{5,60}$/
const FORMAT_EXT = Object.freeze({ png: 'png', jpeg: 'jpg', webp: 'webp' })
const FORMATS = new Set(Object.keys(FORMAT_EXT))

export function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function artworkId() {
  return `art_${Date.now().toString(36)}${randomBytes(4).toString('hex')}`
}
function versionId() {
  return `ver_${Date.now().toString(36)}${randomBytes(4).toString('hex')}`
}
function titleOf(value) {
  const title = String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80)
  return title || '未命名作品'
}
function dateFolder(now) {
  return `${now.toISOString().slice(0, 10)}_作品-${randomBytes(3).toString('hex')}`
}

export function createArtworkRepository({ root, index, clock = () => new Date() }) {
  if (!root || typeof root !== 'string') throw new Error('作品根目录无效')
  if (!index) throw new Error('作品索引不可用')

  async function create({ title } = {}) {
    const now = clock()
    const id = artworkId()
    const folder = dateFolder(now)
    const dir = join(root, folder)
    await mkdir(join(dir, 'versions'), { recursive: true })
    await mkdir(join(dir, 'source'), { recursive: true })
    await mkdir(join(dir, 'layers'), { recursive: true })
    await mkdir(join(dir, 'exports'), { recursive: true })
    const created = now.toISOString()
    const meta = { schema: 1, id, title: titleOf(title), createdAt: created, updatedAt: created, versions: [] }
    await writeAtomic(join(dir, 'artwork.json'), JSON.stringify(meta, null, 2), 0o644)
    index.run('INSERT INTO artworks(id,root,folder,title,created_at,updated_at) VALUES(?,?,?,?,?,?)', id, root, folder, meta.title, created, created)
    return { ...meta, root, folder }
  }

  function artworkRow(id) {
    if (typeof id !== 'string' || !ID_RE.test(id)) fail('作品不存在', 404)
    const row = index.get('SELECT * FROM artworks WHERE id=?', id)
    if (!row) fail('作品不存在', 404)
    return row
  }

  function versionRows(artworkId) {
    return index.all('SELECT * FROM versions WHERE artwork_id=? ORDER BY seq', artworkId)
  }

  async function syncManifest(row, versions) {
    const meta = {
      schema: 1, id: row.id, title: row.title, createdAt: row.created_at, updatedAt: row.updated_at,
      versions: versions.map(v => ({
        id: v.id, parentVersionId: v.parent_version_id || null, file: v.file, format: v.format,
        width: v.width, height: v.height, sha256: v.sha256, prompt: v.prompt, status: v.status,
        createdAt: v.created_at, jobId: v.job_id || null, layerManifest: v.layer_manifest_json ? JSON.parse(v.layer_manifest_json) : null,
      })),
    }
    await writeAtomic(join(root, row.folder, 'artwork.json'), JSON.stringify(meta, null, 2), 0o644)
    return meta
  }

  async function addVersion({ artworkId, parentVersionId = null, buffer, format = 'png', width, height, prompt = '', snapshot = {}, status = 'succeeded', jobId = null, layerManifest = null } = {}) {
    const artwork = artworkRow(artworkId)
    if (!Buffer.isBuffer(buffer) || !buffer.length) fail('版本文件为空', 400)
    if (!FORMATS.has(format)) fail('版本格式无效', 400)
    if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) fail('版本尺寸无效', 400)
    if (parentVersionId != null) {
      const parent = index.get('SELECT id FROM versions WHERE id=? AND artwork_id=?', parentVersionId, artworkId)
      if (!parent) fail('父版本不存在', 409)
    }
    const versions = versionRows(artworkId)
    const seq = versions.length ? Math.max(...versions.map(v => v.seq)) + 1 : 1
    const id = versionId()
    const file = `versions/v${String(seq).padStart(3, '0')}.${FORMAT_EXT[format]}`
    const digest = sha256(buffer)
    await writeAtomic(join(root, artwork.folder, file), buffer, 0o644)
    const created = clock().toISOString()
    index.transaction(() => {
      index.run('INSERT INTO assets(id,sha256,path,mime,width,height,bytes,created_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(sha256) DO NOTHING',
        `asset_${digest.slice(0, 24)}`, digest, `${artwork.folder}/${file}`, `image/${format}`, width, height, buffer.length, created)
      index.run('INSERT INTO versions(id,artwork_id,parent_version_id,seq,file,format,width,height,sha256,prompt,snapshot_json,status,created_at,job_id,layer_manifest_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        id, artworkId, parentVersionId, seq, file, format, width, height, digest, String(prompt), JSON.stringify(snapshot ?? {}), status, created, jobId, layerManifest ? JSON.stringify(layerManifest) : null)
      index.run('UPDATE artworks SET updated_at=? WHERE id=?', created, artworkId)
    })
    const row = artworkRow(artworkId)
    await syncManifest(row, versionRows(artworkId))
    return { id, artworkId, parentVersionId, seq, file, format, width, height, sha256: digest, prompt: String(prompt), status, createdAt: created, layerManifest }
  }

  function get(id) {
    const row = artworkRow(id)
    const versions = versionRows(id)
    return { ...row, versions }
  }

  async function list({ limit = 50 } = {}) {
    const rows = index.all('SELECT * FROM artworks ORDER BY updated_at DESC LIMIT ?', Math.max(1, Math.min(200, Number(limit) || 50)))
    return Promise.all(rows.map(async row => ({ ...row, versions: versionRows(row.id) })))
  }

  function setFlag(id, field, value) {
    if (!['favorite', 'liked', 'archived'].includes(field)) fail('未知标记', 400)
    artworkRow(id)
    index.run(`UPDATE artworks SET ${field}=?, updated_at=? WHERE id=?`, value ? 1 : 0, clock().toISOString(), id)
    return get(id)
  }

  return { create, addVersion, get, list, setFlag, root }
}
