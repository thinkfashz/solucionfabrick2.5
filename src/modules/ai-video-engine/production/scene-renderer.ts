import type { VideoScene } from '../types/video-engine.types';

const SCENE_COLORS: Record<string, readonly [string, string]> = {
  blueprint:       ['#0c1a2e', '#000000'],
  metal:           ['#27272a', '#09090b'],
  premium:         ['#451a03', '#09090b'],
  concrete:        ['#292524', '#000000'],
  'dark-grid':     ['#0f0f0f', '#000000'],
  'dark_editorial':['#0f0f0f', '#000000'],
  cinematic:       ['#1c0a00', '#000000'],
  minimal:         ['#18181b', '#000000'],
  technical:       ['#0a1628', '#000000'],
};

function sceneColors(style: string): readonly [string, string] {
  for (const [key, colors] of Object.entries(SCENE_COLORS)) {
    if (style.includes(key)) return colors;
  }
  return ['#18181b', '#000000'];
}

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
  if (line) {
    ctx.fillText(line, x, currentY);
    currentY += lineH;
  }
  return currentY;
}

/**
 * Renders one frame of a scene onto a 2D canvas context.
 * @param progress  0 → 1 (position within this scene's duration)
 */
export function renderSceneFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scene: VideoScene,
  progress: number,
): void {
  ctx.clearRect(0, 0, w, h);

  // ── Background gradient ──
  const [topColor, bottomColor] = sceneColors(scene.background_style);
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, topColor);
  bg.addColorStop(1, bottomColor);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // ── Yellow radial glow top-left ──
  const glow = ctx.createRadialGradient(w * 0.28, h * 0.14, 0, w * 0.28, h * 0.14, w * 0.65);
  glow.addColorStop(0, 'rgba(250,204,21,0.16)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // ── Grid overlay ──
  const grid = Math.max(16, Math.floor(w / 18));
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += grid) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += grid) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // ── Top-bar label ──
  const labelSize = Math.max(10, Math.floor(w * 0.03));
  ctx.font = `700 ${labelSize}px system-ui,-apple-system,sans-serif`;
  ctx.fillStyle = 'rgba(250,204,21,0.75)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('FABRICK STUDIO IA', w * 0.05, h * 0.03);

  ctx.fillStyle = 'rgba(161,161,170,0.55)';
  ctx.textAlign = 'right';
  ctx.fillText(`${scene.start}s–${scene.end}s`, w * 0.95, h * 0.03);
  ctx.textAlign = 'left';

  // ── Animated content (eases in during first 40% of scene) ──
  const ease = Math.min(1, progress / 0.4);
  const slideY = (1 - ease) * h * 0.06;

  ctx.globalAlpha = ease;
  ctx.save();
  ctx.translate(0, slideY);

  const baseY = h * 0.74;
  const padX = w * 0.05;
  const maxW = w * 0.90;

  // Yellow accent bar (grows in)
  const barLen = w * 0.14 * Math.min(1, progress / 0.15);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(padX, baseY - h * 0.055, barLen, Math.max(2, Math.floor(h * 0.004)));

  // Main screen_text
  const bigSize = Math.max(14, Math.floor(w * (scene.screen_text.length > 22 ? 0.062 : 0.075)));
  ctx.font = `900 ${bigSize}px system-ui,-apple-system,sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';
  const afterMain = wrapText(ctx, scene.screen_text, padX, baseY, maxW, bigSize * 1.12);

  // Voiceover text (smaller, capped at ~150 chars)
  const voiceText = scene.voiceover.length > 150 ? scene.voiceover.slice(0, 147) + '…' : scene.voiceover;
  const smallSize = Math.max(10, Math.floor(w * 0.03));
  ctx.font = `${smallSize}px system-ui,-apple-system,sans-serif`;
  ctx.fillStyle = 'rgba(212,212,216,0.65)';
  wrapText(ctx, voiceText, padX, afterMain + h * 0.02, maxW, smallSize * 1.4);

  ctx.restore();
  ctx.globalAlpha = 1;

  // ── Scene number badge (bottom-right) ──
  const badgeR = Math.max(12, Math.floor(w * 0.04));
  const badgeX = w * 0.88;
  const badgeY = h * 0.055;
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.font = `900 ${Math.floor(badgeR * 1.1)}px system-ui,-apple-system,sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(scene.id), badgeX, badgeY);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // ── Scene-transition fade-out (last 10% of scene) ──
  if (progress > 0.9) {
    const fadeAlpha = (progress - 0.9) / 0.1;
    ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
    ctx.fillRect(0, 0, w, h);
  }
}
