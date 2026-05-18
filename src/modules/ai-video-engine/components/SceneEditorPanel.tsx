'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ExternalLink, Image as ImageIcon, LayoutTemplate, Wand2 } from 'lucide-react';
import type { GeneratedVideoPlan, VideoScene } from '../types/video-engine.types';
import { CATALOG_BLOCKS, type CatalogBlock } from '../data/catalog-blocks';

const FREE_STOCK_SOURCES = [
  { label: 'Unsplash', url: 'https://unsplash.com/s/photos/' },
  { label: 'Pexels', url: 'https://www.pexels.com/search/' },
  { label: 'Pixabay', url: 'https://pixabay.com/images/search/' },
];

function BlockChip({
  block,
  active,
  onClick,
}: {
  block: CatalogBlock;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={block.name}
      className={`group relative h-14 w-10 shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-150 ${
        active
          ? 'border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)]'
          : 'border-white/10 opacity-60 hover:border-white/25 hover:opacity-90'
      }`}
    >
      <div className={`h-full w-full bg-gradient-to-b ${block.gradientClasses}`} />
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
  const [imgError, setImgError] = useState(false);

  // Sync fields when active scene changes
  useEffect(() => {
    if (!scene) return;
    setSelectedBlockId(deriveBlockId(scene.background_style));
    setImageUrl(scene.imageUrl ?? '');
    setScreenText(scene.screen_text);
    setVoiceover(scene.voiceover);
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
              {CATALOG_BLOCKS.map((block) => (
                <BlockChip
                  key={block.id}
                  block={block}
                  active={selectedBlockId === block.id}
                  onClick={() => setSelectedBlockId(block.id)}
                />
              ))}
            </div>

            {/* Selected block info */}
            <div className="rounded-xl border border-white/8 bg-white/[0.015] p-2.5 text-[10px]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-zinc-200">{selectedBlock.name}</p>
                  <p className="mt-0.5 text-zinc-600">{selectedBlock.description}</p>
                </div>
                <button
                  type="button"
                  onClick={applySuggestion}
                  title="Cargar texto sugerido para este estilo"
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[9px] font-bold text-zinc-500 transition hover:border-yellow-400/20 hover:text-yellow-300"
                >
                  <Wand2 className="h-2.5 w-2.5" />
                  Sugerir texto
                </button>
              </div>
              <p className="mt-1.5 text-[9px] leading-relaxed text-zinc-700">
                {selectedBlock.sample_visual_prompt}
              </p>
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
              <div className="h-16 w-full overflow-hidden rounded-lg border border-white/8">
                <img
                  src={imageUrl}
                  alt="preview"
                  className="h-full w-full object-cover"
                  onError={() => setImgError(true)}
                />
              </div>
            )}
            {imageUrl && imgError && (
              <p className="text-[9px] text-red-400">No se pudo cargar la imagen. Verifica la URL.</p>
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
