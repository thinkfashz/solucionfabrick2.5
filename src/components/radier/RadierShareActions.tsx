'use client';

import { MessageCircle } from 'lucide-react';
import { buildWhatsAppLink, WHATSAPP_DISPLAY } from '@/lib/whatsapp';
import { radierSummaryLine, type RadierQuote } from './useRadierQuote';
import RadierPdfButton from './RadierPdfButton';

function whatsappMessage(result: RadierQuote) {
  return [
    'Hola Soluciones Fabrick, calculé mi radier y quiero una mejor atención:',
    '',
    radierSummaryLine(result),
    `Capas: base ${result.baseDepth} cm (${result.stabilized.toLocaleString('es-CL', { maximumFractionDigits: 2 })} m³) · gravilla ${result.gravelDepth} cm (${result.gravel.toLocaleString('es-CL', { maximumFractionDigits: 2 })} m³) · malla ${result.meshSheets} plancha(s) · moldaje ${result.formworkMeters.toLocaleString('es-CL', { maximumFractionDigits: 1 })} ml.`,
    '',
    'Quiero la guía completa y coordinar la visita.',
  ].join('\n');
}

/** Descarga el PDF o lleva los detalles listos a WhatsApp para una mejor atención. */
export default function RadierShareActions({ result, unlocked }: { result: RadierQuote; unlocked: boolean }) {
  const href = buildWhatsAppLink(whatsappMessage(result));

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <RadierPdfButton result={result} unlocked={unlocked} />
      <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 px-6 text-xs font-black text-white transition-colors duration-200 hover:border-[#F6C64A]/60 hover:text-[#F6C64A]">
        <MessageCircle size={16} aria-hidden /> Consultar por WhatsApp
      </a>
      <p className="text-center text-[10px] text-white/35 sm:ml-auto sm:text-right">Atención {WHATSAPP_DISPLAY}<br className="sm:hidden" /> con tus medidas ya listas</p>
    </div>
  );
}
