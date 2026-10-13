'use client';

import { useState } from 'react';
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import { Download, Loader2 } from 'lucide-react';
import type { RadierQuote } from './useRadierQuote';

const INK: [number, number, number] = [8, 9, 10];
const MUTED: [number, number, number] = [110, 110, 108];
const ACCENT: [number, number, number] = [246, 198, 74];
const CONTACT_PHONE = '+56 9 3012 1625';
const CONTACT_EMAIL = 'solucionesfabrick@gmail.com';
const PAPER: [number, number, number] = [255, 255, 255];
const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const NUM = (value: number, digits = 2) => value.toLocaleString('es-CL', { maximumFractionDigits: digits });

async function logoDataUrl(): Promise<string | null> {
  try {
    const response = await fetch('/brand/soluciones-fabrick-transparent.png', { cache: 'force-cache' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

/** Código de barras Code128 del folio, para verificación en obra y archivo. */
function barcodeDataUrl(text: string): string | null {
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, text, {
      format: 'CODE128',
      width: 2,
      height: 56,
      displayValue: false,
      margin: 6,
      background: '#ffffff',
      lineColor: '#000000',
    });
    return canvas.toDataURL('image/png');
  } catch { return null; }
}

/** Genera la hoja de presupuesto en PDF con la marca, medidas, materiales y planes. */
export async function buildRadierPdf(result: RadierQuote) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setProperties({ title: 'Hoja de presupuesto · Radier — Soluciones Fabrick', creator: 'solucionesfabrick.com' });
  const W = 210;
  const M = 16;
  let y = 0;

  // Banda superior oscura con la marca
  doc.setFillColor(...INK);
  doc.rect(0, 0, W, 34, 'F');
  const logo = await logoDataUrl();
  if (logo) {
    try { doc.addImage(logo, 'PNG', M, 7, 42, 20); } catch { /* texto de respaldo */ }
  }
  doc.setTextColor(...ACCENT);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('HOJA DE PRESUPUESTO · RADIER', W - M, 14, { align: 'right' });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const today = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  doc.text(`Emitida el ${today} · referencia comercial, no cotización final`, W - M, 20, { align: 'right' });
  doc.text(`${CONTACT_PHONE} · ${CONTACT_EMAIL}`, W - M, 25, { align: 'right' });
  y = 42;

  // Folio + código de barras para verificación en obra y archivo
  const folio = `RDR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.round(result.area)}M2`;
  const barcode = barcodeDataUrl(folio);
  if (barcode) {
    try {
      doc.addImage(barcode, 'PNG', M, y - 2, 52, 14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...INK);
      doc.text(`Folio: ${folio}`, M + 56, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text('Escanea para verificar contra la cotización guardada', M + 56, y + 8.5);
    } catch { /* sin código si falla el render */ }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(`Folio: ${folio}`, M, y + 4);
  }
  y += 16;

  const section = (title: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(title, M, y);
    y += 2.5;
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.9);
    doc.line(M, y, M + 22, y);
    y += 7;
  };
  const row = (label: string, value: string, highlight = false) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), M, y);
    doc.setFontSize(11);
    doc.setTextColor(...(highlight ? ACCENT : INK));
    doc.text(value, M, y + 5);
  };

  section('Medidas y superficie');
  row('Superficie', `${NUM(result.area, 1)} m²  (${result.length} × ${result.width} m)`);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Perímetro ${NUM(result.perimeter, 1)} ml · espesor losa ${result.thickness} cm · base ${result.baseDepth} cm · gravilla ${result.gravelDepth} cm`, M, y + 10);
  y += 17;

  section('Material por capa');
  const layers: Array<[string, string, string]> = [
    ['Base estabilizada', `${NUM(result.stabilized)} m³`, `${result.baseDepth} cm compactados`],
    ['Gravilla', `${NUM(result.gravel)} m³`, `${result.gravelDepth} cm de regularización`],
    ['Barrera de humedad', `${NUM(result.moistureBarrierM2, 1)} m²`, 'lámina con 10% de traslape'],
    ['Malla ACMA', `${result.meshSheets} plancha(s)`, 'refuerzo previo al hormigonado'],
    ['Moldaje', `${NUM(result.formworkMeters, 1)} ml`, `tablas + ${result.stakes43cm} estacas de 43 cm`],
    ['Hormigón', `${NUM(result.concrete)} m³`, `${result.cementBags25} sacos de 25 kg`],
  ];
  doc.setFontSize(9);
  layers.forEach(([layer, qty, detail]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK);
    doc.text(layer, M, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ACCENT);
    doc.text(qty, 78, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(detail, 112, y);
    y += 6;
    if (y > 258) { doc.addPage(); y = 20; }
  });
  y += 4;

  section('Alcances referenciales');
  result.plans.forEach((plan) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(plan.name, M, y);
    doc.setTextColor(...ACCENT);
    doc.text(CLP.format(plan.total), W - M, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`${plan.label} · ${CLP.format(plan.referenceM2)}/m² con IVA`, M, y + 4.5);
    y += 10;
    // Composición comercial del alcance
    doc.setFontSize(8);
    const parts: Array<[string, number]> = [
      ['Mano de obra', plan.labor],
      ['Materiales', plan.materials],
      ['Preparación/extras', plan.extras],
    ];
    if (plan.transport > 0) parts.push(['Transporte ref.', plan.transport]);
    parts.push(['IVA 19%', plan.tax]);
    parts.forEach(([label, value]) => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...MUTED);
      doc.text(`· ${label}`, M + 4, y);
      doc.text(CLP.format(value), W - M, y, { align: 'right' });
      y += 4.5;
    });
    y += 3;
    if (y > 250) { doc.addPage(); y = 20; }
  });

  y += 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const footer = [
    'Referencia comercial generada con tus medidas. No es cotización final ni documento tributario.',
    'Los materiales y precios varían por zona, acceso y proyecto. Revisión profesional antes de comprar.',
    `Soluciones Fabrick · ${CONTACT_PHONE} · ${CONTACT_EMAIL} · solucionesfabrick.com`,
  ];
  footer.forEach((line) => { doc.text(line, M, y, { maxWidth: W - M * 2 }); y += 5; });

  const slug = `radier-${result.length}x${result.width}-e${result.thickness}`;
  doc.save(`presupuesto-${slug}.pdf`);
}

export default function RadierPdfButton({ result, unlocked }: { result: RadierQuote; unlocked: boolean }) {
  const [busy, setBusy] = useState(false);

  async function download() {
    if (busy || !unlocked) return;
    setBusy(true);
    try {
      await buildRadierPdf(result);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={download} disabled={busy || !unlocked} title={unlocked ? 'Descargar hoja de presupuesto en PDF' : 'Desbloquea la guía para descargar el PDF'} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#F6C64A] px-6 text-xs font-black text-black transition disabled:opacity-50">
      {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Download size={16} aria-hidden />}
      {busy ? 'Generando…' : 'Descargar PDF'}
    </button>
  );
}
