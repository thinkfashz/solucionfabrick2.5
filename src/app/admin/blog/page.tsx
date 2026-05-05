'use client';

import BlogUploadPanel from '@/components/admin/BlogUploadPanel';
import SQLSetupGuide from '@/components/admin/SQLSetupGuide';

export default function BlogAdminPage() {
  return (
    <div className="space-y-6 sm:space-y-7 md:space-y-8 pb-12 px-4 sm:px-6 md:px-0">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white mb-2">
          Administración Blog
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-zinc-400">
          Sube y gestiona tus artículos en Markdown.
        </p>
      </div>

      {/* EESTI - SQL Setup Guide */}
      <SQLSetupGuide />

      {/* Panel de Upload */}
      <BlogUploadPanel />

      {/* Info Box */}
      <div className="rounded-lg sm:rounded-xl md:rounded-2xl border border-white/10 bg-zinc-950/50 p-4 sm:p-6 md:p-8 space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-lg md:text-lg font-black uppercase tracking-wide text-yellow-400">
          📚 Cómo Funciona
        </h2>
        <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-zinc-300">
          <p>
            <span className="font-bold text-white">1. Prepara:</span> Crea un .md con contenido y metadatos YAML.
          </p>
          <p>
            <span className="font-bold text-white">2. Sube:</span> Arrastra el archivo al panel.
          </p>
          <p>
            <span className="font-bold text-white">3. Automático:</span> Aparece en el blog al instante.
          </p>
          <p>
            <span className="font-bold text-white">4. Gestiona:</span> Elimina desde el listado cuando necesites.
          </p>
        </div>
      </div>

      {/* Template Info */}
      <div className="rounded-lg sm:rounded-xl md:rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4 sm:p-6 md:p-8 space-y-3 sm:space-y-4">
        <h3 className="text-base sm:text-lg md:text-lg font-black uppercase tracking-wide text-cyan-300">
          📝 Estructura
        </h3>
        <div className="space-y-3 text-xs sm:text-sm text-zinc-300 font-mono bg-black/40 p-3 sm:p-4 rounded-lg overflow-x-auto">
          <pre className="whitespace-pre-wrap sm:whitespace-pre">{`---
title: "Tu Título"
slug: "titulo-en-url"
description: "Breve"
date: "2026-05-04"
author: "Nombre"
cover: "https://url.jpg"
tags: ["tag1"]
---

# Contenido`}</pre>
        </div>
        <p className="text-xs text-zinc-500">
          📖 Ver ejemplo: <span className="text-cyan-400 font-bold">public/blog-ejemplos/README.md</span>
        </p>
      </div>
    </div>
  );
}
