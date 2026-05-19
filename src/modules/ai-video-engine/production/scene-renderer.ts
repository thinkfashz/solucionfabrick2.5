import type { VideoScene } from '../types/video-engine.types';

// ── Color palette per background style ──────────────────────────────────────
const SCENE_COLORS: Record<string, readonly [string, string]> = {
  blueprint:        ['#0c1a2e', '#000000'],
  metal:            ['#27272a', '#09090b'],
  premium:          ['#451a03', '#09090b'],
  concrete:         ['#292524', '#000000'],
  'dark-grid':      ['#0a0a0a', '#000000'],
  'dark_editorial': ['#0a0a0a', '#000000'],
  cinematic:        ['#1c0a00', '#000000'],
  minimal:          ['#18181b', '#000000'],
  technical:        ['#0a1628', '#000000'],
};

function sceneColors(style: string): readonly [string, string] {
  for (const [key, colors] of Object.entries(SCENE_COLORS)) {
    if (style.includes(key)) return colors;
  }
  return ['#18181b', '#000000'];
}

// ── Easing: cubic ease-in-out ────────────────────────────────────────────────
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ── Text wrap helper ─────────────────────────────────────────────────────────
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
): number {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineH;
    } else {
      line = test;
    }
  }
  if (line) { ctx.fillText(line, x, currentY); currentY += lineH; }
  return currentY;
}

