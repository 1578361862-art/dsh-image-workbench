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
