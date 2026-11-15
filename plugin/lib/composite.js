// Pure crop/composite pixel math for region edits. No Canvas, DOM, or Node APIs.
//
// `original` and `edited` are RGBA byte buffers (4 bytes per pixel, row major).
// Browser code cannot import this host-side module, so plugin/client.js mirrors
// these functions verbatim between "MIRROR:regionmath" markers. Keep the two
// copies in sync until there is a build step; plugin/tests/composite.test.mjs
// evaluates the client copy and fails when the results diverge.
import { clampBounds } from './mask.js';

const DIAG = Math.SQRT2;

/**
 * Inward-only feather of a normalized mask (0..255). Pixels with zero mask
 * alpha stay exactly zero, so compositing can never touch pixels the user did
 * not paint; inside the mask the alpha ramps up over `feather` pixels so the
 * boundary is soft instead of a hard cut.
 * @param {ArrayLike<number>} maskAlpha normalized alpha, width*height
 * @param {number} width
 * @param {number} height
 * @param {number} [feather] ramp length in pixels
 * @returns {Uint8Array} width*height alpha multipliers (0..255)
 */
export function inwardFeatherAlpha(maskAlpha, width, height, feather = 12) {
  const w = Math.max(0, Math.floor(Number(width) || 0));
  const h = Math.max(0, Math.floor(Number(height) || 0));
  if (!maskAlpha || w <= 0 || h <= 0 || maskAlpha.length < w * h) return new Uint8Array(0);

  const ramp = Math.max(1, Math.round(Number(feather) || 1));
  const BIG = 1e6;
  const dist = new Float32Array(w * h);
  for (let i = 0; i < dist.length; i++) dist[i] = maskAlpha[i] > 0 ? BIG : 0;

  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const i = row + x;
      if (dist[i] === 0) continue;
      let best = dist[i];
      if (x > 0) best = Math.min(best, dist[i - 1] + 1);
      if (y > 0) {
        best = Math.min(best, dist[i - w] + 1);
        if (x > 0) best = Math.min(best, dist[i - w - 1] + DIAG);
        if (x < w - 1) best = Math.min(best, dist[i - w + 1] + DIAG);
      }
      dist[i] = best;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    const row = y * w;
    for (let x = w - 1; x >= 0; x--) {
      const i = row + x;
      if (dist[i] === 0) continue;
      let best = dist[i];
      if (x < w - 1) best = Math.min(best, dist[i + 1] + 1);
      if (y < h - 1) {
        best = Math.min(best, dist[i + w] + 1);
        if (x < w - 1) best = Math.min(best, dist[i + w + 1] + DIAG);
        if (x > 0) best = Math.min(best, dist[i + w - 1] + DIAG);
      }
      dist[i] = best;
    }
  }

  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i++) {
    const base = maskAlpha[i];
    if (!base) continue;
    const t = Math.min(1, dist[i] / ramp);
    const smooth = t * t * (3 - 2 * t);
    out[i] = Math.max(1, Math.round(base * smooth));
  }
  return out;
}

/**
 * Composite an edited crop back into a full image. Every pixel outside `box`,
 * and every pixel inside `box` whose mask alpha is zero, keeps the original
 * bytes verbatim.
 * @param {object} input
 * @param {Uint8ClampedArray|Uint8Array} input.original full-image RGBA
 * @param {Uint8ClampedArray|Uint8Array} input.edited crop-sized RGBA
 * @param {ArrayLike<number>} input.maskAlpha crop-sized normalized alpha (0..255)
 * @param {number} input.imageWidth
 * @param {number} input.imageHeight
 * @param {{x:number,y:number,w:number,h:number}} input.box crop rect in the full image
 * @param {number} [input.feather]
 * @returns {{data:Uint8ClampedArray, box:{x:number,y:number,w:number,h:number}, changedPixels:number}}
 */
export function compositeBox({ original, edited, maskAlpha, imageWidth, imageHeight, box, feather = 12 }) {
  const w = Math.max(0, Math.floor(Number(imageWidth) || 0));
  const h = Math.max(0, Math.floor(Number(imageHeight) || 0));
  if (!original || w <= 0 || h <= 0 || original.length < w * h * 4) {
    throw new Error('compositeBox: 原图 RGBA 数据不足');
  }
  const out = new Uint8ClampedArray(original.length);
  out.set(original);

  const b = clampBounds(box, w, h);
  if (b.w <= 0 || b.h <= 0) return { data: out, box: b, changedPixels: 0 };
  if (!edited || edited.length < b.w * b.h * 4) throw new Error('compositeBox: 编辑结果 RGBA 数据不足');
  if (!maskAlpha || maskAlpha.length < b.w * b.h) throw new Error('compositeBox: 蒙版数据不足');

  const alpha = inwardFeatherAlpha(maskAlpha, b.w, b.h, feather);
  let changed = 0;
  for (let y = 0; y < b.h; y++) {
    const outRow = (b.y + y) * w;
    const srcRow = y * b.w;
    for (let x = 0; x < b.w; x++) {
      const mi = srcRow + x;
      const a = alpha[mi];
      if (!a) continue;
      const di = (outRow + b.x + x) * 4;
      const si = mi * 4;
      const f = a / 255;
      out[di] = original[di] + (edited[si] - original[di]) * f;
      out[di + 1] = original[di + 1] + (edited[si + 1] - original[di + 1]) * f;
      out[di + 2] = original[di + 2] + (edited[si + 2] - original[di + 2]) * f;
      out[di + 3] = original[di + 3] + (edited[si + 3] - original[di + 3]) * f;
      changed++;
    }
  }
  return { data: out, box: b, changedPixels: changed };
}
