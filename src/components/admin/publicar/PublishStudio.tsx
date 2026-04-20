'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  GripVertical,
  ImagePlus,
  Loader2,
  Save,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import SocialPostCard, {
  type SocialPostData,
  type SocialPostTheme,
} from './SocialPostCard';
import HistoryTable, { type HistoryRow } from './HistoryTable';

const MAX_IMAGES = 10;

interface UploadedImage {
  url: string;
  path?: string;
  localId: string;
  uploading?: boolean;
  error?: string;
}

interface Platforms {
  instagram: boolean;
  facebook: boolean;
  tiktok: boolean;
}

interface FormState {
  titulo: string;
  fecha: string;
  tag: string;
  descripcion: string;
  cta: string;
  hashtagInput: string;
  hashtags: string[];
  tema: SocialPostTheme;
  programarEn: string; // datetime-local
}

type Status =
  | { kind: 'idle' }
  | { kind: 'working'; label: string }
  | { kind: 'success'; label: string }
  | { kind: 'error'; label: string };

const TAGS_SUGGESTED = [
  'Proyecto',
  'Ampliación',
  'Metalcon',
  'Remodelación',
  'Gasfitería',
  'Eléctrica',
];

function todayLabel(): string {
  return new Date().toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function nowLocalInputValue(offsetMinutes = 60): string {
  const d = new Date(Date.now() + offsetMinutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function uid(): string {
  return Math.random().toString(36).slice(2);
}

export default function PublishStudio() {
  const [form, setForm] = useState<FormState>({
    titulo: '',
    fecha: todayLabel(),
    tag: '',
    descripcion: '',
    cta: 'Cotiza tu proyecto',
    hashtagInput: '',
    hashtags: ['SolucionesFabrick', 'Construccion', 'Maule'],
    tema: 'amarillo',
    programarEn: nowLocalInputValue(),
  });

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [platforms, setPlatforms] = useState<Platforms>({
    instagram: true,
    facebook: true,
    tiktok: false,
  });

  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [dragOver, setDragOver] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const dragIndexRef = useRef<number | null>(null);

  /* ── Derived post shown in the preview ─────────────────────────────── */
  const post: SocialPostData = useMemo(
    () => ({
      titulo: form.titulo,
      descripcion: form.descripcion,
      tag: form.tag,
      fecha: form.fecha,
      cta: form.cta,
      hashtags: form.hashtags,
      image: images[activeImage]?.url ?? null,
      tema: form.tema,
    }),
    [form, images, activeImage],
  );

  /* ── History fetch ────────────────────────────────────────────────── */
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/admin/social/posts?limit=30', { cache: 'no-store' });
      const json = (await res.json()) as { data?: HistoryRow[] };
      setHistory(Array.isArray(json.data) ? json.data : []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  /* ── Preview keyboard navigation (←/→) ────────────────────────────── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (images.length < 2) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowLeft') setActiveImage((i) => (i - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') setActiveImage((i) => (i + 1) % images.length);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [images.length]);

  useEffect(() => {
    if (activeImage >= images.length) setActiveImage(Math.max(0, images.length - 1));
  }, [images.length, activeImage]);

  /* ── Upload helpers ───────────────────────────────────────────────── */
  async function uploadOne(file: File, localId: string) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/admin/social/upload', { method: 'POST', body: formData });
    const json = (await res.json()) as { url?: string; path?: string; error?: string };
    if (!res.ok || !json.url) {
      throw new Error(json.error || `Error ${res.status}`);
    }
    setImages((arr) =>
      arr.map((img) =>
        img.localId === localId ? { ...img, uploading: false, url: json.url!, path: json.path } : img,
      ),
    );
  }

  async function ingestFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    setImages((current) => {
      const remaining = MAX_IMAGES - current.length;
      if (remaining <= 0) return current;
      const toAdd = files.slice(0, remaining).map((file) => {
        const localId = uid();
        const url = URL.createObjectURL(file);
        // Kick off upload right away.
        uploadOne(file, localId).catch((err) => {
          setImages((arr) =>
            arr.map((img) =>
              img.localId === localId
                ? { ...img, uploading: false, error: (err as Error).message }
                : img,
            ),
          );
        });
        return { url, localId, uploading: true } as UploadedImage;
      });
      return [...current, ...toAdd];
    });
  }

  function removeImage(localId: string) {
    setImages((arr) => arr.filter((img) => img.localId !== localId));
  }

  function moveImage(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= images.length || to >= images.length) return;
    setImages((arr) => {
      const next = arr.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setActiveImage(to);
  }

  /* ── Hashtag chips ────────────────────────────────────────────────── */
  function addHashtag(raw: string) {
    const cleaned = raw
      .replace(/[^\w\sáéíóúñÁÉÍÓÚÑ#-]/g, '')
      .replace(/^#/, '')
      .trim();
    if (!cleaned) return;
    setForm((f) =>
      f.hashtags.includes(cleaned) || f.hashtags.length >= 15
        ? { ...f, hashtagInput: '' }
        : { ...f, hashtags: [...f.hashtags, cleaned], hashtagInput: '' },
    );
  }
  function removeHashtag(tag: string) {
    setForm((f) => ({ ...f, hashtags: f.hashtags.filter((h) => h !== tag) }));
  }

  /* ── Actions ──────────────────────────────────────────────────────── */
  function buildCaption(): string {
    const parts = [form.titulo, form.descripcion, form.cta ? `👉 ${form.cta}` : ''].filter(Boolean);
    const tags = form.hashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' ');
    return [parts.join('\n\n'), tags].filter(Boolean).join('\n\n');
  }

  function buildPayload(estado: 'borrador' | 'programado' | 'publicado') {
    const uploadedUrls = images.filter((i) => !i.uploading && !i.error).map((i) => i.url);
    return {
      titulo: form.titulo,
      descripcion: form.descripcion,
      hashtags: form.hashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' '),
      tag: form.tag,
      fecha_publicacion:
        estado === 'programado'
          ? new Date(form.programarEn).toISOString()
          : new Date().toISOString(),
      tema: form.tema,
      imagenes: uploadedUrls,
      plataformas: platforms,
      estado,
    };
  }

  async function saveDraft() {
    if (!form.titulo.trim()) {
      setStatus({ kind: 'error', label: 'El título es obligatorio.' });
      return;
    }
    setStatus({ kind: 'working', label: 'Guardando borrador…' });
    try {
      const res = await fetch('/api/admin/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload('borrador')),
      });
      if (!res.ok && res.status !== 202) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setStatus({ kind: 'success', label: 'Borrador guardado.' });
      loadHistory();
    } catch (err) {
      setStatus({ kind: 'error', label: (err as Error).message });
    }
  }

  async function schedule() {
    if (!form.titulo.trim()) {
      setStatus({ kind: 'error', label: 'El título es obligatorio.' });
      return;
    }
    const when = new Date(form.programarEn);
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now()) {
      setStatus({ kind: 'error', label: 'Selecciona una fecha/hora futura válida.' });
      return;
    }
    setStatus({ kind: 'working', label: 'Programando…' });
    try {
      const res = await fetch('/api/admin/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload('programado')),
      });
      if (!res.ok && res.status !== 202) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setStatus({
        kind: 'success',
        label: `Programado para ${when.toLocaleString('es-CL')}.`,
      });
      loadHistory();
    } catch (err) {
      setStatus({ kind: 'error', label: (err as Error).message });
    }
  }

  async function downloadPng() {
    setStatus({ kind: 'working', label: 'Renderizando PNG 1080×1080…' });
    try {
      const node = exportRef.current;
      if (!node) throw new Error('Nada para exportar.');
      // Dynamic import keeps html2canvas out of the main bundle.
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(node, {
        width: 1080,
        height: 1080,
        windowWidth: 1080,
        windowHeight: 1080,
        useCORS: true,
        backgroundColor: null,
        scale: 1,
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      const slug = (form.titulo || 'post').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
      a.download = `fabrick-${slug || 'post'}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setStatus({ kind: 'success', label: 'PNG descargado.' });
    } catch (err) {
      setStatus({ kind: 'error', label: (err as Error).message });
    }
  }

  async function publishNow() {
    if (!form.titulo.trim()) {
      setStatus({ kind: 'error', label: 'El título es obligatorio.' });
      return;
    }
    const uploadedUrls = images.filter((i) => !i.uploading && !i.error).map((i) => i.url);
    if (uploadedUrls.length === 0) {
      setStatus({ kind: 'error', label: 'Sube al menos una imagen antes de publicar.' });
      return;
    }
    if (images.some((i) => i.uploading)) {
      setStatus({ kind: 'error', label: 'Espera a que terminen las subidas de imágenes.' });
      return;
    }

    const apiTargets = { instagram: platforms.instagram, facebook: platforms.facebook };
    if (!apiTargets.instagram && !apiTargets.facebook) {
      setStatus({
        kind: 'error',
        label: 'TikTok no tiene API pública — descarga el PNG. Selecciona Instagram o Facebook para publicar.',
      });
      return;
    }

    setStatus({ kind: 'working', label: 'Publicando en Meta…' });
    try {
      const res = await fetch('/api/admin/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrls: uploadedUrls,
          caption: buildCaption(),
          platforms: apiTargets,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        results?: Array<{ platform: string; ok: boolean; postId?: string; error?: string }>;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        const failing = json.results?.find((r) => !r.ok)?.error || json.error || 'Publicación rechazada.';
        throw new Error(failing);
      }

      const metaId = json.results?.find((r) => r.ok)?.postId ?? null;
      // Persist history row
      await fetch('/api/admin/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...buildPayload('publicado'), meta_post_id: metaId }),
      });

      const parts = (json.results ?? []).map(
        (r) => `${r.platform}: ${r.ok ? '✓' : r.error ?? 'falló'}`,
      );
      setStatus({ kind: 'success', label: `Publicado — ${parts.join(' · ')}` });
      loadHistory();
    } catch (err) {
      setStatus({ kind: 'error', label: (err as Error).message });
    }
  }

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <header className="mb-6 flex flex-col gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">
          Redes sociales · Meta Graph API
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight md:text-4xl">
          Publicar en Instagram · Facebook · TikTok
        </h1>
        <p className="text-sm text-zinc-400">
          Crea un post, previsualízalo en vivo y publícalo directo desde InsForge. Para TikTok usa el
          PNG descargable (su API no permite subida automática).
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        {/* ───────── LEFT — live preview ───────── */}
        <section className="flex flex-col gap-4">
          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/30 p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Vista previa en vivo · 1:1 (1080×1080)
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    images.length > 0 &&
                    setActiveImage((i) => (i - 1 + images.length) % images.length)
                  }
                  disabled={images.length < 2}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-zinc-300 transition hover:border-yellow-400/50 hover:text-yellow-400 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Imagen anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 tabular-nums">
                  {images.length === 0 ? '0 / 0' : `${activeImage + 1} / ${images.length}`}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    images.length > 0 && setActiveImage((i) => (i + 1) % images.length)
                  }
                  disabled={images.length < 2}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-zinc-300 transition hover:border-yellow-400/50 hover:text-yellow-400 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Imagen siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mx-auto w-full max-w-[560px]">
              <div className="rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
                <SocialPostCard post={post} />
              </div>
            </div>
          </div>

          {/* Thumbnail rail */}
          {images.length > 0 && (
            <div className="rounded-[2rem] border border-white/10 bg-black/40 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
                Orden ({images.length}/{MAX_IMAGES}) — arrastra para reordenar
              </p>
              <div className="flex flex-wrap gap-3">
                {images.map((img, index) => (
                  <div
                    key={img.localId}
                    draggable
                    onDragStart={() => {
                      dragIndexRef.current = index;
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = dragIndexRef.current;
                      if (from !== null) moveImage(from, index);
                      dragIndexRef.current = null;
                    }}
                    onClick={() => setActiveImage(index)}
                    className={`group relative h-20 w-20 cursor-grab overflow-hidden rounded-xl border transition ${
                      activeImage === index
                        ? 'border-yellow-400 ring-2 ring-yellow-400/40'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                    <span className="absolute left-1 top-1 rounded-md bg-black/80 px-1.5 py-0.5 text-[9px] font-bold text-yellow-400">
                      #{index + 1}
                    </span>
                    <span className="absolute right-1 top-1 hidden rounded-md bg-black/80 p-1 text-zinc-200 group-hover:block">
                      <GripVertical className="h-3 w-3" />
                    </span>
                    {img.uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-yellow-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    )}
                    {img.error && (
                      <div
                        className="absolute inset-0 flex items-center justify-center bg-red-500/80 text-[9px] font-bold uppercase text-white"
                        title={img.error}
                      >
                        Error
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(img.localId);
                      }}
                      className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-md bg-black/80 text-red-400 opacity-0 transition group-hover:opacity-100"
                      aria-label="Eliminar imagen"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status line */}
          {status.kind !== 'idle' && (
            <div
              className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
                status.kind === 'error'
                  ? 'border-red-500/30 bg-red-500/5 text-red-300'
                  : status.kind === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
                  : 'border-yellow-400/30 bg-yellow-400/5 text-yellow-200'
              }`}
            >
              {status.kind === 'error' ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              ) : status.kind === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
              )}
              <span className="leading-relaxed">{status.label}</span>
            </div>
          )}
        </section>

        {/* ───────── RIGHT — form ───────── */}
        <aside className="flex flex-col gap-5">
          {/* Content */}
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Contenido del post
            </p>

            <Field label="Título *">
              <input
                required
                value={form.titulo}
                maxLength={120}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Ej: Terminamos otra ampliación en Longaví"
                className={inputCls}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha (visual)">
                <input
                  value={form.fecha}
                  onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                  placeholder={todayLabel()}
                  className={inputCls}
                />
              </Field>
              <Field label="Tag / categoría">
                <input
                  value={form.tag}
                  list="social-tags-list"
                  onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))}
                  placeholder="Ej: Proyecto"
                  className={inputCls}
                />
                <datalist id="social-tags-list">
                  {TAGS_SUGGESTED.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </Field>
            </div>

            <Field label="Descripción / subtítulo">
              <textarea
                rows={3}
                maxLength={500}
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                placeholder="Cuéntale al cliente qué hicieron."
                className={`${inputCls} resize-none`}
              />
            </Field>

            <Field label="Mensaje CTA">
              <input
                value={form.cta}
                maxLength={60}
                onChange={(e) => setForm((f) => ({ ...f, cta: e.target.value }))}
                placeholder="Cotiza tu proyecto"
                className={inputCls}
              />
            </Field>

            <Field label="Hashtags (Enter o coma para añadir)">
              <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                {form.hashtags.map((h) => (
                  <span
                    key={h}
                    className="inline-flex items-center gap-1 rounded-full bg-yellow-400/15 px-2.5 py-1 text-[11px] font-semibold text-yellow-400"
                  >
                    #{h}
                    <button
                      type="button"
                      onClick={() => removeHashtag(h)}
                      className="text-yellow-400/70 hover:text-yellow-400"
                      aria-label={`Quitar ${h}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  value={form.hashtagInput}
                  onChange={(e) => setForm((f) => ({ ...f, hashtagInput: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addHashtag(form.hashtagInput);
                    } else if (
                      e.key === 'Backspace' &&
                      form.hashtagInput === '' &&
                      form.hashtags.length > 0
                    ) {
                      removeHashtag(form.hashtags[form.hashtags.length - 1]);
                    }
                  }}
                  onBlur={() => form.hashtagInput && addHashtag(form.hashtagInput)}
                  placeholder={form.hashtags.length === 0 ? '#Metalcon' : ''}
                  className="flex-1 min-w-[120px] bg-transparent px-2 py-1 text-sm text-white placeholder-zinc-600 focus:outline-none"
                />
              </div>
            </Field>

            <Field label="Tema de la plantilla">
              <div className="grid grid-cols-2 gap-2">
                {(['amarillo', 'claro'] as SocialPostTheme[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, tema: t }))}
                    className={`rounded-xl border px-3 py-2 text-[11px] font-bold uppercase tracking-widest transition ${
                      form.tema === t
                        ? 'border-yellow-400 bg-yellow-400/15 text-yellow-400'
                        : 'border-white/10 text-zinc-400 hover:border-white/30'
                    }`}
                  >
                    {t === 'amarillo' ? 'Amarillo Fabrick' : 'Claro minimal'}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* Images */}
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-5 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Imágenes ({images.length}/{MAX_IMAGES})
            </p>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files.length) ingestFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
                dragOver
                  ? 'border-yellow-400 bg-yellow-400/5'
                  : 'border-white/10 hover:border-white/30'
              } ${images.length >= MAX_IMAGES ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <ImagePlus className="h-6 w-6 text-zinc-500" />
              <p className="text-sm text-zinc-300 font-medium">
                Arrastra imágenes o haz clic para seleccionar
              </p>
              <p className="text-[10px] uppercase tracking-widest text-zinc-600">
                JPG o PNG · Hasta {MAX_IMAGES} imágenes · Máx. 8 MB c/u
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) ingestFiles(e.target.files);
                e.currentTarget.value = '';
              }}
            />
          </div>

          {/* Platforms */}
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-5 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Plataformas
            </p>
            {(
              [
                {
                  key: 'instagram' as const,
                  label: 'Instagram',
                  hint: 'Meta Graph API · Instagram Business',
                },
                { key: 'facebook' as const, label: 'Facebook', hint: 'Meta Graph API · Page feed' },
                {
                  key: 'tiktok' as const,
                  label: 'TikTok',
                  hint: 'Solo descarga manual · Sin API pública',
                },
              ]
            ).map(({ key, label, hint }) => (
              <label
                key={key}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 cursor-pointer hover:border-white/20"
              >
                <input
                  type="checkbox"
                  checked={platforms[key]}
                  onChange={(e) => setPlatforms((p) => ({ ...p, [key]: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black text-yellow-400 focus:ring-yellow-400/40"
                />
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-zinc-100">{label}</span>
                  <span className="block text-[10.5px] uppercase tracking-widest text-zinc-500">
                    {hint}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {/* Schedule */}
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-5 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Programación
            </p>
            <Field label="Publicar automáticamente en">
              <input
                type="datetime-local"
                value={form.programarEn}
                min={nowLocalInputValue(5)}
                onChange={(e) => setForm((f) => ({ ...f, programarEn: e.target.value }))}
                className={inputCls}
              />
            </Field>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={saveDraft}
              disabled={status.kind === 'working'}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-zinc-200 transition hover:border-white/40 hover:text-white disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" />
              Guardar borrador
            </button>
            <button
              type="button"
              onClick={downloadPng}
              disabled={status.kind === 'working'}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-zinc-200 transition hover:border-white/40 hover:text-white disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" />
              PNG 1080×1080
            </button>
            <button
              type="button"
              onClick={schedule}
              disabled={status.kind === 'working'}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-yellow-400 transition hover:bg-yellow-400/20 disabled:opacity-60"
            >
              <CalendarClock className="h-3.5 w-3.5" />
              Programar
            </button>
            <button
              type="button"
              onClick={publishNow}
              disabled={status.kind === 'working'}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-yellow-400 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-black transition hover:bg-white disabled:opacity-60"
            >
              {status.kind === 'working' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Publicar ahora
            </button>
          </div>
        </aside>
      </div>

      {/* History */}
      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">
              Historial
            </p>
            <h2 className="text-xl font-black uppercase tracking-tight">Publicaciones anteriores</h2>
          </div>
          <button
            type="button"
            onClick={loadHistory}
            className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:border-white/30 hover:text-white"
          >
            Refrescar
          </button>
        </div>
        <HistoryTable rows={history} loading={historyLoading} />
      </section>

      {/* Off-screen export node — rendered at 1080×1080 for html2canvas */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: -99999,
          left: -99999,
          width: 1080,
          height: 1080,
          pointerEvents: 'none',
        }}
      >
        <SocialPostCard ref={exportRef} post={post} exportMode />
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-yellow-400/40 focus:outline-none focus:ring-0 transition-colors';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-widest text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}
