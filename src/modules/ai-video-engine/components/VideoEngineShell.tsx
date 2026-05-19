'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Film, FileText, Minus, Plus, Sliders } from 'lucide-react';
import { CanvasVideoPreview } from './CanvasVideoPreview';
import { ExportPanel } from './ExportPanel';
import { GeneratedScriptPanel } from './GeneratedScriptPanel';
import { SceneEditorPanel } from './SceneEditorPanel';
import { TokenUsagePanel } from './TokenUsagePanel';
import { VideoPromptForm } from './VideoPromptForm';
import { useVideoEngine } from '../hooks/use-video-engine';
import { ModelStatusBadge } from '@/components/admin/ModelStatusBadge';

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
    metal:     'from-zinc-800 to-zinc-950',
    premium:   'from-yellow-950 to-zinc-950',
    concrete:  'from-stone-800 to-zinc-950',
    cinematic: 'from-amber-950 to-zinc-950',
    minimal:   'from-zinc-900 to-black',
    technical: 'from-sky-950 to-zinc-950',
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
            key={`${scene.id}-${idx}`}
            type="button"
            onClick={() => setActiveSceneIndex(idx)}
            className={`group relative h-20 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-200 ${
              active
                ? 'border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.4)]'
                : 'border-white/10 opacity-60 hover:border-white/30 hover:opacity-90'
            }`}
          >
            {scene.imageUrl ? (
              <img
                src={scene.imageUrl}
                alt=""
                className="h-full w-full object-cover opacity-60"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className={`h-full w-full bg-gradient-to-b ${bg(scene.background_style)}`} />
            )}
            <div className="absolute inset-0 flex flex-col justify-between p-1">
              <span className={`text-[8px] font-black tabular-nums leading-none ${active ? 'text-yellow-300' : 'text-zinc-500'}`}>
                {String(idx + 1).padStart(2, '0')}
              </span>
              <span className="line-clamp-2 text-[7px] leading-tight text-white/70">
                {scene.screen_text}
              </span>
            </div>
            {active && <div className="absolute inset-x-0 bottom-0 h-[3px] bg-yellow-400" />}
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
    { id: 'brief',   label: 'Brief',   icon: <Sliders  className="h-3.5 w-3.5" /> },
    { id: 'preview', label: 'Preview', icon: <Film     className="h-3.5 w-3.5" /> },
    { id: 'script',  label: 'Script',  icon: <FileText className="h-3.5 w-3.5" /> },
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
            <div className="flex items-center gap-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-600">HyperFrame Editor</p>
              <ModelStatusBadge className="hidden sm:inline-flex" />
            </div>
          </div>
        </div>

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

      {/* ── 3-column layout ── */}
      <div className="min-h-0 flex-1 overflow-hidden lg:grid lg:grid-cols-[280px_1fr_300px]">

        {/* LEFT: Brief form */}
        <div className={`h-full overflow-y-auto border-r border-white/8 bg-[#0c0c0c] scrollbar-hide ${mobileTab === 'brief' ? 'block' : 'hidden lg:block'}`}>
          <VideoPromptForm
            input={engine.input}
            setInput={engine.setInput}
            onGenerate={engine.generate}
            isGenerating={engine.isGenerating}
            onImportPlan={engine.importPlan}
          />
        </div>

        {/* CENTER: Preview + navigation */}
        <div className={`flex h-full flex-col overflow-hidden ${mobileTab === 'preview' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="relative min-h-0 flex-1 overflow-y-auto p-4">
            {/* Generating overlay */}
            {engine.isGenerating && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#0a0a0a]/92 backdrop-blur-sm">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-400/20 bg-gradient-to-br from-yellow-400/15 to-amber-600/5 shadow-[0_0_30px_rgba(250,204,21,0.12)]">
                  <Film className="h-8 w-8 animate-pulse text-yellow-400" />
                </div>
                <p className="text-sm font-bold text-zinc-200">Generando plan de video…</p>
                <div className="flex items-center gap-1.5">
                  {[0, 160, 320].map((delay) => (
                    <span
                      key={delay}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-yellow-400"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Mobile format toggle */}
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

            <CanvasVideoPreview
              plan={engine.plan}
              activeSceneIndex={engine.activeSceneIndex}
              format={engine.input.format}
              isPlaying={engine.isPlaying}
              onTogglePlay={engine.togglePlay}
            />
          </div>

          {/* Scene navigation + add/remove */}
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

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="Eliminar escena actual"
                  disabled={engine.plan.scenes.length <= 1}
                  onClick={() => engine.removeScene(engine.activeSceneIndex)}
                  className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/10 text-zinc-600 transition hover:border-red-400/30 hover:text-red-400 disabled:opacity-20"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="min-w-[48px] text-center text-[11px] font-bold tabular-nums text-zinc-500">
                  {engine.activeSceneIndex + 1} / {engine.plan.scenes.length}
                </span>
                <button
                  type="button"
                  title="Añadir escena después"
                  onClick={() => engine.addScene(engine.activeSceneIndex)}
                  className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/10 text-zinc-600 transition hover:border-yellow-400/30 hover:text-yellow-300"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

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

          {/* Generation result banner */}
          {engine.tokenUsage && !engine.isGenerating && (
            <div className="flex shrink-0 items-center gap-2 border-t border-white/8 bg-emerald-500/[0.04] px-4 py-1.5 text-[10px]">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span className="text-zinc-500">
                {engine.tokenUsage.isFree ? '⚡' : '💳'}{' '}
                <span className="font-mono text-zinc-400">
                  {engine.tokenUsage.model.split('/')[1]?.replace(':free', '') ?? engine.tokenUsage.model}
                </span>{' · '}
                {engine.tokenUsage.totalTokens.toLocaleString('es-CL')} tokens{' · '}
                {(engine.tokenUsage.latencyMs / 1000).toFixed(1)}s
              </span>
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
            {engine.tokenUsage && <TokenUsagePanel usage={engine.tokenUsage} />}
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
