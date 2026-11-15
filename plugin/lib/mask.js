// Pure mask geometry for region edits. No Canvas, DOM, or Node-specific APIs.
//
// `alpha` is an alpha-only buffer (one byte per pixel) of length width*height.
// Browser code cannot import this host-side module, so plugin/client.js mirrors
// boundsFromAlpha/normalizeBounds below a "Mirror of plugin/lib/mask.js" comment.
// Keep the two copies in sync until there is a build step.

/**
 * Tight pixel bounding box of every non-zero alpha pixel.
 * @param {ArrayLike<number>} alpha
 * @param {number} width
 * @param {number} height
 * @returns {{x:number,y:number,w:number,h:number}|null} null when no pixel is set
 */
export function boundsFromAlpha(alpha, width, height) {
  const w = Math.floor(Number(width) || 0);
  const h = Math.floor(Number(height) || 0);
  if (!alpha || w <= 0 || h <= 0 || alpha.length < w * h) return null;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if (alpha[row + x] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * Convert a pixel bounding box to normalized 0..1 coordinates.
 * @param {{x:number,y:number,w:number,h:number}|null} bounds
 * @param {number} width
 * @param {number} height
 * @returns {{x:number,y:number,w:number,h:number}}
 */
export function normalizeBounds(bounds, width, height) {
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  if (!bounds || w <= 0 || h <= 0) return { x: 0, y: 0, w: 0, h: 0 };
  return {
    x: (Number(bounds.x) || 0) / w,
    y: (Number(bounds.y) || 0) / h,
    w: (Number(bounds.w) || 0) / w,
    h: (Number(bounds.h) || 0) / h,
  };
}

/**
 * Clamp a pixel bounding box so it stays inside the canvas.
 * @param {{x:number,y:number,w:number,h:number}|null} bounds
 * @param {number} width
 * @param {number} height
 * @returns {{x:number,y:number,w:number,h:number}}
 */
export function clampBounds(bounds, width, height) {
  const w = Math.max(0, Number(width) || 0);
  const h = Math.max(0, Number(height) || 0);
  if (!bounds) return { x: 0, y: 0, w: 0, h: 0 };

  const x = Math.min(Math.max(0, Number(bounds.x) || 0), w);
  const y = Math.min(Math.max(0, Number(bounds.y) || 0), h);
  const bw = Math.min(Math.max(0, Number(bounds.w) || 0), w - x);
  const bh = Math.min(Math.max(0, Number(bounds.h) || 0), h - y);
  return { x, y, w: bw, h: bh };
}

/**
 * Grow a pixel bounding box by pad pixels on every side, then clamp to canvas.
 * @param {{x:number,y:number,w:number,h:number}|null} bounds
 * @param {number} pad
 * @param {number} width
 * @param {number} height
 * @returns {{x:number,y:number,w:number,h:number}}
 */
export function expandBounds(bounds, pad, width, height) {
  if (!bounds) return { x: 0, y: 0, w: 0, h: 0 };
  const p = Math.max(0, Number(pad) || 0);
  return clampBounds(
    {
      x: (Number(bounds.x) || 0) - p,
      y: (Number(bounds.y) || 0) - p,
      w: (Number(bounds.w) || 0) + p * 2,
      h: (Number(bounds.h) || 0) + p * 2,
    },
    width,
    height,
  );
}

// The brush overlay paints at ~45% red so the user can still see the image
// underneath. That display alpha is not a usable mask; region edits normalize
// it back to a full 0..255 ramp.
export const MASK_DISPLAY_ALPHA = 115;

/**
 * Context padding for a region crop: 12% of the box's longer side, clamped to
 * 16–96 px so tiny masks still get context and huge masks do not balloon.
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export function maskPadding(width, height) {
  const longest = Math.max(Math.abs(Number(width) || 0), Math.abs(Number(height) || 0));
  if (!longest) return 16;
  return Math.max(16, Math.min(96, Math.round(longest * 0.12)));
}

/**
 * Expand a pixel box's shorter side, centred, until w/h fits [minAspect, 1/minAspect].
 * Region providers reject extreme ratios; growing the crop with extra context is
 * free for the composite because only masked pixels are replaced.
 * @param {{x:number,y:number,w:number,h:number}|null} bounds
 * @param {number} width
 * @param {number} height
 * @param {number} [minAspect]
 * @returns {{x:number,y:number,w:number,h:number}}
 */
export function ensureAspect(bounds, width, height, minAspect = 1 / 3) {
  const box = clampBounds(bounds, width, height);
  if (box.w <= 0 || box.h <= 0) return box;
  const lo = Math.max(0.02, Math.min(1, Number(minAspect) || 1 / 3));
  const hi = 1 / lo;
  let { x, y, w, h } = box;
  const ratio = w / h;
  if (ratio > hi) {
    const nh = Math.min(height, Math.ceil(w / hi));
    y = Math.max(0, Math.round(y - (nh - h) / 2));
    h = nh;
  } else if (ratio < lo) {
    const nw = Math.min(width, Math.ceil(h * lo));
    x = Math.max(0, Math.round(x - (nw - w) / 2));
    w = nw;
  }
  return clampBounds({ x, y, w, h }, width, height);
}

/**
 * Normalized mask bbox → padded, ratio-safe pixel crop box in the source image.
 * @param {{x:number,y:number,w:number,h:number}|null} bounds normalized 0..1 bbox
 * @param {number} width source image width
 * @param {number} height source image height
 * @returns {{x:number,y:number,w:number,h:number}}
 */
export function regionBox(bounds, width, height) {
  const w = Math.max(0, Math.floor(Number(width) || 0));
  const h = Math.max(0, Math.floor(Number(height) || 0));
  if (!bounds || w <= 0 || h <= 0) return { x: 0, y: 0, w: 0, h: 0 };
  const px = {
    x: Math.round((Number(bounds.x) || 0) * w),
    y: Math.round((Number(bounds.y) || 0) * h),
    w: Math.round((Number(bounds.w) || 0) * w),
    h: Math.round((Number(bounds.h) || 0) * h),
  };
  const padded = expandBounds(px, maskPadding(px.w, px.h), w, h);
  return ensureAspect(padded, w, h, 1 / 3);
}

/**
 * Scale the red overlay's 0..MASK_DISPLAY_ALPHA alpha back to 0..255.
 * @param {ArrayLike<number>} alpha
 * @param {number} [length]
 * @returns {Uint8Array}
 */
export function normalizeMaskAlpha(alpha, length) {
  const n = Math.max(0, Math.floor(Number(length) || (alpha ? alpha.length : 0)));
  if (!alpha || n <= 0) return new Uint8Array(0);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, Math.min(255, Math.round(Number(alpha[i]) || 0)));
    out[i] = v === 0 ? 0 : Math.max(1, Math.min(255, Math.round((v * 255) / MASK_DISPLAY_ALPHA)));
  }
  return out;
}
