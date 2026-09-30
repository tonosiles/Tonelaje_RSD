/**
 * Preprocesamiento de la foto en el navegador, antes de enviarla a la IA:
 *  1. Orientación según EXIF y reducción de tamaño.
 *  2. Detección del papel (zona clara más grande) → recorte automático y
 *     corrección de perspectiva si el voucher tiene forma de cuadrilátero.
 *  3. Eliminación de sombras (normalización por fondo local) y mejora de contraste.
 * Todo es tolerante a fallos: si la detección no es confiable, se usa la imagen completa.
 */

export interface Processed {
  original: Blob; // foto original (orientada y reducida), la que se guarda
  enhanced: Blob; // versión mejorada que se envía a la IA
  steps: string[]; // qué mejoras se aplicaron
}

type Pt = { x: number; y: number };

const ORIGINAL_MAX = 2000;
const ENHANCED_MAX = 1800;
const DETECT_MAX = 500;

export async function preprocessImage(file: Blob, rotation = 0, enhance = true): Promise<Processed> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const base = drawScaled(bitmap, ORIGINAL_MAX, rotation);
  bitmap.close?.();
  const original = await toBlob(base, 0.88);
  if (!enhance) return { original, enhanced: original, steps: [] };

  const steps: string[] = [];
  let work = base;
  try {
    const quad = detectDocument(base);
    if (quad) {
      work = warp(base, quad.corners);
      steps.push(quad.perspective ? "Recorte y corrección de perspectiva" : "Recorte automático");
    }
  } catch {
    // Detección fallida: continuar con la imagen completa.
  }
  work = scaleCanvas(work, ENHANCED_MAX);
  enhanceContrast(work);
  steps.push("Eliminación de sombras y mejora de contraste");
  return { original, enhanced: await toBlob(work, 0.9), steps };
}

function newCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function ctx2d(c: HTMLCanvasElement) {
  return c.getContext("2d", { willReadFrequently: true })!;
}

function drawScaled(src: CanvasImageSource & { width: number; height: number }, max: number, rotation = 0) {
  const s = Math.min(1, max / Math.max(src.width, src.height));
  const w = src.width * s;
  const h = src.height * s;
  const rot = ((rotation % 360) + 360) % 360;
  const swap = rot === 90 || rot === 270;
  const c = newCanvas(swap ? h : w, swap ? w : h);
  const g = ctx2d(c);
  g.imageSmoothingQuality = "high";
  g.translate(c.width / 2, c.height / 2);
  g.rotate((rot * Math.PI) / 180);
  g.drawImage(src, -w / 2, -h / 2, w, h);
  return c;
}

function scaleCanvas(c: HTMLCanvasElement, max: number) {
  return Math.max(c.width, c.height) > max ? drawScaled(c, max) : c;
}

function toBlob(c: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo procesar la imagen"))), "image/jpeg", quality),
  );
}

