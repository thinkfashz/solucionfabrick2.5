'use client';

import {
  CanvasTexture,
  ClampToEdgeWrapping,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type Wrapping,
} from 'three';

/**
 * Texturas procedurales del comparador sísmico (césped, asfalto, cielo y halo).
 *
 * Todo se genera con <canvas> en el cliente: sin assets externos y sin
 * peticiones de red. Si no hay `document` (render en servidor) las fábricas
 * devuelven `null` y los materiales degradan a color plano.
 *
 * El ruido es "fbm de valor" construido con rejillas precalculadas por octava.
 * Las rejillas tienen exactamente el número de celdas que se recorren en el
 * eje X, de modo que la textura es PERFECTAMENTE continua al dar la vuelta
 * (necesario para el skybox esférico y para el césped con RepeatWrapping).
 */

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/** Convierte '#rgb' / '#rrggbb' a [r,g,b] (0-255). */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const v = parseInt(full, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstepF(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0 || 1e-6));
  return t * t * (3 - 2 * t);
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

/**
 * PRNG determinista (mulberry32): mismas texturas en cada carga.
 * Exportado para que `NatureScatter` comparta el mismo generador.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createCanvas(w: number, h: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function finishTexture(canvas: HTMLCanvasElement, wrapS: Wrapping, wrapT: Wrapping): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = wrapS;
  texture.wrapT = wrapT;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Muestreador fbm (fractional Brownian motion) de ruido de valor.
 *
 * - `x` recorre [0, cellsX) y `y` [0, cellsY) (se aclara en Y para no doblar).
 * - Cada octava duplica la frecuencia y el tamaño de la rejilla, así que el
 *   muestreo es continuo en el borde derecho de la textura (sin costura).
 */
export function createFbmSampler(
  cellsX: number,
  cellsY: number,
  octaves: number,
  seed: number,
): (x: number, y: number) => number {
  const grids: Float32Array[] = [];
  for (let o = 0; o < octaves; o++) {
    const gw = cellsX << o;
    const gh = cellsY << o;
    const grid = new Float32Array(gw * gh);
    const rnd = mulberry32((seed * 2654435761 + o * 97) >>> 0);
    for (let i = 0; i < grid.length; i++) grid[i] = rnd();
    grids.push(grid);
  }

  return function sample(x: number, y: number): number {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      const scale = 1 << o;
      const gw = cellsX * scale;
      const gh = cellsY * scale;
      const grid = grids[o];

      let fx = x * scale;
      fx -= Math.floor(fx / gw) * gw; // envolver en X (costura invisible)
      let fy = y * scale;
      if (fy < 0) fy = 0;
      else if (fy > gh - 1e-4) fy = gh - 1e-4; // sin envolver en Y

      const ix = Math.floor(fx);
      const iy = Math.floor(fy);
      const tx = fx - ix;
      const ty = fy - iy;
      const sx = tx * tx * (3 - 2 * tx);
      const sy = ty * ty * (3 - 2 * ty);

      const x0 = ix % gw;
      const x1 = (ix + 1) % gw;
      const y0 = iy < gh ? iy : gh - 1;
      const y1 = iy + 1 < gh ? iy + 1 : gh - 1;

      const v00 = grid[y0 * gw + x0];
      const v10 = grid[y0 * gw + x1];
      const v01 = grid[y1 * gw + x0];
      const v11 = grid[y1 * gw + x1];

      const a = v00 + (v10 - v00) * sx;
      const b = v01 + (v11 - v01) * sx;
      sum += (a + (b - a) * sy) * amp;
      norm += amp;
      amp *= 0.5;
    }
    return sum / norm;
  };
}

// ---------------------------------------------------------------------------
// Césped
// ---------------------------------------------------------------------------

/**
 * Textura de césped tileable (1024 px por defecto).
 * - Ruido multi-octava en verdes (manchas grandes → briznas).
 * - Parches secos puntuales y semillas de brillo.
 * - Trazos finos superpuestos para que de cerca se lea como pasto.
 */
