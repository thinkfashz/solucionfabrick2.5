'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ExternalLink, Image as ImageIcon, LayoutTemplate, Wand2 } from 'lucide-react';
import type { GeneratedVideoPlan, VideoScene } from '../types/video-engine.types';
import { CATALOG_BLOCKS, type CatalogBlock } from '../data/catalog-blocks';

const FREE_STOCK_SOURCES = [
  { label: 'Unsplash', url: 'https://unsplash.com/s/photos/' },
  { label: 'Pexels',   url: 'https://www.pexels.com/search/' },
  { label: 'Pixabay',  url: 'https://pixabay.com/images/search/' },
];

const TRANSITIONS = [
  { id: 'fade-up',    label: 'Fade ↑' },
  { id: 'fade-down',  label: 'Fade ↓' },
  { id: 'slide-left', label: '← Slide' },
  { id: 'slide-right',label: 'Slide →' },
  { id: 'zoom-in',    label: 'Zoom +' },
  { id: 'zoom-out',   label: 'Zoom −' },
  { id: 'cut',        label: 'Corte' },
  { id: 'dissolve',   label: 'Dissolve' },
];

function BlockChip({
  block,
  active,
  idx,
  onClick,
}: {
  block: CatalogBlock;
  active: boolean;
  idx: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${block.name} — ${block.description}`}
      className={`group relative h-14 w-10 shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-150 ${
        active
          ? 'border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)]'
          : 'border-white/10 opacity-60 hover:border-white/25 hover:opacity-90'
      }`}
    >
      <div className={`h-full w-full bg-gradient-to-b ${block.gradientClasses}`} />
      {/* Animated motion bar — each block gets a different delay to look unique */}
      <div
        className="absolute left-1 right-1 h-[1.5px] rounded-full bg-white/30"
        style={{
          top: '35%',
          animation: `bounce 1.6s ease-in-out infinite`,
          animationDelay: `${idx * 180}ms`,
        }}
      />
      <div className="absolute inset-x-0 bottom-0 bg-black/70 px-0.5 py-0.5 text-center">
        <span className="block truncate text-[6px] font-bold leading-none text-white/80">{block.name}</span>
      </div>
      {active && <div className="absolute inset-x-0 bottom-[14px] h-[2px] bg-yellow-400" />}
    </button>
  );
}

export function SceneEditorPanel({
  plan,
  activeSceneIndex,
  onUpdateScene,
}: {
  plan: GeneratedVideoPlan;
  activeSceneIndex: number;
  onUpdateScene: (index: number, patch: Partial<VideoScene>) => void;
}) {
  const [open, setOpen] = useState(false);

  const scene = plan.scenes[activeSceneIndex];

  const deriveBlockId = (style: string) =>
    CATALOG_BLOCKS.find((b) => style.includes(b.styleKeyword))?.id ?? CATALOG_BLOCKS[0].id;

  const [selectedBlockId, setSelectedBlockId] = useState<string>(() =>
    scene ? deriveBlockId(scene.background_style) : CATALOG_BLOCKS[0].id,
  );
  const [imageUrl, setImageUrl] = useState(scene?.imageUrl ?? '');
  const [screenText, setScreenText] = useState(scene?.screen_text ?? '');
  const [voiceover, setVoiceover] = useState(scene?.voiceover ?? '');
  const [transition, setTransition] = useState(scene?.transition ?? 'fade-up');
  const [imgError, setImgError] = useState(false);

  // Sync fields when active scene changes
  useEffect(() => {
    if (!scene) return;
    setSelectedBlockId(deriveBlockId(scene.background_style));
    setImageUrl(scene.imageUrl ?? '');
    setScreenText(scene.screen_text);
    setVoiceover(scene.voiceover);
    setTransition(scene.transition ?? 'fade-up');
    setImgError(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSceneIndex, scene?.background_style]);

  if (!scene || plan.scenes.length === 0) return null;

  const selectedBlock = CATALOG_BLOCKS.find((b) => b.id === selectedBlockId)!;

  function applyChanges() {
    const patch: Partial<VideoScene> = {
      background_style: selectedBlock.styleKeyword,
      screen_text: screenText.trim() || scene.screen_text,
      voiceover: voiceover.trim() || scene.voiceover,
      visual_prompt: selectedBlock.sample_visual_prompt,
      transition,
    };
    if (imageUrl.trim()) {
      patch.imageUrl = imageUrl.trim();
    } else {
      patch.imageUrl = undefined;
    }
    onUpdateScene(activeSceneIndex, patch);
  }

  function applySuggestion() {
    setScreenText(selectedBlock.sample_screen_text);
    setVoiceover(selectedBlock.sample_voiceover);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02]">
      {/* Accordion header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 transition hover:bg-white/[0.03]"
      >
        <div className="flex items-center gap-2">
          <LayoutTemplate className="h-3.5 w-3.5 text-yellow-400" />
          <span className="text-[11px] font-bold text-zinc-300">Editor de escena</span>
          <span className="rounded-full border border-yellow-400/20 bg-yellow-400/8 px-2 py-0.5 text-[10px] font-black tabular-nums text-yellow-300">
            {activeSceneIndex + 1} / {plan.scenes.length}
          </span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-zinc-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-white/8 px-3 pb-4 pt-3">

          {/* ── Block type selector ── */}
          <div className="space-y-2">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-600">
              Tipo de escena
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {CATALOG_BLOCKS.map((block, idx) => (
                <BlockChip
                  key={block.id}
                  block={block}
                  active={selectedBlockId === block.id}
                  idx={idx}
                  onClick={() => setSelectedBlockId(block.id)}
                />
              ))}
            </div>

            {/* Animated block preview */}
            <div className={`relative h-20 w-full overflow-hidden rounded-xl bg-gradient-to-b ${selectedBlock.gradientClasses}`}>
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:18px_18px]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(250,204,21,0.15),transparent_55%)]" />
              <div className="absolute bottom-3 left-3 right-3 space-y-1">
                <div className="h-[2px] w-8 animate-pulse rounded-full bg-yellow-400" />
                <p className="text-[10px] font-black text-white drop-shadow">{selectedBlock.sample_screen_text}</p>
              </div>
              <div className="absolute right-2 top-2 rounded-full bg-black/40 px-1.5 py-0.5 text-[8px] font-bold text-zinc-400 backdrop-blur">
                {selectedBlock.name}
              </div>
            </div>

            {/* Info + suggest button */}
            <div className="flex items-center justify-between gap-2 text-[10px]">
              <p className="text-zinc-600">{selectedBlock.description}</p>
              <button
                type="button"
                onClick={applySuggestion}
                className="flex shrink-0 items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[9px] font-bold text-zinc-500 transition hover:border-yellow-400/20 hover:text-yellow-300"
              >
                <Wand2 className="h-2.5 w-2.5" />
                Texto sugerido
              </button>
            </div>
          </div>

          {/* ── Image URL ── */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <ImageIcon className="h-3 w-3 text-zinc-600" />
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-600">
                Imagen de fondo
              </p>
            </div>
            <input
              type="url"
              placeholder="https://… Cloudinary URL, Unsplash, Pexels…"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-white outline-none transition focus:border-yellow-400/40 placeholder:text-zinc-700"
              value={imageUrl}
              onChange={(e) => { setImageUrl(e.target.value); setImgError(false); }}
            />

            {/* Image preview */}
            {imageUrl && !imgError && (
              <div className="h-20 w-full overflow-hidden rounded-lg border border-white/8">
                <img
                  src={imageUrl}
                  alt="preview"
                  crossOrigin="anonymous"
                  className="h-full w-full object-cover"
                  onError={() => setImgError(true)}
                  onLoad={() => setImgError(false)}
                />
              </div>
            )}
            {imageUrl && imgError && (
              <p className="text-[9px] text-amber-400">
                La imagen no pudo cargarse en el preview (puede ser restricción CORS del servidor). Prueba con una URL de Cloudinary, Unsplash o Pexels.
              </p>
            )}

            {/* Free stock hints */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[9px] text-zinc-700">Imágenes libres:</span>
              {FREE_STOCK_SOURCES.map((src) => (
                <a
                  key={src.label}
                  href={`${src.url}${encodeURIComponent(selectedBlock.unsplash_hint)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-0.5 rounded-full border border-white/8 px-2 py-0.5 text-[9px] text-zinc-600 transition hover:border-white/15 hover:text-zinc-400"
                >
                  {src.label}
                  <ExternalLink className="h-2 w-2" />
                </a>
              ))}
            </div>
          </div>

          {/* ── Screen text ── */}
          <div className="space-y-1.5">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-600">
              Texto en pantalla
            </p>
            <input
              type="text"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-white outline-none transition focus:border-yellow-400/40 placeholder:text-zinc-700"
              value={screenText}
              onChange={(e) => setScreenText(e.target.value)}
            />
          </div>

          {/* ── Voiceover ── */}
          <div className="space-y-1.5">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-600">
              Voiceover
            </p>
            <textarea
              rows={3}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-white outline-none transition focus:border-yellow-400/40 placeholder:text-zinc-700"
              value={voiceover}
              onChange={(e) => setVoiceover(e.target.value)}
            />
          </div>

          {/* ── Transition ── */}
          <div className="space-y-1.5">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-600">
              Transición de entrada
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TRANSITIONS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTransition(t.id)}
                  className={`rounded-lg border px-2 py-1 text-[9px] font-bold transition-all ${
                    transition === t.id
                      ? 'border-yellow-400/40 bg-yellow-400/10 text-yellow-300'
                      : 'border-white/10 text-zinc-600 hover:border-white/20 hover:text-zinc-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Apply button ── */}
          <button
            type="button"
            onClick={applyChanges}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-yellow-400/25 bg-yellow-400/8 py-2.5 text-[11px] font-bold text-yellow-300 transition hover:bg-yellow-400/15 active:bg-yellow-400/20"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Aplicar a escena {activeSceneIndex + 1}
          </button>

          <p className="text-[9px] leading-relaxed text-zinc-700">
            Los cambios actualizan la previsualización al instante sin re-llamar a la IA.
          </p>
        </div>
      )}
    </div>
  );
}
