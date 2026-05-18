'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Film, FileText, Sliders } from 'lucide-react';
import { ExportPanel } from './ExportPanel';
import { GeneratedScriptPanel } from './GeneratedScriptPanel';
import { HtmlVideoPreview } from './HtmlVideoPreview';
import { SceneEditorPanel } from './SceneEditorPanel';
import { TokenUsagePanel } from './TokenUsagePanel';
import { VideoPromptForm } from './VideoPromptForm';
import { useVideoEngine } from '../hooks/use-video-engine';

type MobileTab = 'brief' | 'preview' | 'script';

function HyperFrameStrip({
  plan,
  activeSceneIndex,
  setActiveSceneIndex,
}: {
  plan: import('../types/video-engine.types').GeneratedVideoPlan;
  activeSceneIndex: number;
  setActiveSceneIndex: (i: number) => void;
}) {
  if (plan.scenes.length === 0) return null;

  const gradients: Record<string, string> = {
    blueprint: 'from-sky-950 to-zinc-950',
    metal: 'from-zinc-800 to-zinc-950',
    premium: 'from-yellow-950 to-zinc-950',
    concrete: 'from-stone-800 to-zinc-950',
  };

  function bg(style: string) {
    for (const [k, v] of Object.entries(gradients)) {
      if (style.includes(k)) return v;
    }
    return 'from-zinc-900 to-black';
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto px-4 pb-2 pt-1 scrollbar-hide">
      {plan.scenes.map((scene, idx) => {
        const active = idx === activeSceneIndex;
        return (
          <button
            key={scene.id}
            type="button"
            onClick={() => setActiveSceneIndex(idx)}
            className={`group relative h-20 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-200 ${
              active
                ? 'border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.4)]'
                : 'border-white/10 opacity-60 hover:border-white/30 hover:opacity-90'
            }`}
          >
            <div className={`h-full w-full bg-gradient-to-b ${bg(scene.background_style)}`} />
            <div className="absolute inset-0 flex flex-col justify-between p-1">
              <span className={`text-[8px] font-black tabular-nums leading-none ${active ? 'text-yellow-300' : 'text-zinc-500'}`}>
                {String(scene.id).padStart(2, '0')}
              </span>
              <span className="line-clamp-2 text-[7px] leading-tight text-white/70">
                {scene.screen_text}
              </span>
            </div>
            {active && (
              <div className="absolute inset-x-0 bottom-0 h-[3px] bg-yellow-400" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function VideoEngineShell() {
  const engine = useVideoEngine();
  const [mobileTab, setMobileTab] = useState<MobileTab>('brief');

  const tabs: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
    { id: 'brief', label: 'Brief', icon: <Sliders className="h-3.5 w-3.5" /> },
    { id: 'preview', label: 'Preview', icon: <Film className="h-3.5 w-3.5" /> },
    { id: 'script', label: 'Script', icon: <FileText className="h-3.5 w-3.5" /> },
  ];

  const canPrev = engine.activeSceneIndex > 0;
  const canNext = engine.activeSceneIndex < engine.plan.scenes.length - 1;

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col overflow-hidden bg-[#0a0a0a] text-white">

      {/* ── App header ── */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/8 bg-black/60 px-4 py-3 backdrop-blur-xl sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 text-black shadow-[0_0_20px_rgba(250,204,21,0.3)]">
            <Film className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-black tracking-tight text-white">Fabrick Studio IA</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-600">HyperFrame Editor</p>
          </div>
        </div>

        {/* Format toggle */}
        <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 sm:flex">
          {(['9:16', '1:1', '16:9'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => engine.setInput((p) => ({ ...p, format: f }))}
              className={`rounded-full px-3 py-1 text-[10px] font-black tracking-[0.1em] transition-all ${
                engine.input.format === f
                  ? 'bg-yellow-400 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={engine.generate}
          disabled={engine.isGenerating}
          className="flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-black shadow-lg hover:bg-yellow-300 disabled:opacity-50"
        >
          {engine.isGenerating ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-black/30 border-t-black" />
              <span className="hidden sm:inline">Generando…</span>
            </>
          ) : (
            <span>Generar</span>
          )}
        </button>
      </header>

      {/* ── Error banner ── */}
      {engine.error && (
        <div className="mx-4 mt-3 shrink-0 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          {engine.error}
        </div>
      )}

      {/* ── Mobile tab bar ── */}
      <div className="flex shrink-0 border-b border-white/8 lg:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMobileTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold tracking-[0.1em] transition-colors ${
              mobileTab === tab.id
                ? 'border-b-2 border-yellow-400 text-yellow-300'
                : 'border-b-2 border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 3-column desktop / tab-content mobile ── */}
      <div className="min-h-0 flex-1 overflow-hidden lg:grid lg:grid-cols-[280px_1fr_300px]">

        {/* LEFT: Brief form */}
        <div className={`h-full overflow-y-auto border-r border-white/8 bg-[#0c0c0c] scrollbar-hide ${mobileTab === 'brief' ? 'block' : 'hidden lg:block'}`}>
          <VideoPromptForm
            input={engine.input}
            setInput={engine.setInput}
            onGenerate={engine.generate}
            isGenerating={engine.isGenerating}
          />
        </div>

        {/* CENTER: Preview + HyperFrame strip */}
        <div className={`flex h-full flex-col overflow-hidden ${mobileTab === 'preview' ? 'flex' : 'hidden lg:flex'}`}>
          {/* Preview area */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {/* Format toggle on mobile */}
            <div className="mb-4 flex items-center justify-between sm:hidden">
              <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
                {(['9:16', '1:1', '16:9'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => engine.setInput((p) => ({ ...p, format: f }))}
                    className={`rounded-full px-3 py-1 text-[10px] font-black tracking-[0.1em] transition-all ${
                      engine.input.format === f
                        ? 'bg-yellow-400 text-black shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-zinc-600">
                {engine.plan.scenes.length} escenas · {engine.plan.duration}s
              </span>
            </div>

            <HtmlVideoPreview
              plan={engine.plan}
              activeSceneIndex={engine.activeSceneIndex}
              format={engine.input.format}
              isPlaying={engine.isPlaying}
              onTogglePlay={engine.togglePlay}
            />
          </div>

          {/* Scene navigation arrows + counter */}
          {engine.plan.scenes.length > 0 && (
            <div className="flex shrink-0 items-center justify-between border-t border-white/8 px-4 py-2">
              <button
                type="button"
                disabled={!canPrev}
                onClick={() => engine.setActiveSceneIndex(engine.activeSceneIndex - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-zinc-400 transition hover:border-white/20 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[11px] font-bold tabular-nums text-zinc-500">
                {engine.activeSceneIndex + 1} / {engine.plan.scenes.length}
              </span>
              <button
                type="button"
                disabled={!canNext}
                onClick={() => engine.setActiveSceneIndex(engine.activeSceneIndex + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-zinc-400 transition hover:border-white/20 hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* HyperFrame strip */}
          <div className="shrink-0 border-t border-white/8 bg-black/40 py-2">
            <p className="mb-1.5 px-4 text-[8px] font-black uppercase tracking-[0.28em] text-zinc-700">
              HyperFrames
            </p>
            <HyperFrameStrip
              plan={engine.plan}
              activeSceneIndex={engine.activeSceneIndex}
              setActiveSceneIndex={engine.setActiveSceneIndex}
            />
          </div>
        </div>

        {/* RIGHT: Script + Export */}
        <div className={`h-full overflow-y-auto border-l border-white/8 bg-[#0c0c0c] scrollbar-hide ${mobileTab === 'script' ? 'block' : 'hidden lg:block'}`}>
          <div className="space-y-3 p-4">
            <SceneEditorPanel
              plan={engine.plan}
              activeSceneIndex={engine.activeSceneIndex}
              onUpdateScene={engine.updateScene}
            />
            <GeneratedScriptPanel plan={engine.plan} />
            {engine.tokenUsage && (
              <TokenUsagePanel usage={engine.tokenUsage} />
            )}
            <ExportPanel
              plan={engine.plan}
              activeSceneIndex={engine.activeSceneIndex}
              runId={engine.runId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
