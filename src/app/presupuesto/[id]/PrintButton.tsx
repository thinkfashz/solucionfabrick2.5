'use client';

import { Printer, Share2 } from 'lucide-react';
import { useState } from 'react';

/**
 * Client-side actions for the quote summary page: imprimir y compartir.
 * Kept tiny so the rest of `/presupuesto/[id]` stays fully RSC-rendered.
 */
export default function PrintButton() {
  const [copied, setCopied] = useState(false);

  const onShare = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Mi cotización Fabrick', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      /* user cancelled or unsupported */
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onShare}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-200 transition-colors hover:border-yellow-400/40 hover:text-yellow-300"
      >
        <Share2 className="h-3.5 w-3.5" aria-hidden />
        {copied ? 'Enlace copiado' : 'Compartir'}
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-black shadow-[0_8px_24px_-8px_rgba(250,204,21,0.5)] transition-all hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-[0_0_24px_rgba(250,204,21,0.55)]"
      >
        <Printer className="h-3.5 w-3.5" aria-hidden />
        Imprimir / PDF
      </button>
    </div>
  );
}
