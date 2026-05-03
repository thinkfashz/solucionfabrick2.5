'use client';

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Save, Trash2, Eye, ImagePlus, ArrowLeft } from 'lucide-react';
import { MediaPicker } from '@/components/admin/cms/MediaPicker';

export interface BlogEditable {
  id?: string;
  slug?: string;
  title?: string;
  description?: string;
  cover_url?: string | null;
  body_md?: string;
  tags?: string[];
  author?: string | null;
  published?: boolean;
}

interface Props {
  initial: BlogEditable;
  isNew: boolean;
}

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

// Lightweight client-side preview (server still re-renders + sanitizes on save).
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));
}
function previewMd(md: string): string {
  // Very small subset: headings, bold, italic, code, links, paragraphs, lists.
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  for (const raw of lines) {
    const line = raw;
    if (/^\s*$/.test(line)) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push('');
      continue;
    }
    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inline(li[1])}</li>`);
      continue;
    }
    if (inList) { out.push('</ul>'); inList = false; }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }
    out.push(`<p>${inline(line)}</p>`);
  }
  if (inList) out.push('</ul>');
  return out.join('\n');
  function inline(s: string): string {
    let t = escapeHtml(s);
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return t;
  }
}

export function BlogEditor({ initial, isNew }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title ?? '');
  const [slug, setSlug] = useState(initial.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [description, setDescription] = useState(initial.description ?? '');
  const [coverUrl, setCoverUrl] = useState(initial.cover_url ?? '');
  const [body, setBody] = useState(initial.body_md ?? '');
  const [tagsRaw, setTagsRaw] = useState((initial.tags ?? []).join(', '));
  const [author, setAuthor] = useState(initial.author ?? '');
  const [published, setPublished] = useState(Boolean(initial.published));
  const [showPicker, setShowPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugTouched && title) setSlug(slugify(title));
  }, [title, slugTouched]);

  const previewHtml = useMemo(() => previewMd(body), [body]);

  async function handleSave() {
    // Pre-submit validation so we don't even hit the server with an obviously
    // bad payload — reduces "ciegos" 500s when the user expected a friendly error.
    if (!title.trim()) {
      setError('El título es requerido.');
      return;
    }
    if (!slug.trim() || !/^[a-z0-9-]+$/.test(slug.trim())) {
      setError('El slug debe contener solo letras minúsculas, números y guiones.');
      return;
    }
    if (!body.trim()) {
      setError('El contenido (body) no puede estar vacío.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);
      const payload = { title, slug, description, cover_url: coverUrl, body_md: body, tags, author, published };
      const url = isNew ? '/api/admin/blog' : `/api/admin/blog/${initial.id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        post?: { id: string };
        error?: string;
        code?: string;
        hint?: string;
      };
      if (!res.ok) {
        // Surface schema errors with a clickable Setup CTA — the API marks
        // these with code TABLE_MISSING / COLUMN_MISSING and a hint.
        const hint = json.hint ? ` — ${json.hint}` : '';
        throw new Error((json.error || `HTTP ${res.status}`) + hint);
      }
      setMessage('Guardado correctamente.');
      if (isNew && json.post?.id) {
        router.replace(`/admin/blog/${json.post.id}`);
      } else {
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initial.id) return;
    if (!confirm('¿Eliminar esta entrada definitivamente?')) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/blog/${initial.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      router.replace('/admin/blog');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar.');
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/blog" className="flex items-center gap-2 text-xs text-zinc-400 hover:text-yellow-400">
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al blog
        </Link>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-300 hover:border-yellow-400/40 hover:text-yellow-400"
          >
            <Eye className="h-3.5 w-3.5" /> {showPreview ? 'Editar' : 'Preview'}
          </button>
          {!isNew && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 rounded-full border border-red-500/40 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-red-300 hover:bg-red-500/10 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Eliminar
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex items-center gap-2 rounded-full bg-yellow-400 px-5 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-black hover:bg-yellow-300 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Guardar
          </button>
        </div>
      </header>

      {message && <div className="rounded-xl border border-green-500/40 bg-green-500/10 px-3 py-2 text-xs text-green-300">{message}</div>}
      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <Field label="Título">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white" />
          </Field>
          <Field label="Slug" hint="URL pública: /blog/[slug]">
            <input
              value={slug}
              onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }}
              className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white font-mono"
            />
          </Field>
          <Field label="Descripción" hint="Resumen breve (también usado para SEO)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white"
            />
          </Field>
          <Field label="Contenido (Markdown)">
            {showPreview ? (
              <div
                className="prose prose-invert min-h-[400px] max-w-none rounded-lg border border-white/10 bg-black p-4"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={22}
                className="w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-sm text-white font-mono"
                placeholder={'## Encabezado\n\nPárrafo. **Negrita** y _itálica_. [Enlace](https://...)'}
              />
            )}
          </Field>
        </div>

        <div className="space-y-4">
          <Field label="Estado">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-black p-3">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="h-4 w-4 accent-yellow-400"
              />
              <span className="text-sm text-white">{published ? 'Publicado (visible)' : 'Borrador'}</span>
            </label>
          </Field>
          <Field label="Imagen de portada">
            {coverUrl ? (
              <div className="space-y-2">
                <img src={coverUrl} alt="" className="aspect-video w-full rounded-lg border border-white/10 object-cover" />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPicker(true)}
                    className="flex-1 rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-zinc-300 hover:border-yellow-400/40"
                  >
                    Cambiar
                  </button>
                  <button type="button" onClick={() => setCoverUrl('')} className="rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-red-300 hover:border-red-500/40">Quitar</button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-black px-3 py-6 text-xs text-zinc-400 hover:border-yellow-400/40 hover:text-yellow-400"
              >
                <ImagePlus className="h-4 w-4" /> Elegir o subir
              </button>
            )}
            <input
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="O pega una URL externa…"
              className="mt-2 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white"
            />
          </Field>
          <Field label="Tags" hint="Separados por coma">
            <input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white" />
          </Field>
          <Field label="Autor">
            <input value={author ?? ''} onChange={(e) => setAuthor(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white" />
          </Field>
        </div>
      </div>

      <MediaPicker
        open={showPicker}
        defaultFolder="blog"
        onClose={() => setShowPicker(false)}
        onSelect={(asset) => { setCoverUrl(asset.url); setShowPicker(false); }}
      />
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[10px] text-zinc-600">{hint}</span>}
    </label>
  );
}