function grayscale(data: Uint8ClampedArray, n: number) {
  const g = new Float32Array(n);
  for (let i = 0; i < n; i++) g[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  return g;
}

function otsu(gray: Float32Array) {
  const hist = new Array(256).fill(0);
  for (const v of gray) hist[v | 0]++;
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0,
    wB = 0,
    best = 0,
    threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

/** Busca el papel del voucher como la región clara conectada más grande. */
function detectDocument(src: HTMLCanvasElement): { corners: Pt[]; perspective: boolean } | null {
  const small = scaleCanvas(src, DETECT_MAX);
  const w = small.width;
  const h = small.height;
  const { data } = ctx2d(small).getImageData(0, 0, w, h);
  const gray = grayscale(data, w * h);
  const t = otsu(gray);
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = gray[i] > t ? 1 : 0;

  // Componente conexa más grande (4-vecinos)
  const label = new Int32Array(w * h).fill(-1);
  const stack = new Int32Array(w * h);
  let bestSize = 0;
  let bestLabel = -1;
  let current = 0;
  for (let i = 0; i < w * h; i++) {
    if (!mask[i] || label[i] >= 0) continue;
    let top = 0;
    stack[top++] = i;
    label[i] = current;
    let size = 0;
    while (top) {
      const p = stack[--top];
      size++;
      const x = p % w;
      const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w];
      for (const q of nb) {
        if (q >= 0 && q < w * h && mask[q] && label[q] < 0) {
          label[q] = current;
          stack[top++] = q;
        }
      }
    }
    if (size > bestSize) {
      bestSize = size;
      bestLabel = current;
    }
    current++;
  }
  const area = w * h;
  // Si el papel ocupa casi toda la foto o muy poco, no recortar.
  if (bestSize < area * 0.08 || bestSize > area * 0.9) return null;

  // Esquinas por puntos extremos
  let tl = { x: 0, y: 0, v: Infinity },
    br = { x: 0, y: 0, v: -Infinity },
    tr = { x: 0, y: 0, v: -Infinity },
    bl = { x: 0, y: 0, v: Infinity };
  let minX = w,
    minY = h,
    maxX = 0,
    maxY = 0;
  for (let i = 0; i < area; i++) {
    if (label[i] !== bestLabel) continue;
    const x = i % w;
    const y = (i / w) | 0;
    if (x + y < tl.v) tl = { x, y, v: x + y };
    if (x + y > br.v) br = { x, y, v: x + y };
    if (x - y > tr.v) tr = { x, y, v: x - y };
    if (x - y < bl.v) bl = { x, y, v: x - y };
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const scale = src.width / w;
  const up = (p: Pt) => ({ x: p.x * scale, y: p.y * scale });
  const quad = [tl, tr, br, bl];
  const quadArea = polygonArea(quad);
  const boxArea = (maxX - minX + 1) * (maxY - minY + 1);

  // Si la región se parece a un cuadrilátero, corregir perspectiva; si no, recortar al rectángulo.
  if (quadArea > bestSize * 0.85 && quadArea < bestSize * 1.15 && isConvex(quad)) {
    const pad = 4;
    const c = centroid(quad);
    const padded = quad.map((p) => {
      const dx = p.x - c.x;
      const dy = p.y - c.y;
      const d = Math.hypot(dx, dy) || 1;
      return { x: Math.min(w - 1, Math.max(0, p.x + (dx / d) * pad)), y: Math.min(h - 1, Math.max(0, p.y + (dy / d) * pad)) };
    });
    const skewed = boxArea > quadArea * 1.04;
    return { corners: padded.map(up), perspective: skewed };
  }
  const m = 6;
  const box = [
    { x: Math.max(0, minX - m), y: Math.max(0, minY - m) },
    { x: Math.min(w - 1, maxX + m), y: Math.max(0, minY - m) },
    { x: Math.min(w - 1, maxX + m), y: Math.min(h - 1, maxY + m) },
    { x: Math.max(0, minX - m), y: Math.min(h - 1, maxY + m) },
  ];
  return { corners: box.map(up), perspective: false };
}

function polygonArea(p: Pt[]) {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const j = (i + 1) % p.length;
    a += p[i].x * p[j].y - p[j].x * p[i].y;
  }
  return Math.abs(a) / 2;
}

function isConvex(p: Pt[]) {
  let sign = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i],
      b = p[(i + 1) % p.length],
      c = p[(i + 2) % p.length];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (cross !== 0) {
      if (sign && Math.sign(cross) !== sign) return false;
      sign = Math.sign(cross);
    }
  }
  return true;
}

function centroid(p: Pt[]) {
  return { x: p.reduce((s, q) => s + q.x, 0) / p.length, y: p.reduce((s, q) => s + q.y, 0) / p.length };
}