export function createGrassDetailTexture(size = 1024): CanvasTexture | null {
  const canvas = createCanvas(size, size);
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return null;

  const img = ctx.createImageData(size, size);
  const data = img.data;

  const fMacro = createFbmSampler(5, 5, 2, 11); // manchas grandes
  const fMid = createFbmSampler(24, 24, 2, 23); // mechones
  const fBlade = createFbmSampler(128, 128, 1, 37); // briznas

  const dark: [number, number, number] = [44, 66, 26]; // verde sombra
  const light: [number, number, number] = [134, 164, 76]; // verde iluminado
  const dry: [number, number, number] = [154, 150, 86]; // pasto seco

  const rnd = mulberry32(4813);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const macro = fMacro(u * 5, v * 5);
      const mid = fMid(u * 24, v * 24);
      const blade = fBlade(u * 128, v * 128);

      const h = clamp01(macro * 0.46 + mid * 0.34 + blade * 0.2);
      const t = h * h * (3 - 2 * h);
      const g = (blade - 0.5) * 54; // micro-contraste de briznas

      let r = lerp(dark[0], light[0], t) + g;
      let gg = lerp(dark[1], light[1], t) + g * 1.05;
      let b = lerp(dark[2], light[2], t) + g * 0.72;

      // parches secos donde el ruido macro es alto
      const dryK = smoothstepF(0.63, 0.82, macro) * 0.72;
      r = lerp(r, dry[0] + g * 0.4, dryK);
      gg = lerp(gg, dry[1] + g * 0.4, dryK);
      b = lerp(b, dry[2] + g * 0.3, dryK);

      // semillas de brillo (muy espaciadas: apenas un guiño al acercarse)
      if (rnd() < 0.0009) {
        r += 56;
        gg += 60;
        b += 36;
      }

      const i = (y * size + x) * 4;
      data[i] = clampByte(r);
      data[i + 1] = clampByte(gg);
      data[i + 2] = clampByte(b);
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Briznas dibujadas: refuerzan la lectura de césped de cerca.
  ctx.lineWidth = Math.max(1, size / 760);
  const strokes = Math.round(size * 2.2);
  for (let i = 0; i < strokes; i++) {
    const bx = rnd() * size;
    const by = rnd() * size;
    const len = size * (0.005 + rnd() * 0.011);
    const ang = -Math.PI / 2 + (rnd() - 0.5) * 1.1;
    const tone = rnd();
    const a = 0.07 + rnd() * 0.15;
    const sr = Math.round(lerp(38, 150, tone));
    const sg = Math.round(lerp(58, 176, tone));
    const sb = Math.round(lerp(24, 96, tone));
    ctx.strokeStyle = `rgba(${sr},${sg},${sb},${a.toFixed(3)})`;
    const dx = Math.cos(ang) * len;
    const dy = Math.sin(ang) * len;
    // dibujar envuelto en los bordes para mantener la textura tileable
    const offXs = bx < 14 || bx > size - 14 ? [-size, 0, size] : [0];
    const offYs = by < 14 || by > size - 14 ? [-size, 0, size] : [0];
    for (const ox of offXs) {
      for (const oy of offYs) {
        ctx.beginPath();
        ctx.moveTo(bx + ox, by + oy);
        ctx.lineTo(bx + ox + dx, by + oy + dy);
        ctx.stroke();
      }
    }
  }

  return finishTexture(canvas, RepeatWrapping, RepeatWrapping);
}

/**
 * Capa "macro" RGBA del césped: manchas únicas que NO se repiten (repeat 1×1
 * sobre toda la parcela). Superpuesta con opacidad rompe el patrón de tiling
 * del césped de detalle sin necesidad de dos texturas grandes.
 */
