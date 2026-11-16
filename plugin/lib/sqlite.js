// SQLite 索引；node:sqlite 不可用时返回 null，让上层回退 JSON。
export const SCHEMA_VERSION = 1

const SCHEMA = `
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS storage_roots (
  path TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL, last_seen_at TEXT
);
CREATE TABLE IF NOT EXISTS artworks (
  id TEXT PRIMARY KEY, root TEXT NOT NULL, folder TEXT NOT NULL, title TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, favorite INTEGER NOT NULL DEFAULT 0,
  liked INTEGER NOT NULL DEFAULT 0, archived INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS versions (
  id TEXT PRIMARY KEY, artwork_id TEXT NOT NULL REFERENCES artworks(id), parent_version_id TEXT,
  seq INTEGER NOT NULL, file TEXT NOT NULL, format TEXT NOT NULL, width INTEGER NOT NULL,
  height INTEGER NOT NULL, sha256 TEXT NOT NULL, prompt TEXT NOT NULL, snapshot_json TEXT NOT NULL,
  status TEXT NOT NULL, created_at TEXT NOT NULL, job_id TEXT, layer_manifest_json TEXT,
  UNIQUE(artwork_id, seq)
);
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY, sha256 TEXT NOT NULL UNIQUE, path TEXT NOT NULL, mime TEXT NOT NULL,
  width INTEGER NOT NULL, height INTEGER NOT NULL, bytes INTEGER NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY, idempotency_key TEXT NOT NULL UNIQUE, status TEXT NOT NULL,
  snapshot_json TEXT NOT NULL, provider_task_id TEXT, original_asset_id TEXT, layer_manifest_id TEXT,
  error_code TEXT, error_message TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS style_drafts (
  key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS versions_artwork ON versions(artwork_id, seq);
CREATE INDEX IF NOT EXISTS jobs_status ON jobs(status, created_at);
`

export async function openIndex(path = ':memory:') {
  let DatabaseSync
  try {
    ({ DatabaseSync } = await import('node:sqlite'))
  } catch {
    return null
  }
  const db = new DatabaseSync(path)
  db.exec(SCHEMA)
  db.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('schema_version', String(SCHEMA_VERSION))
  return {
    db,
    path,
    get: (sql, ...params) => db.prepare(sql).get(...params),
    all: (sql, ...params) => db.prepare(sql).all(...params),
    run: (sql, ...params) => db.prepare(sql).run(...params),
    exec: sql => db.exec(sql),
    transaction(fn) {
      db.exec('BEGIN IMMEDIATE')
      try { const value = fn(); db.exec('COMMIT'); return value } catch (error) { db.exec('ROLLBACK'); throw error }
    },
    close() { db.close() },
  }
}