/** Homografía que lleva los 4 puntos `from` a `to` (resuelve sistema 8x8). */
function homography(from: Pt[], to: Pt[]): number[] {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = from[i];
    const { x: u, y: v } = to[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  // Eliminación gaussiana con pivoteo parcial
  for (let col = 0; col < 8; col++) {
    let piv = col;
    for (let r = col + 1; r < 8; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    [A[col], A[piv]] = [A[piv], A[col]];
    [b[col], b[piv]] = [b[piv], b[col]];
    for (let r = col + 1; r < 8; r++) {
      const f = A[r][col] / A[col][col];
      for (let k = col; k < 8; k++) A[r][k] -= f * A[col][k];
      b[r] -= f * b[col];
    }
  }
  const hvec = new Array(8).fill(0);
  for (let r = 7; r >= 0; r--) {
    let s = b[r];
    for (let k = r + 1; k < 8; k++) s -= A[r][k] * hvec[k];
    hvec[r] = s / A[r][r];
  }
  return [...hvec, 1];
}

/** Proyecta el cuadrilátero (tl, tr, br, bl) a un rectángulo. */
function warp(src: HTMLCanvasElement, q: Pt[]): HTMLCanvasElement {
  const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
  const W = Math.round(Math.max(dist(q[0], q[1]), dist(q[3], q[2])));
  const H = Math.round(Math.max(dist(q[0], q[3]), dist(q[1], q[2])));
  const out = newCanvas(W, H);
  const rect = [
    { x: 0, y: 0 },
    { x: W - 1, y: 0 },
    { x: W - 1, y: H - 1 },
    { x: 0, y: H - 1 },
  ];
  const m = homography(rect, q);
  const sData = ctx2d(src).getImageData(0, 0, src.width, src.height).data;
  const sw = src.width;
  const sh = src.height;
  const outImg = ctx2d(out).createImageData(W, H);
  const o = outImg.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = m[6] * x + m[7] * y + m[8];
      const sx = (m[0] * x + m[1] * y + m[2]) / d;
      const sy = (m[3] * x + m[4] * y + m[5]) / d;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const idx = (y * W + x) * 4;
      if (x0 < 0 || y0 < 0 || x0 >= sw - 1 || y0 >= sh - 1) {
        o[idx] = o[idx + 1] = o[idx + 2] = 255;
        o[idx + 3] = 255;
        continue;
      }
      const fx = sx - x0;
      const fy = sy - y0;
      const i00 = (y0 * sw + x0) * 4;
      const i10 = i00 + 4;
      const i01 = i00 + sw * 4;
      const i11 = i01 + 4;
      for (let c = 0; c < 3; c++) {
        o[idx + c] =
          sData[i00 + c] * (1 - fx) * (1 - fy) +
          sData[i10 + c] * fx * (1 - fy) +
          sData[i01 + c] * (1 - fx) * fy +
          sData[i11 + c] * fx * fy;
      }
      o[idx + 3] = 255;
    }
  }
  ctx2d(out).putImageData(outImg, 0, 0);
  return out;
}

/** Escala de grises + división por el fondo local (quita sombras) + estiramiento de contraste. */
function enhanceContrast(c: HTMLCanvasElement) {
  const w = c.width;
  const h = c.height;
  const g = ctx2d(c);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const n = w * h;
  const gray = grayscale(d, n);

  // Fondo local (color del papel): máximo por bloques, que elimina el texto oscuro,
  // luego suavizado. Dividir por este fondo quita sombras sin crear halos alrededor del texto.
  const b = Math.max(4, Math.round(Math.max(w, h) / 120));
  const gw = Math.ceil(w / b);
  const gh = Math.ceil(h / b);
  const grid = new Float32Array(gw * gh);
  for (let y = 0; y < h; y++) {
    const gy = ((y / b) | 0) * gw;
    for (let x = 0; x < w; x++) {
      const k = gy + ((x / b) | 0);
      const v = gray[y * w + x];
      if (v > grid[k]) grid[k] = v;
    }
  }
  const smooth = new Float32Array(gw * gh);
  const r = 2;
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      let sum = 0,
        cnt = 0;
      for (let dy = -r; dy <= r; dy++) {
        const yy = gy + dy;
        if (yy < 0 || yy >= gh) continue;
        for (let dx = -r; dx <= r; dx++) {
          const xx = gx + dx;
          if (xx < 0 || xx >= gw) continue;
          sum += grid[yy * gw + xx];
          cnt++;
        }
      }
      smooth[gy * gw + gx] = sum / cnt;
    }
  }
  const norm = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    const fy = Math.min(gh - 1, Math.max(0, y / b - 0.5));
    const y0 = Math.floor(fy),
      y1 = Math.min(gh - 1, y0 + 1),
      ty = fy - y0;
    for (let x = 0; x < w; x++) {
      const fx = Math.min(gw - 1, Math.max(0, x / b - 0.5));
      const x0 = Math.floor(fx),
        x1 = Math.min(gw - 1, x0 + 1),
        tx = fx - x0;
      const bg =
        smooth[y0 * gw + x0] * (1 - tx) * (1 - ty) +
        smooth[y0 * gw + x1] * tx * (1 - ty) +
        smooth[y1 * gw + x0] * (1 - tx) * ty +
        smooth[y1 * gw + x1] * tx * ty;
      norm[y * w + x] = Math.min(255, (gray[y * w + x] / Math.max(bg, 1)) * 245);
    }
  }

  // Estiramiento por percentiles 1% - 99%
  const hist = new Array(256).fill(0);
  for (const v of norm) hist[v | 0]++;
  let lo = 0,
    hi = 255,
    acc = 0;
  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc > n * 0.01) {
      lo = i;
      break;
    }
  }
  acc = 0;
  for (let i = 255; i >= 0; i--) {
    acc += hist[i];
    if (acc > n * 0.01) {
      hi = i;
      break;
    }
  }
  const span = Math.max(1, hi - lo);
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, Math.min(255, ((norm[i] - lo) / span) * 255));
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
  }
  g.putImageData(img, 0, 0);
}
