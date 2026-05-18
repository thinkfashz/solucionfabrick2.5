'use client';

import BlogUploadPanel from '@/components/admin/BlogUploadPanel';
import SQLSetupGuide from '@/components/admin/SQLSetupGuide';
import { AdminBaseCard, AdminBaseGrid, AdminBaseMetric, AdminBasePage } from '@/components/admin/baseui-kit';
import { BookOpen, Database, FileText, UploadCloud } from 'lucide-react';

export default function BlogAdminPage() {
  return (
    <AdminBasePage
      eyebrow="Contenido"
      title="Administración Blog"
      description="Sube y gestiona artículos Markdown reales. La publicación depende de la tabla/configuración del blog y no usa artículos demo como datos reales."
    >
      <AdminBaseGrid cols="4">
        <AdminBaseMetric label="Formato" value="Markdown" hint="con frontmatter YAML" />
        <AdminBaseMetric label="Carga" value="Real" hint="BlogUploadPanel" />
        <AdminBaseMetric label="Setup" value="SQL" hint="guía incluida" />
        <AdminBaseMetric label="Demo" value="0" hint="no se publican seeds" />
      </AdminBaseGrid>

      <AdminBaseGrid cols="3">
        <AdminBaseCard title="Setup SQL" description="Valida o crea la base necesaria para guardar artículos." icon={Database} tone="blue" badge="base" />
        <AdminBaseCard title="Subida Markdown" description="Carga archivos .md con metadatos y contenido real." icon={UploadCloud} tone="gold" badge="real" />
        <AdminBaseCard title="Publicación" description="Los artículos aparecen cuando se guardan correctamente." icon={BookOpen} tone="emerald" badge="blog" />
      </AdminBaseGrid>

      <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-5 shadow-[0_20px_90px_rgba(0,0,0,0.35)]">
        <SQLSetupGuide />
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-5 shadow-[0_20px_90px_rgba(0,0,0,0.35)]">
        <BlogUploadPanel />
      </div>

      <AdminBaseCard
        title="Estructura Markdown"
        description="Plantilla técnica para crear artículos reales. Esto es guía de uso, no contenido demo publicado."
        icon={FileText}
        tone="purple"
        badge="guía"
      >
        <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-black/50 p-4 text-xs leading-relaxed text-zinc-300">{`---
title: "Tu Título"
slug: "titulo-en-url"
description: "Breve"
date: "2026-05-04"
author: "Nombre"
cover: "https://url.jpg"
tags: ["tag1"]
---

# Contenido`}</pre>
      </AdminBaseCard>
    </AdminBasePage>
  );
}
