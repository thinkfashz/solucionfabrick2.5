'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter, AlignLeft, AlignRight, Bold, ImagePlus, Italic, Link2, List, ListOrdered,
  Loader2, Quote, Redo, RemoveFormatting, Sparkles, Strikethrough, Type, Underline, Undo,
} from 'lucide-react';

const FONTS = [
  { id: 'system', label: 'Sistema', stack: 'ui-sans-serif, system-ui, sans-serif', google: '' },
  { id: 'sora', label: 'Sora (marca)', stack: 'Sora, ui-sans-serif, sans-serif', google: 'Sora:wght@400;700;800' },
  { id: 'inter', label: 'Inter', stack: 'Inter, ui-sans-serif, sans-serif', google: 'Inter:wght@400;600;700' },
  { id: 'lora', label: 'Lora (serif)', stack: 'Lora, Georgia, serif', google: 'Lora:ital,wght@0,400;0,600;1,400' },
  { id: 'playfair', label: 'Playfair (titular)', stack: '"Playfair Display", Georgia, serif', google: 'Playfair+Display:wght@600;800' },
  { id: 'montserrat', label: 'Montserrat', stack: 'Montserrat, ui-sans-serif, sans-serif', google: 'Montserrat:wght@400;600;800' },
] as const;

const LOADED_FONTS = new Set<string>();

function ensureFont(id: string) {
  const font = FONTS.find((f) => f.id === id);
  if (!font || !font.google || LOADED_FONTS.has(id) || typeof document === 'undefined') return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
  document.head.appendChild(link);
  LOADED_FONTS.add(id);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));
}

/** Markdown → HTML para inicializar el lienzo (extiende el preview del editor clásico). */
export function mdToHtml(md: string): string {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  let listTag = '';
  const inline = (s: string) => {
    let t = escapeHtml(s);
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    t = t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    return t;
  };
  const closeList = () => { if (inList) { out.push(`</${listTag}>`); inList = false; } };
  for (const raw of lines) {
    if (/^\s*$/.test(raw)) { closeList(); continue; }
    const ul = raw.match(/^\s*[-*]\s+(.*)$/);
    const ol = raw.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      const tag = ul ? 'ul' : 'ol';
      if (!inList || listTag !== tag) { closeList(); out.push(`<${tag}>`); inList = true; listTag = tag; }
      out.push(`<li>${inline((ul || ol)![1])}</li>`);
      continue;
    }
    closeList();
    const quote = raw.match(/^\s*>\s?(.*)$/);
    if (quote) { out.push(`<blockquote>${inline(quote[1])}</blockquote>`); continue; }
    const h = raw.match(/^(#{1,3})\s+(.*)$/);
    if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
    out.push(`<p>${inline(raw)}</p>`);
  }
  closeList();
  return out.join('\n');
}

/** HTML del lienzo → Markdown para guardar (cubre lo que produce la barra). */
export function htmlToMarkdown(root: HTMLElement): string {
  const blocks: string[] = [];
  const inlineMd = (el: Element): string => {
    let out = '';
    el.childNodes.forEach((node) => {
      if (node.nodeType === 3) { out += node.textContent || ''; return; }
      if (node.nodeType !== 1) return;
      const tag = (node as Element).tagName.toLowerCase();
      const inner = inlineMd(node as Element);
      if (tag === 'strong' || tag === 'b') out += `**${inner}**`;
      else if (tag === 'em' || tag === 'i') out += `*${inner}*`;
      else if (tag === 'code') out += `\`${inner}\``;
      else if (tag === 'a') out += `[${inner}](${(node as HTMLAnchorElement).href || ''})`;
      else if (tag === 'br') out += '\n';
      else if (tag === 'img') {
        const img = node as HTMLImageElement;
        out += `![${img.alt || ''}](${img.src || ''})`;
      } else out += inner;
    });
    return out;
  };
  root.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      const text = (node.textContent || '').trim();
      if (text) blocks.push(text);
      return;
    }
    if (node.nodeType !== 1) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const text = inlineMd(el).trim();
    if (!text && tag !== 'img' && !el.querySelector('img')) return;
    if (/^h[1-3]$/.test(tag)) blocks.push(`${'#'.repeat(Number(tag[1]))} ${text}`);
    else if (tag === 'blockquote') blocks.push(`> ${text}`);
    else if (tag === 'ul') {
      const items: string[] = [];
      el.querySelectorAll(':scope > li').forEach((li) => items.push(`- ${inlineMd(li).trim()}`));
      if (items.length) blocks.push(items.join('\n'));
    } else if (tag === 'ol') {
      const items: string[] = [];
      el.querySelectorAll(':scope > li').forEach((li, i) => items.push(`${i + 1}. ${inlineMd(li).trim()}`));
      if (items.length) blocks.push(items.join('\n'));
    } else if (tag === 'img') {
      const img = el as unknown as HTMLImageElement;
      blocks.push(`![${img.alt || ''}](${img.src || ''})`);
    } else if (tag === 'div' && el.dataset.callout) {
      blocks.push(`> **${el.dataset.callout}**: ${text}`);
    } else blocks.push(text);
  });
  return blocks.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

function ToolButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-lg border transition ${active ? 'border-yellow-400/60 bg-yellow-400/10 text-yellow-300' : 'border-transparent text-zinc-300 hover:border-white/10 hover:bg-white/5'}`}
    >
      {children}
    </button>
  );
}

/**
 * Editor WYSIWYG estilo Word en HTML5, sin dependencias nuevas.
 * Edita HTML en el lienzo y entrega Markdown al guardar (el servidor
 * re-renderiza el HTML canónico). Incluye tipografías, imágenes libres,
 * iconos, bloques de llamada e IA para borradores.
 */
export default function BlogRichEditor({
  initialMd,
  title,
  onChange,
  onPickImage,
  onAiDraft,
}: {
  initialMd: string;
  title: string;
  onChange: (markdown: string) => void;
  onPickImage?: () => void;
  onAiDraft?: () => Promise<string | null>;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [fontId, setFontId] = useState<string>('system');
  const [color, setColor] = useState('#f6c64a');
  const [imgSeed, setImgSeed] = useState('');
  const [imgUrl, setImgUrl] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [words, setWords] = useState(0);

  useEffect(() => {
    if (canvasRef.current && !canvasRef.current.dataset.init) {
      canvasRef.current.innerHTML = mdToHtml(initialMd);
      canvasRef.current.dataset.init = '1';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return;
    onChange(htmlToMarkdown(el));
    setWords((el.innerText || '').trim().split(/\s+/).filter(Boolean).length);
  }, [onChange]);

  const exec = useCallback((command: string, value?: string) => {
    const el = canvasRef.current;
    if (!el) return;
    el.focus();
    try {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand(command, false, value);
    } catch { /* comando no soportado */ }
    emit();
  }, [emit]);

  const insertHtml = useCallback((html: string) => {
    const el = canvasRef.current;
    if (!el) return;
    el.focus();
    try {
      document.execCommand('insertHTML', false, html);
    } catch {
      el.insertAdjacentHTML('beforeend', html);
    }
    emit();
  }, [emit]);

  const applyFont = useCallback((id: string) => {
    setFontId(id);
    ensureFont(id);
    const font = FONTS.find((f) => f.id === id);
    if (font) exec('fontName', font.stack.split(',')[0].replace(/["']/g, ''));
  }, [exec]);

  const insertStockImage = useCallback(() => {
    const seed = (imgSeed.trim() || title.trim() || 'blog').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48) || 'blog';
    insertHtml(`<p><img src="https://picsum.photos/seed/${encodeURIComponent(seed)}/1200/675" alt="${escapeHtml(title || seed)}" /></p>`);
    setImgSeed('');
  }, [imgSeed, title, insertHtml]);

  const insertUrlImage = useCallback(() => {
    const url = imgUrl.trim();
    if (!url) return;
    insertHtml(`<p><img src="${escapeHtml(url)}" alt="" /></p>`);
    setImgUrl('');
  }, [imgUrl, insertHtml]);

  const insertCallout = useCallback((kind: 'Nota' | 'Consejo' | 'Advertencia') => {
    const palette = kind === 'Advertencia' ? '#f87171' : kind === 'Consejo' ? '#f6c64a' : '#7dd3fc';
    insertHtml(
      `<div data-callout="${kind}" style="border-left:3px solid ${palette};background:rgba(255,255,255,.03);padding:12px 14px;border-radius:0 10px 10px 0;margin:12px 0"><strong>${kind}:</strong> Escribe aquí…</div><p></p>`,
    );
  }, [insertHtml]);

  const runAiDraft = useCallback(async () => {
    if (!onAiDraft || aiBusy) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const md = await onAiDraft();
      if (md && canvasRef.current) {
        const append = mdToHtml(md);
        canvasRef.current.insertAdjacentHTML('beforeend', append);
        emit();
      } else {
        setAiError('La IA no devolvió contenido. Intenta con un título más específico.');
      }
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'La IA no respondió.');
    } finally {
      setAiBusy(false);
    }
  }, [onAiDraft, aiBusy, emit]);

  const fontStack = useMemo(() => FONTS.find((f) => f.id === fontId)?.stack || FONTS[0].stack, [fontId]);

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-black">
      {/* Barra estilo Word */}
      <div className="flex flex-wrap items-center gap-1 border-b border-white/10 bg-white/[.02] p-2" role="toolbar" aria-label="Formato del artículo">
        <ToolButton label="Deshacer" onClick={() => exec('undo')}><Undo size={15} /></ToolButton>
        <ToolButton label="Rehacer" onClick={() => exec('redo')}><Redo size={15} /></ToolButton>
        <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />
        <ToolButton label="Título 1" onClick={() => exec('formatBlock', 'h1')}><span className="text-xs font-black">H1</span></ToolButton>
        <ToolButton label="Título 2" onClick={() => exec('formatBlock', 'h2')}><span className="text-xs font-black">H2</span></ToolButton>
        <ToolButton label="Título 3" onClick={() => exec('formatBlock', 'h3')}><span className="text-xs font-black">H3</span></ToolButton>
        <ToolButton label="Párrafo" onClick={() => exec('formatBlock', 'p')}><Type size={15} /></ToolButton>
        <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />
        <ToolButton label="Negrita" onClick={() => exec('bold')}><Bold size={15} /></ToolButton>
        <ToolButton label="Itálica" onClick={() => exec('italic')}><Italic size={15} /></ToolButton>
        <ToolButton label="Subrayado" onClick={() => exec('underline')}><Underline size={15} /></ToolButton>
        <ToolButton label="Tachado" onClick={() => exec('strikeThrough')}><Strikethrough size={15} /></ToolButton>
        <ToolButton label="Quitar formato" onClick={() => exec('removeFormat')}><RemoveFormatting size={15} /></ToolButton>
        <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />
        <ToolButton label="Izquierda" onClick={() => exec('justifyLeft')}><AlignLeft size={15} /></ToolButton>
        <ToolButton label="Centro" onClick={() => exec('justifyCenter')}><AlignCenter size={15} /></ToolButton>
        <ToolButton label="Derecha" onClick={() => exec('justifyRight')}><AlignRight size={15} /></ToolButton>
        <ToolButton label="Lista" onClick={() => exec('insertUnorderedList')}><List size={15} /></ToolButton>
        <ToolButton label="Numerada" onClick={() => exec('insertOrderedList')}><ListOrdered size={15} /></ToolButton>
        <ToolButton label="Cita" onClick={() => exec('formatBlock', 'blockquote')}><Quote size={15} /></ToolButton>
        <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />
        <ToolButton label="Enlace" onClick={() => {
          const url = window.prompt('URL del enlace:');
          if (url) exec('createLink', url);
        }}><Link2 size={15} /></ToolButton>
        <label className="grid h-9 w-9 place-items-center overflow-hidden rounded-lg border border-transparent" title="Color de texto">
          <span className="h-4 w-4 rounded-full border border-white/20" style={{ background: color }} />
          <input type="color" value={color} onChange={(e) => { setColor(e.target.value); exec('foreColor', e.target.value); }} className="h-0 w-0 opacity-0" aria-label="Color de texto" />
        </label>
        <select
          value={fontId}
          onChange={(e) => applyFont(e.target.value)}
          aria-label="Tipografía"
          className="h-9 rounded-lg border border-white/10 bg-black px-2 text-[11px] text-zinc-200"
        >
          {FONTS.map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}
        </select>
      </div>

      {/* Lienzo */}
      <div
        ref={canvasRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        aria-label="Contenido del artículo"
        className="prose prose-invert min-h-[420px] max-w-none p-4 outline-none focus:bg-white/[.01]"
        style={{ fontFamily: fontStack }}
      />

      {/* Insertar medios */}
      <div className="grid gap-3 border-t border-white/10 bg-white/[.02] p-3 sm:grid-cols-2">
        <div className="flex gap-2">
          <input value={imgSeed} onChange={(e) => setImgSeed(e.target.value)} placeholder="Tema para foto libre (ej. radier)" aria-label="Tema para foto libre" className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-black px-2 text-xs text-white" />
          <button type="button" onClick={insertStockImage} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-[11px] font-bold text-zinc-200 hover:border-yellow-400/40">
            <ImagePlus size={14} /> Foto libre
          </button>
        </div>
        <div className="flex gap-2">
          <input value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} placeholder="…o pega URL de imagen" aria-label="URL de imagen" className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-black px-2 text-xs text-white" />
          <button type="button" onClick={insertUrlImage} disabled={!imgUrl.trim()} className="h-9 shrink-0 rounded-lg border border-white/10 px-3 text-[11px] font-bold text-zinc-200 hover:border-yellow-400/40 disabled:opacity-40">
            Insertar
          </button>
          {onPickImage ? (
            <button type="button" onClick={onPickImage} className="h-9 shrink-0 rounded-lg border border-white/10 px-3 text-[11px] font-bold text-zinc-200 hover:border-yellow-400/40">
              Medios
            </button>
          ) : null}
        </div>
      </div>

      {/* Llamados + IA */}
      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 p-3">
        {(['Nota', 'Consejo', 'Advertencia'] as const).map((kind) => (
          <button key={kind} type="button" onClick={() => insertCallout(kind)} className="h-8 rounded-full border border-white/10 px-3 text-[11px] font-bold text-zinc-300 hover:border-yellow-400/40">
            + {kind}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />
        {onAiDraft ? (
          <button type="button" onClick={runAiDraft} disabled={aiBusy} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-yellow-400 px-3 text-[11px] font-black text-black hover:bg-yellow-300 disabled:opacity-60">
            {aiBusy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} {aiBusy ? 'Escribiendo…' : 'Borrador con IA'}
          </button>
        ) : null}
        <span className="ml-auto text-[10px] tabular-nums text-zinc-500">{words} palabras · ~{Math.max(1, Math.round(words / 220))} min</span>
      </div>
      {aiError ? <p role="alert" className="border-t border-red-500/30 bg-red-500/5 px-3 py-2 text-[11px] text-red-300">{aiError}</p> : null}
    </div>
  );
}
