'use client';

import { ExportPanel } from './ExportPanel';
import { GeneratedScriptPanel } from './GeneratedScriptPanel';
import { HtmlVideoPreview } from './HtmlVideoPreview';
import { SceneTimeline } from './SceneTimeline';
import { VideoPromptForm } from './VideoPromptForm';
import { useVideoEngine } from '../hooks/use-video-engine';

export function VideoEngineShell() {
  const engine = useVideoEngine();

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-[2rem] border border-white/10 bg-zinc-950 p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-yellow-400">Modulo independiente</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.07em] text-white sm:text-6xl">Fabrick Studio IA</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300">Genera guiones, escenas, previews HTML y piezas visuales para campanas de construccion, metalcon y remodelaciones.</p>
        </header>
        {engine.error ? <div className="mb-6 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{engine.error}</div> : null}
        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)_320px]">
          <VideoPromptForm input={engine.input} setInput={engine.setInput} onGenerate={engine.generate} isGenerating={engine.isGenerating} />
          <div className="space-y-6"><HtmlVideoPreview plan={engine.plan} activeSceneIndex={engine.activeSceneIndex} /><GeneratedScriptPanel plan={engine.plan} /></div>
          <aside className="space-y-6"><SceneTimeline plan={engine.plan} activeSceneIndex={engine.activeSceneIndex} setActiveSceneIndex={engine.setActiveSceneIndex} /><ExportPanel plan={engine.plan} activeSceneIndex={engine.activeSceneIndex} runId={engine.runId} /></aside>
        </div>
      </div>
    </main>
  );
}