export function createGrassMacroTexture(size = 512): CanvasTexture | null {
  const canvas = createCanvas(size, size);
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return null;

  const img = ctx.createImageData(size, size);
  const data = img.data;

  const fA = createFbmSampler(3, 3, 3, 71); // manchas muy grandes
  const fB = createFbmSampler(9, 9, 4, 83); // subdivisión de manchas

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const n = fA(u * 3, v * 3) * 0.58 + fB(u * 9, v * 9) * 0.42;
      const tone = fB(u * 9 + 4.5, v * 9 + 2.5); // tinte descorrelacionado

      // verde neutro de partida (casi invisible sobre el pasto base)
      let r = 96;
      let g = 124;
      let b = 58;
      let alpha = 0.1;

      // vegetación densa / sombra
      const darkK = smoothstepF(0.55, 0.78, n);
      if (darkK > 0) {
        r = lerp(r, 34 + 34 * tone, darkK);
        g = lerp(g, 54 + 40 * tone, darkK);
        b = lerp(b, 22 + 18 * tone, darkK);
        alpha = lerp(alpha, 0.5, darkK);
      }

      // parche soleado / pasto alto
      const lightK = smoothstepF(0.42, 0.2, n);
      if (lightK > 0) {
        r = lerp(r, 156, lightK);
        g = lerp(g, 180, lightK);
        b = lerp(b, 102, lightK);
        alpha = lerp(alpha, 0.34, lightK);
      }

      const i = (y * size + x) * 4;
      data[i] = clampByte(r);
      data[i + 1] = clampByte(g);
      data[i + 2] = clampByte(b);
      data[i + 3] = clampByte(alpha * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return finishTexture(canvas, ClampToEdgeWrapping, ClampToEdgeWrapping);
}

// ---------------------------------------------------------------------------
// Camino (asfalto)
// ---------------------------------------------------------------------------

/**
 * Textura de calzada: `u` cruza el ancho (0..1) y `v` recorre el largo
 * (se repite con `texture.repeat.y`, cuadrada gracias a esa relación).
 * Incluye gris de asfalto granulado, bandas de desgaste de neumáticos,
 * líneas de borde continuas y línea central discontinua periódica.
 */
export function createAsphaltTexture(size = 512): CanvasTexture | null {
  const canvas = createCanvas(size, size);
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return null;

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const fGrain = createFbmSampler(96, 96, 2, 59);
  const fPatch = createFbmSampler(5, 5, 3, 67);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const n = fGrain(u * 96, v * 96) * 0.62 + fPatch(u * 5, v * 5) * 0.38;
      // dos bandas de rodadura ligeramente más oscuras
      const wear =
        Math.exp(-((u - 0.28) * (u - 0.28)) / 0.007) +
        Math.exp(-((u - 0.72) * (u - 0.72)) / 0.007);
      const val = lerp(54, 98, n) * (1 - 0.13 * Math.min(1, wear));
      const i = (y * size + x) * 4;
      data[i] = clampByte(val);
      data[i + 1] = clampByte(val * 1.01);
      data[i + 2] = clampByte(val * 1.07);
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Líneas viales (continuas a los lados, discontinua al centro)
  ctx.fillStyle = 'rgba(232,228,214,0.9)';
  ctx.fillRect(size * 0.052, 0, size * 0.03, size);
  ctx.fillRect(size * 0.918, 0, size * 0.03, size);

  // 1 tramo por tesela: el ciclo de la discontinua queda ≈3 m (como una vía real)
  ctx.fillStyle = 'rgba(238,232,214,0.92)';
  ctx.fillRect(size * 0.483, size * 0.06, size * 0.034, size * 0.42);

  // Desgaste sobre las marcas para que no se vean "recién pintadas"
  const rnd = mulberry32(97);
  for (let i = 0; i < 460; i++) {
    const px = rnd() * size;
    const py = rnd() * size;
    ctx.fillStyle = `rgba(44,46,50,${(0.12 + rnd() * 0.28).toFixed(2)})`;
    ctx.fillRect(px, py, 1 + rnd() * 3, 1 + rnd() * 3);
  }

  return finishTexture(canvas, RepeatWrapping, RepeatWrapping);
}

/**
 * Máscara alfa de la calzada (512×512, ClampToEdge, SIN repetición): se mapea
 * UNA sola vez sobre todo el largo del camino (u = ancho, v = largo), de modo
 * que sirve para "dibujar" la silueta del asfalto:
 *
 * - Cantos meándricos: dos fbm sobre `v` mueven cada borde hacia adentro
 *   entre 0 y ~0,35 m, así la calzada nunca tiene cantos rectos y el césped
 *   parece invadir los bordes.
 * - Cabos rotos: los dos extremos se disuelven en "dedos" de asfalto (el
 *   umbral se desplaza con ruido en `u`), por lo que el camino se pierde
 *   entre el pasto en lugar de terminar en seco con un corte limpio.
 *
 * Se consume con `alphaTest` (descarte binario del material): sin capas
 * transparentes, sin orden de render que resolver y gratis en móvil.
 */
export function createRoadEdgeAlphaTexture(size = 512): CanvasTexture | null {
  const canvas = createCanvas(size, size);
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return null;

  const img = ctx.createImageData(size, size);
  const data = img.data;

  // bordes laterales: variación a lo LARGO del camino (eje y de la textura)
  const fEdgeL = createFbmSampler(1, 6, 3, 131);
  const fEdgeR = createFbmSampler(1, 8, 3, 137);
  // cabos: variación a lo ANCHO (eje x de la textura)
  const fTipSouth = createFbmSampler(9, 1, 3, 149);
  const fTipNorth = createFbmSampler(6, 1, 3, 151);

  const max = size - 1;
  for (let py = 0; py < size; py++) {
    const v = py / max; // 0 = cabo sur (fondo), 1 = cabo norte (viviendas)
    for (let px = 0; px < size; px++) {
      const u = px / max; // 0..1 a lo ancho de la calzada

      // cantos irregulares (los dos lados usan ruido distinto)
      const nL = fEdgeL(0.3, v * 6) * 0.62 + fEdgeL(0.8, v * 18) * 0.38;
      const nR = fEdgeR(0.55, v * 8) * 0.6 + fEdgeR(0.15, v * 24) * 0.4;
      const eL = 0.012 + nL * 0.1;
      const eR = 0.988 - nR * 0.1;
      let a =
        smoothstepF(eL - 0.012, eL + 0.012, u) *
        (1 - smoothstepF(eR - 0.012, eR + 0.012, u));

      // cabo sur: el asfalto se disuelve en los últimos ~5 m
      const south = v + (fTipSouth(u * 9, 0.5) - 0.5) * 0.13;
      a *= smoothstepF(0.008, 0.15, south);

      // cabo norte: disolución corta (~2,5 m) frente a las viviendas
      const north = 1 - v + (fTipNorth(u * 6, 0.5) - 0.5) * 0.07;
      a *= smoothstepF(0.006, 0.085, north);

      const i = (py * size + px) * 4;
      const val = clampByte(a * 255);
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const texture = finishTexture(canvas, ClampToEdgeWrapping, ClampToEdgeWrapping);
  // una máscara no es color: three debe muestrearla en lineal
  texture.colorSpace = NoColorSpace;
  return texture;
}

// ---------------------------------------------------------------------------
// Cielo y sol
// ---------------------------------------------------------------------------

/** Paleta de cielo por preset de luz (day/dusk/night). */
export interface SkyPalette {
  zenith: string; // color en el cenit
  horizon: string; // color en el horizonte (= color de la niebla)
  below: string; // por debajo del horizonte
  cloudLit: string; // cara iluminada de las nubes
  cloudShadow: string; // cara sombreada de las nubes
  cloudCover: number; // cobertura 0..1
  stars: boolean; // aparecen estrellas (y luna vía el halo del sol)
  sunColor: string; // color del halo solar / lunar
  sunSize: number; // escala del sprite de sol / luna
}

/**
 * Skybox procedural: gradiente vertical + dos capas de nubes fbm
 * (cúmulos medios y estratos cerca del horizonte), 1024×512.
 * La textura es continua en U gracias a las rejillas periódicas.
 */
export function createSkyTexture(p: SkyPalette): CanvasTexture | null {
  const canvas = createCanvas(1024, 512);
  const ctx = canvas?.getContext('2d', { willReadFrequently: true });
  if (!canvas || !ctx) return null;

  const W = canvas.width;
  const H = canvas.height;

  const zenith = hexToRgb(p.zenith);
  const horizon = hexToRgb(p.horizon);
  const below = hexToRgb(p.below);
  const cloudLit = hexToRgb(p.cloudLit);
  const cloudShadow = hexToRgb(p.cloudShadow);

  // 1) Gradiente vertical --------------------------------------------------
  const img = ctx.createImageData(W, H);
  const data = img.data;
  for (let y = 0; y < H; y++) {
    const v = 1 - (y + 0.5) / H; // v=1 arriba (como UV de sphereGeometry)
    const e = (v - 0.5) * 2; // -1 bajo el horizonte … 1 en el cenit
    let r: number;
    let g: number;
    let b: number;
    if (e <= 0) {
      const k = clamp01(-e * 4);
      r = lerp(horizon[0], below[0], k);
      g = lerp(horizon[1], below[1], k);
      b = lerp(horizon[2], below[2], k);
    } else {
      const k = Math.pow(clamp01(e), 0.6);
      r = lerp(horizon[0], zenith[0], k);
      g = lerp(horizon[1], zenith[1], k);
      b = lerp(horizon[2], zenith[2], k);
    }
    const row = y * W * 4;
    for (let x = 0; x < W; x++) {
      const i = row + x * 4;
      data[i] = clampByte(r);
      data[i + 1] = clampByte(g);
      data[i + 2] = clampByte(b);
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // 2) Estrellas (por encima del gradiente, por debajo de las nubes) --------
  if (p.stars) {
    const rnd = mulberry32(90210);
    for (let i = 0; i < 950; i++) {
      const s = rnd();
      const v = 0.53 + rnd() * 0.46;
      const a = 0.22 + rnd() * 0.75;
      const size = rnd() < 0.07 ? 2 : 1;
      ctx.fillStyle = `rgba(226,236,255,${a.toFixed(2)})`;
      ctx.fillRect(s * W, (1 - v) * H, size, size);
    }
  }

  // 3) Nubes ---------------------------------------------------------------
  const cover = clamp01(p.cloudCover);
  if (cover > 0.01) {
    const fA = createFbmSampler(16, 6, 4, 311); // cúmulos medios
    const fB = createFbmSampler(20, 8, 3, 419); // estratos de horizonte
    const layer = ctx.getImageData(0, 0, W, H);
    const ld = layer.data;

    // dirección de luz en celdas de textura (constante para todos los presets)
    const lightX = 0.45;
    const lightY = 0.3;

    for (let y = 0; y < H; y++) {
      const v = 1 - (y + 0.5) / H;
      if (v < 0.497) continue; // bajo el horizonte no hay nubes visibles
      const row = y * W * 4;
      const bandA = smoothstepF(0.54, 0.63, v) * (1 - smoothstepF(0.84, 0.985, v));
      const bandB = smoothstepF(0.5, 0.525, v) * (1 - smoothstepF(0.575, 0.645, v));

      for (let x = 0; x < W; x++) {
        const s = (x + 0.5) / W;
        let dens = 0;
        let shade = 0.55;

        if (bandA > 0.002) {
          const cx = s * 16;
          const cy = (v - 0.5) * 7 + 0.35;
          const d1 = fA(cx, cy);
          const dl = fA(cx - lightX, cy - lightY);
          const dd = smoothstepF(0.62 - cover * 0.2, 0.82 - cover * 0.16, d1) * bandA;
          if (dd > dens) {
            dens = dd;
            shade = clamp01(0.42 + (d1 - dl) * 4.2);
          }
        }

        if (bandB > 0.002) {
          const cx = s * 20;
          const cy = (v - 0.5) * 60;
          const d1 = fB(cx, cy);
          const dl = fB(cx - lightX * 1.3, cy - lightY * 1.3);
          const dd = smoothstepF(0.52 - cover * 0.18, 0.7 - cover * 0.14, d1) * bandB * 0.9;
          if (dd > dens) {
            dens = dd;
            shade = clamp01(0.5 + (d1 - dl) * 3.2);
          }
        }

        if (dens <= 0.004) continue;

        // base más oscura en la parte baja de la nube (penumbra del corte)
        const under = 1 - smoothstepF(0.53, 0.66, v);
        const mixK = clamp01(1 - shade + under * 0.45);
        const cr = lerp(cloudLit[0], cloudShadow[0], mixK);
        const cg = lerp(cloudLit[1], cloudShadow[1], mixK);
        const cb = lerp(cloudLit[2], cloudShadow[2], mixK);

        const i = row + x * 4;
        ld[i] = lerp(ld[i], cr, dens);
        ld[i + 1] = lerp(ld[i + 1], cg, dens);
        ld[i + 2] = lerp(ld[i + 2], cb, dens);
      }
    }
    ctx.putImageData(layer, 0, 0);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

/** Halo radial (sol / luna) para el sprite que sigue la posición del sol. */
export function createGlowTexture(color = '#ffffff', size = 128): CanvasTexture | null {
  const canvas = createCanvas(size, size);
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return null;
  const [r, g, b] = hexToRgb(color);
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.14, `rgba(${r},${g},${b},0.9)`);
  grad.addColorStop(0.38, `rgba(${r},${g},${b},0.26)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
