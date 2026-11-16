import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createArtworkRepository } from '../lib/artworks.js'
import { openIndex } from '../lib/sqlite.js'

async function setup(t) {
  const root = await mkdtemp(join(tmpdir(), 'iw-artworks-'))
  const index = await openIndex(':memory:')
  if (!index) {
    t.skip('node:sqlite unavailable')
    return {}
  }
  t.after(async () => { index.close(); await rm(root, { recursive: true, force: true }) })
  return { root, index }
}

test('creates artwork and version DAG with stable parent links', async t => {
  const { root, index } = await setup(t)
  const repo = createArtworkRepository({ root, index })
  const artwork = await repo.create({ title: '测试作品' })
  const first = await repo.addVersion({ artworkId: artwork.id, buffer: Buffer.from('first'), width: 1024, height: 1024, prompt: 'first', snapshot: { model: 'minimax' } })
  const second = await repo.addVersion({ artworkId: artwork.id, parentVersionId: first.id, buffer: Buffer.from('second'), width: 2048, height: 2048, prompt: 'second' })
  assert.equal(first.seq, 1)
  assert.equal(second.seq, 2)
  assert.equal(second.parentVersionId, first.id)
  const loaded = repo.get(artwork.id)
  assert.deepEqual(loaded.versions.map(v => v.id), [first.id, second.id])
  const meta = JSON.parse(await readFile(join(root, artwork.folder, 'artwork.json'), 'utf8'))
  assert.equal(meta.versions[1].parentVersionId, first.id)
  assert.equal(meta.versions[1].format, 'png')
})

test('rejects invalid parents and keeps flags independent', async t => {
  const { root, index } = await setup(t)
  const repo = createArtworkRepository({ root, index })
  const artwork = await repo.create({ title: 'flags' })
  await assert.rejects(() => repo.addVersion({ artworkId: artwork.id, parentVersionId: 'ver_missing', buffer: Buffer.from('x'), width: 10, height: 10 }), /父版本/)
  const liked = repo.setFlag(artwork.id, 'liked', true)
  assert.equal(liked.liked, 1)
  assert.equal(liked.favorite, 0)
})

test('attaches source bytes under the artwork folder', async t => {
  const { root, index } = await setup(t)
  const repo = createArtworkRepository({ root, index })
  const artwork = await repo.create({ title: 'source' })
  const source = await repo.attachSource(artwork.id, Buffer.from('source'), 'image/png')
  assert.equal(source.file, 'source/original.png')
  const meta = JSON.parse(await readFile(join(root, artwork.folder, 'artwork.json'), 'utf8'))
  assert.equal(meta.source.file, 'source/original.png')
})

test('attaches and reads layer manifest and files', async t => {
  const { root, index } = await setup(t)
  const repo = createArtworkRepository({ root, index })
  const artwork = await repo.create({ title: 'layers' })
  const version = await repo.addVersion({ artworkId: artwork.id, buffer: Buffer.from('base'), width: 512, height: 512 })
  const manifest = { canvasWidth: 512, canvasHeight: 512, layers: [{ id: 'l1', file: 'layer_01.png', zIndex: 1, x: 0, y: 0, opacity: 1, blendMode: 'normal' }] }
  await repo.attachLayers(artwork.id, version.id, manifest, { 'layer_01.png': Buffer.from('layer') })
  const read = await repo.layers(artwork.id, version.id)
  assert.equal(read.manifest.canvasWidth, 512)
  assert.equal(read.base, 'layers/v001')
  const meta = JSON.parse(await readFile(join(root, artwork.folder, 'artwork.json'), 'utf8'))
  assert.equal(meta.versions[0].layerManifest.layers[0].file, 'layer_01.png')
})

test('keeps old artworks addressable after switching storage root', async t => {
  const { root, index } = await setup(t)
  const secondRoot = await mkdtemp(join(tmpdir(), 'iw-artworks-second-'))
  t.after(() => rm(secondRoot, { recursive: true, force: true }))
  const first = createArtworkRepository({ root, index })
  const second = createArtworkRepository({ root: secondRoot, index })
  const artwork = await first.create({ title: 'old-root' })
  const version = await second.addVersion({ artworkId: artwork.id, buffer: Buffer.from('old'), width: 64, height: 64 })
  assert.equal(version.artworkId, artwork.id)
  const loaded = second.get(artwork.id)
  assert.equal(loaded.root, root)
  await readFile(join(root, artwork.folder, version.file))
})
