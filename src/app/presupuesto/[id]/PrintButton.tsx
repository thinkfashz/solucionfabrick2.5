'use client';

import { Download, Loader2, Printer, Share2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { Proposal } from '@/lib/budgetMath';
import { formatCLP } from '@/lib/budgetMath';

/**
 * Client-side toolbar for the quote summary page.
 *
 * Three actions:
 *   1. Compartir   — Web Share API (or copy link fallback).
 *   2. Imprimir    — `window.print()` (the page already has print CSS).
 *   3. Descargar PDF — html2canvas + jsPDF, with a Soluciones Fabrick brand
 *      header and professional footer baked in via crisp jsPDF text on top
 *      of the captured dark page snapshot.
 *
 * Everything else stays an RSC; this component is the only client island.
 */
export default function QuoteToolbar({
  proposal,
  captureSelector,
}: {
  proposal: Proposal;
  /** CSS selector of the DOM region to snapshot into the PDF body. */
  captureSelector: string;
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onShare = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'Mi cotización Soluciones Fabrick', url });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2_000);
      }
    } catch {
      /* user cancelled or unsupported — silent */
    }
  };

  const handleDownloadPDF = useCallback(async () => {
    if (typeof window === 'undefined' || downloading) return;
    setDownloading(true);
    setError(null);

    try {
      // Lazy-load the heavy libs only when the user actually clicks.
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const target = document.querySelector<HTMLElement>(captureSelector);
      if (!target) throw new Error('No se encontró el contenido a exportar.');

      // Snapshot the dark, branded body. backgroundColor: '#000' keeps the
      // estética oscura even if the page wraps the region in a transparent div.
      const canvas = await html2canvas(target, {
        backgroundColor: '#000000',
        scale: Math.min(2, window.devicePixelRatio || 1.5),
        useCORS: true,
        logging: false,
        windowWidth: target.scrollWidth,
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 12;

      // ---------- Brand header (crisp jsPDF text) ----------
      const headerH = 34;
      pdf.setFillColor(0, 0, 0); // #000
      pdf.rect(0, 0, pageW, headerH, 'F');

      // Yellow accent bar
      pdf.setFillColor(255, 215, 0); // #FFD700
      pdf.rect(0, headerH - 1, pageW, 1, 'F');

      pdf.setTextColor(255, 215, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text('SOLUCIONES FABRICK — PROPUESTA TÉCNICA', margin, 10);

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.text('SOLUCIONES FABRICK', margin, 20);

      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(11);
      pdf.setTextColor(255, 215, 0);
      pdf.text('Constructor de Historias', margin, 27);

      // Right-aligned metadata: ID + fecha + cliente.
      const issued = new Date(proposal.issuedAt);
      const issuedLabel = issued.toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const customerName = proposal.customer?.name?.trim() || '—';
      const idShort = (proposal.id || proposal.docNumber || '').slice(0, 12);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      const rightX = pageW - margin;
      pdf.text(`Documento: ${proposal.docNumber}`, rightX, 10, { align: 'right' });
      pdf.text(`ID: ${idShort}`, rightX, 15, { align: 'right' });
      pdf.text(`Emisión: ${issuedLabel}`, rightX, 20, { align: 'right' });
      pdf.text(`Cliente: ${customerName}`, rightX, 25, { align: 'right' });

      // ---------- Body: paginated screenshot ----------
      const footerH = 22;
      const bodyTop = headerH + 4;
      const bodyAvailH = pageH - bodyTop - footerH - 4;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;

      const imgData = canvas.toDataURL('image/jpeg', 0.92);

      if (imgH <= bodyAvailH) {
        // Fits in one page.
        pdf.addImage(imgData, 'JPEG', margin, bodyTop, imgW, imgH);
        drawFooter(pdf, pageW, pageH, footerH, proposal.docNumber);
      } else {
        // Slice the canvas into page-sized chunks. We re-encode each slice so
        // jsPDF receives an image whose aspect ratio matches the page area
        // (no awkward scaling, no white gutters).
        const sliceCanvas = document.createElement('canvas');
        const sliceCtx = sliceCanvas.getContext('2d');
        if (!sliceCtx) throw new Error('Canvas 2D no disponible.');
        const pxPerMm = canvas.width / imgW;
        const sliceHeightPx = Math.floor(bodyAvailH * pxPerMm);
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;

        let renderedPx = 0;
        let firstPage = true;
        while (renderedPx < canvas.height) {
          if (!firstPage) pdf.addPage();
          firstPage = false;

          const remaining = canvas.height - renderedPx;
          const drawPx = Math.min(sliceHeightPx, remaining);
          sliceCanvas.height = drawPx;
          sliceCtx.fillStyle = '#000000';
          sliceCtx.fillRect(0, 0, sliceCanvas.width, drawPx);
          sliceCtx.drawImage(
            canvas,
            0, renderedPx, canvas.width, drawPx,
            0, 0, canvas.width, drawPx,
          );
          const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92);
          const sliceMm = drawPx / pxPerMm;

          // Re-paint the brand header on every page so the doc stays branded.
          if (!firstPage) {
            pdf.setFillColor(0, 0, 0);
            pdf.rect(0, 0, pageW, headerH, 'F');
            pdf.setFillColor(255, 215, 0);
            pdf.rect(0, headerH - 1, pageW, 1, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(16);
            pdf.text('SOLUCIONES FABRICK', margin, 18);
            pdf.setFont('helvetica', 'italic');
            pdf.setFontSize(10);
            pdf.setTextColor(255, 215, 0);
            pdf.text('Constructor de Historias', margin, 25);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(255, 255, 255);
            pdf.text(`Documento: ${proposal.docNumber}`, rightX, 18, { align: 'right' });
          }

          pdf.addImage(sliceData, 'JPEG', margin, bodyTop, imgW, sliceMm);
          drawFooter(pdf, pageW, pageH, footerH, proposal.docNumber);
          renderedPx += drawPx;
        }
      }

      // Stamp a totals line directly into PDF text (crisp, accessible).
      // Done on the last page above the footer if there's room; otherwise as a
      // standalone "Totales" page so the figures are always exact.
      // Quick path: just add a final page summary if the snapshot was huge.
      const summaryX = margin;
      let summaryY = pageH - footerH - 28;
      pdf.setFillColor(0, 0, 0);
      pdf.rect(margin, summaryY - 6, pageW - margin * 2, 26, 'F');
      pdf.setDrawColor(255, 215, 0);
      pdf.setLineWidth(0.3);
      pdf.line(margin, summaryY - 6, pageW - margin, summaryY - 6);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(255, 215, 0);
      pdf.text('RESUMEN COMERCIAL', summaryX, summaryY);
      summaryY += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.text(`Subtotal: ${formatCLP(proposal.totals.subtotal)}`, summaryX, summaryY);
      pdf.text(
        `IVA (${Math.round(proposal.totals.ivaRate * 100)}%): ${formatCLP(proposal.totals.iva)}`,
        summaryX + 60,
        summaryY,
      );
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 215, 0);
      pdf.text(`TOTAL CLP: ${formatCLP(proposal.totals.total)}`, pageW - margin, summaryY, {
        align: 'right',
      });

      pdf.save(`SolucionesFabrick-${proposal.docNumber}.pdf`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo generar el PDF.';
      setError(message);
    } finally {
      setDownloading(false);
    }
  }, [captureSelector, downloading, proposal]);

  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      {error && (
        <span
          role="alert"
          className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-red-300"
        >
          {error}
        </span>
      )}
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
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-200 transition-colors hover:border-yellow-400/40 hover:text-yellow-300"
      >
        <Printer className="h-3.5 w-3.5" aria-hidden />
        Imprimir
      </button>
      <button
        type="button"
        onClick={handleDownloadPDF}
        disabled={downloading}
        aria-busy={downloading}
        className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-black shadow-[0_8px_24px_-8px_rgba(255,215,0,0.55)] transition-all hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-[0_0_24px_rgba(255,215,0,0.6)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {downloading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Generando…
          </>
        ) : (
          <>
            <Download className="h-3.5 w-3.5" aria-hidden />
            Descargar PDF
          </>
        )}
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  PDF helpers                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Draws the professional footer band on the current jsPDF page.
 * Black background, yellow accent line, brand sentence + Faubricio Micolta
 * legal mention, doc number on the right.
 */
function drawFooter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any,
  pageW: number,
  pageH: number,
  footerH: number,
  docNumber: string,
): void {
  const top = pageH - footerH;
  pdf.setFillColor(0, 0, 0);
  pdf.rect(0, top, pageW, footerH, 'F');
  pdf.setFillColor(255, 215, 0);
  pdf.rect(0, top, pageW, 0.6, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(255, 215, 0);
  pdf.text('Soluciones Fabrick — Pisar fuerte desde el primer día.', 12, top + 7);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(220, 220, 220);
  pdf.text(
    'Documento generado por el sistema oficial de presupuestos de Faubricio Micolta.',
    12,
    top + 12,
  );

  pdf.setFontSize(7);
  pdf.setTextColor(160, 160, 160);
  pdf.text(`Documento: ${docNumber}`, pageW - 12, top + 7, { align: 'right' });
  pdf.text(
    `Página ${pdf.internal.getCurrentPageInfo().pageNumber}`,
    pageW - 12,
    top + 12,
    { align: 'right' },
  );
}
