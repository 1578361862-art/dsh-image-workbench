// Pure mask geometry tests. No browser or host server required.
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  boundsFromAlpha,
  clampBounds,
  expandBounds,
  normalizeBounds,
} from '../lib/mask.js'

function alphaOf(width, height, points = []) {
  const alpha = new Uint8Array(width * height)
  for (const [x, y] of points) alpha[y * width + x] = 255
  return alpha
}

test('mask geometry：空蒙版返回 null', () => {
  assert.equal(boundsFromAlpha(alphaOf(8, 6), 8, 6), null)
  assert.equal(boundsFromAlpha(new Uint8Array(0), 0, 0), null)
  assert.equal(boundsFromAlpha(null, 8, 6), null)
})

test('mask geometry：单像素得到 1×1 包围盒', () => {
  assert.deepEqual(boundsFromAlpha(alphaOf(8, 6, [[3, 2]]), 8, 6), {
    x: 3,
    y: 2,
    w: 1,
    h: 1,
  })
})

test('mask geometry：整张画布得到完整包围盒', () => {
  const alpha = new Uint8Array(8 * 6).fill(255)
  assert.deepEqual(boundsFromAlpha(alpha, 8, 6), { x: 0, y: 0, w: 8, h: 6 })
})

test('mask geometry：贴边像素保留画布边界', () => {
  const alpha = alphaOf(10, 7, [
    [0, 0],
    [9, 0],
    [0, 6],
    [9, 6],
  ])
  assert.deepEqual(boundsFromAlpha(alpha, 10, 7), { x: 0, y: 0, w: 10, h: 7 })
})

test('mask geometry：归一化到 0..1', () => {
  assert.deepEqual(normalizeBounds({ x: 10, y: 5, w: 20, h: 10 }, 100, 50), {
    x: 0.1,
    y: 0.1,
    w: 0.2,
    h: 0.2,
  })
  assert.deepEqual(normalizeBounds(null, 100, 50), { x: 0, y: 0, w: 0, h: 0 })
  assert.deepEqual(normalizeBounds({ x: 1, y: 1, w: 1, h: 1 }, 0, 0), {
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  })
})

test('mask geometry：padding 扩展并在边缘截断', () => {
  assert.deepEqual(expandBounds({ x: 20, y: 20, w: 30, h: 30 }, 5, 100, 100), {
    x: 15,
    y: 15,
    w: 40,
    h: 40,
  })
  assert.deepEqual(expandBounds({ x: 2, y: 3, w: 10, h: 10 }, 8, 100, 100), {
    x: 0,
    y: 0,
    w: 26,
    h: 26,
  })
  assert.deepEqual(expandBounds({ x: 90, y: 90, w: 8, h: 8 }, 8, 100, 100), {
    x: 82,
    y: 82,
    w: 18,
    h: 18,
  })
  assert.deepEqual(expandBounds(null, 8, 100, 100), { x: 0, y: 0, w: 0, h: 0 })
})

test('mask geometry：clampBounds 把越界盒子收回画布', () => {
  assert.deepEqual(clampBounds({ x: -5, y: -5, w: 20, h: 20 }, 100, 50), {
    x: 0,
    y: 0,
    w: 20,
    h: 20,
  })
  assert.deepEqual(clampBounds({ x: 95, y: 45, w: 20, h: 20 }, 100, 50), {
    x: 95,
    y: 45,
    w: 5,
    h: 5,
  })
  assert.deepEqual(clampBounds({ x: 120, y: 80, w: 10, h: 10 }, 100, 50), {
    x: 100,
    y: 50,
    w: 0,
    h: 0,
  })
})
