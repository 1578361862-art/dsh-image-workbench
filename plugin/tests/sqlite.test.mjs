import assert from 'node:assert/strict'
import test from 'node:test'
import { openIndex } from '../lib/sqlite.js'

test('opens schema and stores metadata', async t => {
  const index = await openIndex(':memory:')
  if (!index) { t.skip('node:sqlite unavailable'); return }
  t.after(() => index.close())
  index.run('INSERT INTO artworks(id,root,folder,title,created_at,updated_at) VALUES(?,?,?,?,?,?)', 'art_test01', '/tmp', 'folder', 'x', 'now', 'now')
  assert.equal(index.get('SELECT title FROM artworks WHERE id=?', 'art_test01').title, 'x')
  assert.equal(index.get('SELECT value FROM meta WHERE key=?', 'schema_version').value, '1')
})
