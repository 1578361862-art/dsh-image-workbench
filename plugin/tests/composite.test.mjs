// 区域裁剪/合成的纯数学测试：蒙版外像素必须逐字节保持原图。
// client.js 里有一份同源镜像（浏览器不能 import Host 模块），这里同时验证两份实现不漂移。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  clampBounds,
  ensureAspect,
  expandBounds,
  maskPadding,
  normalizeMaskAlpha,
  regionBox,
} from '../lib/mask.js'
import { compositeBox, inwardFeatherAlpha } from '../lib/composite.js'

function makeRgba(width, height, paint) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const [r, g, b, a] = paint(x, y)
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = a
    }
  }
  return data
}

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function loadClientMirror() {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const source = readFileSync(join(root, 'client.js'), 'utf8')
  const start = source.indexOf('// MIRROR:regionmath:start')
  const end = source.indexOf('// MIRROR:regionmath:end')
  assert.ok(start > 0 && end > start, 'client.js 必须保留 MIRROR:regionmath 标记')
  const block = source.slice(start, end)
  const factory = new Function(
    block +
      '\nreturn { clampBounds, expandBounds, maskPadding, ensureAspect, regionBox, normalizeMaskAlpha, inwardFeatherAlpha, compositeBox, MASK_DISPLAY_ALPHA };',
  )
  return factory()
}

test('合成：裁剪框外的像素逐字节保持原图', () => {
  const W = 12
  const H = 9
  const original = makeRgba(W, H, (x, y) => [x * 20, y * 25, 33, 255])
  const box = { x: 3, y: 2, w: 4, h: 4 }
  const edited = new Uint8ClampedArray(box.w * box.h * 4).fill(200)
  const mask = new Uint8Array(box.w * box.h).fill(255)
  const out = compositeBox({ original, edited, maskAlpha: mask, imageWidth: W, imageHeight: H, box, feather: 2 })

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const inside = x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h
      if (inside) continue
      const i = (y * W + x) * 4
      assert.deepEqual(
        [...out.data.slice(i, i + 4)],
        [...original.slice(i, i + 4)],
        `(${x},${y}) 在裁剪框外，必须保持原图像素`,
      )
    }
  }
  assert.ok(out.changedPixels > 0, '蒙版内必须有像素被编辑')
})

test('合成：裁剪框内但蒙版为 0 的像素也保持原图', () => {
  const W = 10
  const H = 8
  const original = makeRgba(W, H, (x, y) => [x * 11, y * 13, 77, 255])
  const box = { x: 2, y: 1, w: 5, h: 5 }
  const edited = new Uint8ClampedArray(box.w * box.h * 4).fill(255)
  const mask = new Uint8Array(box.w * box.h)
  mask[2 * box.w + 2] = 255 // 只有中心一个像素被画到
  const out = compositeBox({ original, edited, maskAlpha: mask, imageWidth: W, imageHeight: H, box, feather: 4 })

  assert.equal(out.changedPixels, 1)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const masked = x === box.x + 2 && y === box.y + 2
      if (masked) continue
      const i = (y * W + x) * 4
      assert.deepEqual([...out.data.slice(i, i + 4)], [...original.slice(i, i + 4)], `(${x},${y}) 蒙版外必须不变`)
    }
  }
})

test('合成：完全被蒙版覆盖且远离边缘的像素等于编辑结果', () => {
  const W = 9
  const H = 9
  const original = makeRgba(W, H, () => [0, 0, 0, 255])
  const box = { x: 1, y: 1, w: 7, h: 7 }
  const edited = makeRgba(box.w, box.h, () => [250, 120, 10, 255])
  const mask = new Uint8Array(box.w * box.h).fill(255)
  const out = compositeBox({ original, edited, maskAlpha: mask, imageWidth: W, imageHeight: H, box, feather: 2 })

  const cx = (box.y + 3) * W + (box.x + 3)
  assert.deepEqual([...out.data.slice(cx * 4, cx * 4 + 4)], [250, 120, 10, 255])
})

test('羽化：只向内扩散，蒙版外 alpha 恒为 0', () => {
  const w = 9
  const h = 9
  const mask = new Uint8Array(w * h)
  for (let y = 2; y <= 6; y++) for (let x = 2; x <= 6; x++) mask[y * w + x] = 255
  const alpha = inwardFeatherAlpha(mask, w, h, 3)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x] === 0) assert.equal(alpha[y * w + x], 0, `(${x},${y}) 蒙版外必须为 0`)
    }
  }
  const edge = alpha[2 * w + 2]
  const center = alpha[4 * w + 4]
  assert.ok(edge > 0 && edge < 255, '蒙版边缘应有羽化过渡')
  assert.ok(center > edge, '越靠内 alpha 越高')
  assert.equal(center, 255)
})