// ── Cover-fit image onto canvas rect ────────────────────────────────────────
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number, dy: number, dw: number, dh: number,
): void {
  const imgAspect = img.naturalWidth / img.naturalHeight;
  const canvasAspect = dw / dh;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (imgAspect > canvasAspect) {
    sw = img.naturalHeight * canvasAspect;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / canvasAspect;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

/**
 * Renders one frame of a VideoScene onto a 2D canvas context.
 *
 * @param progress  0 → 1 — position within this scene's duration
 * @param bgImage   Pre-loaded background image (crossOrigin=anonymous).
 *                  Drawn with Ken Burns effect + overlay for text readability.
 *
 * Animation is driven by scene.transition:
 *   fade-up | fade-down | slide-left | slide-right | zoom-in | zoom-out | cut | dissolve
 */
export function renderSceneFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scene: VideoScene,
  progress: number,
  bgImage?: HTMLImageElement | null,
): void {
  ctx.clearRect(0, 0, w, h);

  // ── 1. Background gradient ───────────────────────────────────────────────
  const [topColor, bottomColor] = sceneColors(scene.background_style);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, topColor);
  grad.addColorStop(1, bottomColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // ── 2. Background image — Ken Burns slow zoom (1.0 → 1.06 over scene) ───
  if (bgImage && bgImage.naturalWidth > 0) {
    ctx.save();
    const kbScale = 1 + progress * 0.06;
    const scaledW = w * kbScale;
    const scaledH = h * kbScale;
    const ox = (scaledW - w) / 2;
    const oy = (scaledH - h) / 2;
    ctx.globalAlpha = 0.48;
    drawImageCover(ctx, bgImage, -ox, -oy, scaledW, scaledH);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── 3. Bottom readability gradient (always, ensures text is legible) ─────
  const readability = ctx.createLinearGradient(0, h * 0.38, 0, h);
  readability.addColorStop(0,   'rgba(0,0,0,0)');
  readability.addColorStop(0.5, 'rgba(0,0,0,0.55)');
  readability.addColorStop(1,   'rgba(0,0,0,0.88)');
  ctx.fillStyle = readability;
  ctx.fillRect(0, 0, w, h);

  // ── 4. Yellow radial glow (top-left) ─────────────────────────────────────
  const glow = ctx.createRadialGradient(w * 0.28, h * 0.14, 0, w * 0.28, h * 0.14, w * 0.65);
  glow.addColorStop(0, 'rgba(250,204,21,0.14)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // ── 5. Grid overlay ───────────────────────────────────────────────────────
  const grid = Math.max(16, Math.floor(w / 18));
  ctx.strokeStyle = 'rgba(255,255,255,0.028)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += grid) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += grid) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // ── 6. Top-bar brand + timing ─────────────────────────────────────────────
  const labelSize = Math.max(9, Math.floor(w * 0.028));
  ctx.font = `700 ${labelSize}px system-ui,-apple-system,sans-serif`;
  ctx.fillStyle = 'rgba(250,204,21,0.70)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('FABRICK STUDIO', w * 0.05, h * 0.028);

  ctx.fillStyle = 'rgba(161,161,170,0.45)';
  ctx.textAlign = 'right';
  ctx.fillText(`${scene.start}s – ${scene.end}s`, w * 0.95, h * 0.028);
  ctx.textAlign = 'left';

  // ── 7. Entrance animation — driven by scene.transition ───────────────────
  // Entrance eases in over the first 45% of the scene duration
  const easeRaw   = Math.min(1, progress / 0.45);
  const eased     = easeInOutCubic(easeRaw);
  const transition = scene.transition ?? 'fade-up';

  let alpha  = 1;
  let tx = 0, ty = 0;
  let scale  = 1;
  const SLIDE_Y = h * 0.075;
  const SLIDE_X = w * 0.13;

  switch (transition) {
    case 'cut':
      alpha = 1;
      break;
    case 'dissolve':
      alpha = eased;
      break;
    case 'fade-up':
      alpha = eased;
      ty    = SLIDE_Y * (1 - eased);
      break;
    case 'fade-down':
      alpha = eased;
      ty    = -SLIDE_Y * (1 - eased);
      break;
    case 'slide-left':
      // content arrives from the right
      alpha = Math.min(1, eased * 1.8);
      tx    = SLIDE_X * (1 - eased);
      break;
    case 'slide-right':
      // content arrives from the left
      alpha = Math.min(1, eased * 1.8);
      tx    = -SLIDE_X * (1 - eased);
      break;
    case 'zoom-in':
      alpha = eased;
      scale = 0.82 + 0.18 * eased;   // 0.82 → 1.0
      break;
    case 'zoom-out':
      alpha = eased;
      scale = 1.18 - 0.18 * eased;   // 1.18 → 1.0
      break;
    default:
      alpha = eased;
      ty    = SLIDE_Y * (1 - eased);
  }

  // Apply transform
  ctx.globalAlpha = alpha;
  ctx.save();

  if (scale !== 1) {
    // Scale around the content anchor point (center-bottom of content block)
    const cx = w / 2;
    const cy = h * 0.80;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
  }
  if (tx !== 0 || ty !== 0) {
    ctx.translate(tx, ty);
  }

  const baseY = h * 0.76;
  const padX  = w * 0.05;
  const maxW  = w * 0.88;

  // Yellow accent bar — grows in quickly during the first 18% of scene
  const barProgress = Math.min(1, progress / 0.18);
  const barLen = w * 0.13 * barProgress;
  if (barLen > 0) {
    ctx.fillStyle = '#facc15';
    ctx.fillRect(padX, baseY - h * 0.052, barLen, Math.max(2, Math.floor(h * 0.0042)));
  }

  // Main screen_text — large, bold, white
  const isLong   = scene.screen_text.length > 20;
  const bigSize  = Math.max(13, Math.floor(w * (isLong ? 0.058 : 0.072)));
  ctx.font        = `900 ${bigSize}px system-ui,-apple-system,sans-serif`;
  ctx.fillStyle   = '#ffffff';
  ctx.textBaseline = 'alphabetic';

  // Subtle text shadow for legibility over images
  ctx.shadowColor   = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur    = Math.floor(bigSize * 0.5);
  ctx.shadowOffsetY = 2;
  const afterMain  = wrapText(ctx, scene.screen_text, padX, baseY, maxW, bigSize * 1.14);
  ctx.shadowColor  = 'transparent';
  ctx.shadowBlur   = 0;
  ctx.shadowOffsetY = 0;

  // Voiceover text — smaller, dimmer, capped at 150 chars
  const voiceText = scene.voiceover.length > 150
    ? scene.voiceover.slice(0, 147) + '…'
    : scene.voiceover;
  const smallSize  = Math.max(9, Math.floor(w * 0.029));
  ctx.font         = `400 ${smallSize}px system-ui,-apple-system,sans-serif`;
  ctx.fillStyle    = 'rgba(212,212,216,0.72)';
  wrapText(ctx, voiceText, padX, afterMain + h * 0.018, maxW, smallSize * 1.45);

  ctx.restore();
  ctx.globalAlpha = 1;

  // ── 8. Scene number badge (bottom-right circle) ───────────────────────────
  const badgeR = Math.max(11, Math.floor(w * 0.038));
  const badgeX = w * 0.88;
  const badgeY = h * 0.052;
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle    = '#000000';
  ctx.font         = `900 ${Math.floor(badgeR * 1.05)}px system-ui,-apple-system,sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(scene.id), badgeX, badgeY);
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'alphabetic';

  // ── 9. Transition fade-out (last 10% of scene → black for clean cut) ─────
  if (progress > 0.9) {
    const fadeOut = (progress - 0.9) / 0.1;
    ctx.fillStyle  = `rgba(0,0,0,${fadeOut})`;
    ctx.fillRect(0, 0, w, h);
  }
}
