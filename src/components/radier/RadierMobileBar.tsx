'use client';

import { FileText, MessageCircle, BookOpen } from 'lucide-react';
import { buildWhatsAppLink } from '@/lib/whatsapp';

/** Barra fija inferior solo en móvil: las 3 acciones sin tener que bajar. */
export default function RadierMobileBar() {
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <nav aria-label="Acciones del radier" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#05090C]/95 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden">
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => scrollTo('presupuesto-radier')} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-[#F6C64A] text-[11px] font-black text-black">
          <FileText size={14} aria-hidden /> Presupuesto
        </button>
        <button type="button" onClick={() => scrollTo('guia-fabricacion')} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-white/15 text-[11px] font-black text-white/85">
          <BookOpen size={14} aria-hidden /> Guía
        </button>
        <a href={buildWhatsAppLink('Hola Soluciones Fabrick, calculé mi radier y quiero conversar mi proyecto.')} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-white/15 text-[11px] font-black text-white/85">
          <MessageCircle size={14} aria-hidden /> WhatsApp
        </a>
      </div>
    </nav>
  );
}