test('合成：越界/空裁剪框不改变任何像素', () => {
  const W = 6
  const H = 5
  const original = makeRgba(W, H, () => [1, 2, 3, 255])
  const edited = new Uint8ClampedArray(4).fill(9)
  const out = compositeBox({
    original,
    edited,
    maskAlpha: new Uint8Array(1).fill(255),
    imageWidth: W,
    imageHeight: H,
    box: { x: 50, y: 50, w: 10, h: 10 },
    feather: 2,
  })
  assert.equal(out.changedPixels, 0)
  assert.deepEqual([...out.data], [...original])
})

test('合成：RGBA 数据不足时抛错，不返回坏图', () => {
  assert.throws(
    () => compositeBox({ original: new Uint8ClampedArray(4), edited: null, maskAlpha: null, imageWidth: 8, imageHeight: 8, box: { x: 0, y: 0, w: 2, h: 2 } }),
    /原图 RGBA/,
  )
  assert.throws(
    () =>
      compositeBox({
        original: new Uint8ClampedArray(8 * 8 * 4),
        edited: new Uint8ClampedArray(4),
        maskAlpha: new Uint8Array(4),
        imageWidth: 8,
        imageHeight: 8,
        box: { x: 0, y: 0, w: 4, h: 4 },
      }),
    /编辑结果 RGBA/,
  )
  assert.throws(
    () =>
      compositeBox({
        original: new Uint8ClampedArray(8 * 8 * 4),
        edited: new Uint8ClampedArray(4 * 4 * 4),
        maskAlpha: new Uint8Array(2),
        imageWidth: 8,
        imageHeight: 8,
        box: { x: 0, y: 0, w: 4, h: 4 },
      }),
    /蒙版数据/,
  )
})

test('client 镜像与 lib 的裁剪/羽化/合成结果完全一致', () => {
  const mirror = loadClientMirror()
  const rand = mulberry32(20261115)

  for (let round = 0; round < 30; round++) {
    const width = 1 + Math.floor(rand() * 300)
    const height = 1 + Math.floor(rand() * 300)
    const bounds = {
      x: rand(),
      y: rand(),
      w: rand(),
      h: rand(),
    }
    assert.deepEqual(mirror.regionBox(bounds, width, height), regionBox(bounds, width, height))
    assert.deepEqual(mirror.ensureAspect(bounds, width, height), ensureAspect(bounds, width, height))
    assert.deepEqual(mirror.clampBounds(bounds, width, height), clampBounds(bounds, width, height))
    assert.deepEqual(mirror.expandBounds(bounds, 17, width, height), expandBounds(bounds, 17, width, height))
    assert.equal(mirror.maskPadding(width, height), maskPadding(width, height))

    const pixels = 1 + Math.floor(rand() * 64)
    const raw = new Uint8Array(pixels)
    for (let i = 0; i < pixels; i++) raw[i] = Math.floor(rand() * 116)
    assert.deepEqual(
      [...mirror.normalizeMaskAlpha(raw, pixels)],
      [...normalizeMaskAlpha(raw, pixels)],
      'alpha 归一化必须一致',
    )
    const feather = 1 + Math.floor(rand() * 8)
    assert.deepEqual(
      [...mirror.inwardFeatherAlpha(raw, 8, 8, feather)],
      [...inwardFeatherAlpha(raw, 8, 8, feather)],
      '羽化必须一致',
    )
  }

  const W = 14
  const H = 11
  const original = makeRgba(W, H, (x, y) => [x * 9, y * 7, (x * y) % 255, 255])
  const box = { x: 2, y: 1, w: 6, h: 7 }
  const edited = makeRgba(box.w, box.h, (x, y) => [255 - x * 9, 40 + y * 3, 90, 255])
  const mask = new Uint8Array(box.w * box.h)
  for (let i = 0; i < mask.length; i++) mask[i] = i % 3 === 0 ? 0 : 115

  const fromLib = compositeBox({ original, edited, maskAlpha: mask, imageWidth: W, imageHeight: H, box, feather: 3 })
  const fromMirror = mirror.compositeBox({
    original,
    edited,
    maskAlpha: mask,
    imageWidth: W,
    imageHeight: H,
    box,
    feather: 3,
  })
  assert.deepEqual(fromMirror.box, fromLib.box)
  assert.equal(fromMirror.changedPixels, fromLib.changedPixels)
  assert.deepEqual([...fromMirror.data], [...fromLib.data], 'client 与 lib 合成结果必须逐字节一致')
})
