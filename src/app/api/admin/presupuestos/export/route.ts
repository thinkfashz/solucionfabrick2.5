export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import type { PresupuestoPro } from '@/lib/presupuestosBuilder';

function money(v: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number.isFinite(v) ? v : 0);
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function list(items: string[], symbol = '✓') {
  if (!items?.length) return '<p style="color:#999;font-size:13px;">—</p>';
  return items.map(i => `<div style="display:flex;gap:8px;margin-bottom:5px;"><span style="color:#b8860b;font-weight:700;flex-shrink:0;">${symbol}</span><span>${esc(i)}</span></div>`).join('');
}

function buildHtml(p: PresupuestoPro): string {
  const fechaStr = p.fecha ? new Date(p.fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const validezStr = p.fecha_vencimiento ? new Date(p.fecha_vencimiento).toLocaleDateString('es-CL') : p.validez;

  const itemRows = (p.items || [])
    .sort((a, b) => a.orden - b.orden)
    .map((item, i) => `
      <tr style="background:${i % 2 === 1 ? '#f9f7f2' : '#fff'};">
        <td style="padding:10px 12px;border-bottom:1px solid #e8e0d0;">
          <strong style="color:#1a1a1a;">${esc(item.nombre)}</strong>
          ${item.descripcion ? `<br><span style="color:#666;font-size:12px;">${esc(item.descripcion)}</span>` : ''}
          ${item.categoria ? `<br><span style="color:#b8860b;font-size:11px;font-weight:700;">${esc(item.categoria)}</span>` : ''}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e8e0d0;text-align:center;color:#555;">${item.cantidad}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e8e0d0;text-align:center;color:#555;">${esc(item.unidad)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e8e0d0;text-align:right;color:#555;">${money(item.precio_unitario)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e8e0d0;text-align:right;font-weight:700;color:#1a1a1a;">${money(item.total)}</td>
      </tr>`).join('');

  const pagoRows = (p.forma_pago || [])
    .map((pg, i) => `
      <div style="flex:1;min-width:150px;background:#fffbf0;border:1px solid #e8d88a;border-radius:10px;padding:14px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#b8860b;margin-bottom:4px;">Hito ${i + 1}</div>
        <div style="font-size:28px;font-weight:900;color:#1a1a1a;line-height:1;">${pg.porcentaje}%</div>
        ${p.total_con_iva > 0 ? `<div style="font-size:14px;font-weight:700;color:#b8860b;margin-top:4px;">${money(Math.round(p.total_con_iva * pg.porcentaje / 100))}</div>` : ''}
        <div style="font-size:12px;color:#555;margin-top:6px;line-height:1.4;">${esc(pg.descripcion)}</div>
      </div>`).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.titulo || 'Presupuesto')} — ${esc(p.cliente || '')}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#1a1a1a;background:#fff;line-height:1.6;}
  @media print{
    body{font-size:12px;}
    .no-print{display:none!important;}
    section{page-break-inside:avoid;}
    h2{page-break-after:avoid;}
  }
  .page{max-width:900px;margin:0 auto;padding:32px 24px;}
  .header{background:#111;color:#fff;padding:40px;border-radius:16px;margin-bottom:32px;}
  .badge{display:inline-block;background:#f4c400;color:#111;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;padding:4px 12px;border-radius:20px;}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;}
  .card{background:#fafafa;border:1px solid #e8e0d0;border-radius:12px;padding:20px;}
  .label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#999;margin-bottom:6px;}
  h2{font-size:17px;font-weight:900;margin-bottom:14px;color:#111;display:flex;align-items:center;gap:8px;}
  h2::before{content:'';display:inline-block;width:8px;height:8px;border-radius:50%;background:#f4c400;flex-shrink:0;}
  table{width:100%;border-collapse:collapse;font-size:13px;}
  thead th{background:#111;color:#fff;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;}
  thead th:last-child{text-align:right;}
  tfoot td{padding:12px;font-weight:700;border-top:2px solid #e8d88a;}
  .total-row td{background:#fffbf0;}
  .print-btn{position:fixed;bottom:24px;right:24px;background:#f4c400;color:#111;border:none;font-size:14px;font-weight:900;padding:12px 24px;border-radius:50px;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.15);}
  .watermark{text-align:center;font-size:11px;color:#ccc;text-transform:uppercase;letter-spacing:0.2em;padding:24px 0;}
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;">
      <div>
        <div class="badge">${esc(p.estado?.toUpperCase() || 'BORRADOR')}</div>
        <h1 style="margin-top:12px;font-size:26px;font-weight:900;line-height:1.2;">${esc(p.titulo || 'Presupuesto')}</h1>
        <p style="margin-top:6px;color:#aaa;font-size:14px;">${esc(p.descripcion || '')}</p>
      </div>
      <div style="text-align:right;color:#ccc;font-size:13px;">
        <div style="font-size:28px;font-weight:900;color:#f4c400;">${money(p.total_con_iva)}</div>
        <div style="margin-top:4px;">Total c/IVA ${p.iva_porcentaje}%</div>
        <div style="margin-top:8px;color:#888;">${fechaStr}</div>
      </div>
    </div>
  </div>

  <!-- Info grid -->
  <div class="grid2">
    <div class="card">
      <div class="label">Cliente</div>
      <div style="font-size:18px;font-weight:900;">${esc(p.cliente || '—')}</div>
      ${p.empresa_cliente ? `<div style="color:#666;margin-top:4px;">${esc(p.empresa_cliente)}</div>` : ''}
      ${p.telefono_whatsapp ? `<div style="color:#555;font-size:12px;margin-top:4px;">📞 ${esc(p.telefono_whatsapp)}</div>` : ''}
      ${p.email_cliente ? `<div style="color:#555;font-size:12px;">✉ ${esc(p.email_cliente)}</div>` : ''}
    </div>
    <div class="card">
      <div class="label">Datos del presupuesto</div>
      <div style="display:grid;gap:6px;">
        <div><span style="color:#999;font-size:12px;">Proveedor:</span> <strong>${esc(p.proveedor || '—')}</strong></div>
        <div><span style="color:#999;font-size:12px;">Ciudad:</span> ${esc(p.ciudad || '—')}</div>
        <div><span style="color:#999;font-size:12px;">Validez:</span> ${esc(p.validez || '—')}</div>
        ${validezStr ? `<div><span style="color:#999;font-size:12px;">Vence:</span> ${esc(validezStr)}</div>` : ''}
        <div><span style="color:#999;font-size:12px;">Plazo entrega:</span> ${esc(p.plazo_entrega || '—')}</div>
      </div>
    </div>
  </div>

  ${p.items?.length ? `
  <!-- Items -->
  <section style="margin-bottom:28px;">
    <h2>Partidas / Productos</h2>
    <table>
      <thead>
        <tr>
          <th>Ítem</th>
          <th style="text-align:center;">Cant.</th>
          <th style="text-align:center;">Unidad</th>
          <th style="text-align:right;">Unitario</th>
          <th style="text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="4" style="color:#555;">Subtotal neto</td>
          <td style="text-align:right;">${money(p.valor_neto)}</td>
        </tr>
        ${p.iva_porcentaje > 0 ? `<tr class="total-row"><td colspan="4" style="color:#555;">IVA ${p.iva_porcentaje}%</td><td style="text-align:right;">${money(p.total_iva)}</td></tr>` : ''}
        <tr style="background:#fffbf0;">
          <td colspan="4" style="font-weight:900;font-size:15px;">Total con IVA</td>
          <td style="text-align:right;font-weight:900;font-size:18px;color:#b8860b;">${money(p.total_con_iva)}</td>
        </tr>
      </tfoot>
    </table>
  </section>` : ''}

  ${p.incluye?.length ? `
  <!-- Incluye / No incluye -->
  <div class="grid2">
    <section class="card">
      <h2 style="margin-bottom:10px;">Incluye</h2>
      ${list(p.incluye, '✓')}
    </section>
    <section class="card">
      <h2 style="margin-bottom:10px;">No incluye</h2>
      ${list(p.no_incluye || [], '✗')}
    </section>
  </div>` : ''}

  ${p.materiales?.length ? `
  <section class="card" style="margin-bottom:24px;">
    <h2>Materiales y terminaciones</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px;">
      ${list(p.materiales, '·')}
    </div>
  </section>` : ''}

  ${p.forma_pago?.length ? `
  <section style="margin-bottom:24px;">
    <h2>Forma de pago</h2>
    <div style="display:flex;flex-wrap:wrap;gap:12px;">${pagoRows}</div>
  </section>` : ''}

  ${p.observacion_tecnica ? `
  <section class="card" style="margin-bottom:24px;border-left:3px solid #f4c400;">
    <h2>Observación técnica</h2>
    <p style="color:#444;line-height:1.7;">${esc(p.observacion_tecnica)}</p>
  </section>` : ''}

  <div class="watermark">Generado con Soluciones Fabrick · ${esc(p.proveedor || 'Soluciones Fabrick')}</div>
</div>

<button class="print-btn no-print" onclick="window.print()">🖨 Imprimir / PDF</button>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  let body: { presupuesto?: PresupuestoPro };
  try { body = await req.json() as { presupuesto?: PresupuestoPro }; }
  catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }); }

  const p = body.presupuesto;
  if (!p) return NextResponse.json({ error: 'Presupuesto requerido' }, { status: 400 });

  const html = buildHtml(p);
  const filename = `presupuesto-${(p.slug || p.id || 'export').replace(/[^a-z0-9-]/gi, '-')}.html`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
