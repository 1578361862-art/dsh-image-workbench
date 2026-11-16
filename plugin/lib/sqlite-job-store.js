// job-queue 的 SQLite 持久化适配器：重启后 queued/submitting 可恢复。
export function createSqliteJobStore(index) {
  if (!index) throw new Error('SQLite index unavailable')
  function parse(row) {
    if (!row) return null
    return {
      id: row.id,
      idempotencyKey: row.idempotency_key,
      status: row.status,
      snapshot: JSON.parse(row.snapshot_json),
      provider: row.provider || 'minimax',
      meta: row.meta_json ? JSON.parse(row.meta_json) : {},
      result: row.result_json ? JSON.parse(row.result_json) : null,
      error: row.error_message ? { code: row.error_code || 'failed', message: row.error_message } : null,
      retryable: row.retryable == null ? undefined : !!row.retryable,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
  return {
    get(id) { return parse(index.get('SELECT * FROM jobs WHERE id=?', id)) },
    list() { return index.all('SELECT * FROM jobs ORDER BY created_at').map(parse) },
    put(job) {
      index.run(`INSERT INTO jobs(id,idempotency_key,status,snapshot_json,provider,meta_json,result_json,retryable,error_code,error_message,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET status=excluded.status,snapshot_json=excluded.snapshot_json,provider=excluded.provider,
        meta_json=excluded.meta_json,result_json=excluded.result_json,retryable=excluded.retryable,error_code=excluded.error_code,
        error_message=excluded.error_message,updated_at=excluded.updated_at`,
        job.id, job.idempotencyKey, job.status, JSON.stringify(job.snapshot ?? {}), job.provider || 'minimax',
        JSON.stringify(job.meta ?? {}), job.result == null ? null : JSON.stringify(job.result),
        job.retryable == null ? null : (job.retryable ? 1 : 0), job.error?.code ?? null, job.error?.message ?? null,
        job.createdAt, job.updatedAt)
      return job
    },
    delete(id) { index.run('DELETE FROM jobs WHERE id=?', id) },
  }
}
