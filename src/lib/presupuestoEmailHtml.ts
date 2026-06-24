import type { PresupuestoItem, PresupuestoPro } from '@/lib/presupuestosBuilder';

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

type EmailBudgetOptions = {
  presupuesto: PresupuestoPro;
  publicLink?: string;
  message?: string;
};

function esc(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function obj(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value ? value as Record<string, unknown> : {};
}

function readString(data: Record<string, unknown>, key: string, fallback = '') {
  const value = data[key];
  return typeof value === 'string' ? value : fallback;
}

function readNumber(data: Record<string, unknown>, key: string, fallback = 0) {
  const value = data[key];
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function saleLabel(mode: string) {
  if (mode === 'solo_instalacion') return 'Solo instalación';
  if (mode === 'solo_equipo') return 'Solo equipo';
  return 'Aire + instalación';
}

function itemRows(items: PresupuestoItem[]) {
  if (!items.length) return '<tr><td colspan="4" style="padding:14px;color:#71717a">Sin partidas cargadas.</td></tr>';
  return items.map((item) => `
    <tr>
      <td style="padding:14px 10px;border-bottom:1px solid #27272a">
        <strong style="display:block;color:#fff;font-size:14px">${esc(item.nombre)}</strong>
        ${item.descripcion ? `<span style="display:block;margin-top:4px;color:#a1a1aa;font-size:12px;line-height:18px">${esc(item.descripcion)}</span>` : ''}
      </td>
      <td style="padding:14px 10px;border-bottom:1px solid #27272a;color:#d4d4d8;text-align:center;font-size:13px">${esc(item.cantidad)} ${esc(item.unidad)}</td>
      <td style="padding:14px 10px;border-bottom:1px solid #27272a;color:#d4d4d8;text-align:right;font-size:13px">${money.format(Number(item.precio_unitario || 0))}</td>
      <td style="padding:14px 10px;border-bottom:1px solid #27272a;color:#facc15;text-align:right;font-weight:800;font-size:13px">${money.format(Number(item.total || 0))}</td>
    </tr>
  `).join('');
}

function chipList(items: string[]) {
  const clean = items.filter(Boolean).slice(0, 12);
  if (!clean.length) return '<p style="margin:0;color:#71717a;font-size:13px">Sin información cargada.</p>';
  return clean.map((item) => `<span style="display:inline-block;margin:0 6px 8px 0;padding:9px 12px;border:1px solid #3f3f46;border-radius:999px;background:#18181b;color:#f4f4f5;font-size:12px;font-weight:700">✓ ${esc(item)}</span>`).join('');
}

export function buildPresupuestoEmailHtml({ presupuesto, publicLink = '', message = '' }: EmailBudgetOptions) {
  const presentation = obj(presupuesto.json_presentacion);
  const calc = obj(presentation.calculo);
  const inputs = obj(presentation.inputs);
  const producto = obj(presentation.producto);
  const consumo = obj(presentation.consumo);
  const venta = readString(inputs, 'venta', readString(presentation, 'venta', 'equipo_instalacion'));
  const area = readNumber(calc, 'area', readNumber(inputs, 'largo', 0) * readNumber(inputs, 'ancho', 0));
  const btu = readNumber(calc, 'seleccionado', readNumber(calc, 'recomendado', readNumber(calc, 'btu', 0)));
  const garantia = readString(presentation, 'garantia', presupuesto.observacion_tecnica || 'Garantía según condiciones del proyecto y validación técnica.');
  const visita = readString(presentation, 'visita_tecnica', presupuesto.observacion_tecnica || 'Visita técnica recomendada para validar condiciones reales de instalación.');
  const barcode = esc((presupuesto.slug || presupuesto.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(-18).toUpperCase());
  const client = presupuesto.empresa_cliente || presupuesto.cliente || 'Cliente';
  const link = publicLink || '';
  const preheader = `Presupuesto ${presupuesto.titulo} por ${money.format(Number(presupuesto.total_con_iva || 0))}`;

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${esc(presupuesto.titulo)}</title>
  </head>
  <body style="margin:0;background:#050505;color:#fff;font-family:Arial,Helvetica,sans-serif">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${esc(preheader)}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050505;padding:24px 10px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:760px;background:#111;border:1px solid #27272a;border-radius:28px;overflow:hidden">
            <tr>
              <td style="padding:34px 28px 22px;text-align:center;background:radial-gradient(circle at top right,#78350f 0,#111 42%,#080808 100%)">
                <div style="width:72px;height:72px;margin:0 auto;border-radius:50%;background:#050505;border:1px solid #f59e0b;line-height:72px;text-align:center;color:#facc15;font-weight:900;font-size:24px;letter-spacing:-2px">SF</div>
                <p style="margin:14px 0 0;color:#facc15;text-transform:uppercase;letter-spacing:4px;font-size:11px;font-weight:900">Soluciones Fabrick</p>
                <h1 style="margin:18px 0 8px;color:#fff;font-size:32px;line-height:36px;letter-spacing:-1px">${esc(presupuesto.titulo)}</h1>
                <p style="margin:0 auto;max-width:620px;color:#d4d4d8;font-size:15px;line-height:24px">${esc(presupuesto.descripcion)}</p>
                ${message ? `<p style="margin:18px auto 0;max-width:620px;color:#fde68a;font-size:14px;line-height:22px">${esc(message)}</p>` : ''}
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:14px;border:1px solid #27272a;border-radius:18px;background:#18181b">
                      <p style="margin:0;color:#71717a;text-transform:uppercase;letter-spacing:2px;font-size:10px;font-weight:900">Cliente</p>
                      <strong style="display:block;margin-top:4px;color:#fff;font-size:17px">${esc(client)}</strong>
                    </td>
                    <td width="14"></td>
                    <td style="padding:14px;border:1px solid #f59e0b;border-radius:18px;background:#facc15;color:#111;text-align:right">
                      <p style="margin:0;text-transform:uppercase;letter-spacing:2px;font-size:10px;font-weight:900">Total</p>
                      <strong style="display:block;margin-top:4px;font-size:22px">${money.format(Number(presupuesto.total_con_iva || 0))}</strong>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 22px">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px dashed #3f3f46;border-radius:24px;background:#161616;overflow:hidden">
                  <tr>
                    <td style="padding:22px;text-align:center">
                      <p style="margin:0;color:#a1a1aa;font-size:13px">Tipo de compra</p>
                      <strong style="display:block;margin-top:6px;color:#facc15;font-size:24px">${esc(saleLabel(venta))}</strong>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px">
                        <tr>
                          <td style="padding:12px;background:#0b0b0b;border-radius:16px;text-align:center"><span style="display:block;color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:2px;font-weight:900">Cobertura</span><strong style="color:#fff;font-size:16px">${area ? `${num.format(area)} m²` : 'Por validar'}</strong></td>
                          <td width="10"></td>
                          <td style="padding:12px;background:#0b0b0b;border-radius:16px;text-align:center"><span style="display:block;color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:2px;font-weight:900">Equipo</span><strong style="color:#fff;font-size:16px">${btu ? `${whole.format(btu)} BTU` : 'Auto'}</strong></td>
                          <td width="10"></td>
                          <td style="padding:12px;background:#0b0b0b;border-radius:16px;text-align:center"><span style="display:block;color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:2px;font-weight:900">Folio</span><strong style="color:#fff;font-size:13px">${esc(presupuesto.id)}</strong></td>
                        </tr>
                      </table>
                      <div style="margin:24px auto 0;width:250px;max-width:100%;height:54px;background:repeating-linear-gradient(90deg,#fff 0 2px,transparent 2px 5px,#fff 5px 6px,transparent 6px 10px)"></div>
                      <p style="margin:8px 0 0;color:#71717a;letter-spacing:4px;font-size:11px">${barcode}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 24px">
                <h2 style="margin:0 0 12px;color:#fff;font-size:20px">Detalle del presupuesto</h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #27272a;border-radius:20px;background:#111;overflow:hidden">
                  <thead>
                    <tr style="background:#0b0b0b;color:#facc15;text-transform:uppercase;font-size:10px;letter-spacing:2px">
                      <th align="left" style="padding:12px 10px">Item</th>
                      <th align="center" style="padding:12px 10px">Cant.</th>
                      <th align="right" style="padding:12px 10px">Unitario</th>
                      <th align="right" style="padding:12px 10px">Total</th>
                    </tr>
                  </thead>
                  <tbody>${itemRows(presupuesto.items || [])}</tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 24px">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:18px;border:1px solid #27272a;border-radius:20px;background:#18181b;vertical-align:top">
                      <h3 style="margin:0 0 10px;color:#facc15;font-size:15px">Incluye</h3>
                      ${chipList(presupuesto.incluye || [])}
                    </td>
                  </tr>
                  <tr><td height="12"></td></tr>
                  <tr>
                    <td style="padding:18px;border:1px solid #27272a;border-radius:20px;background:#18181b;vertical-align:top">
                      <h3 style="margin:0 0 10px;color:#facc15;font-size:15px">Visita técnica y garantía</h3>
                      <p style="margin:0 0 8px;color:#d4d4d8;font-size:13px;line-height:20px"><strong>Visita:</strong> ${esc(visita)}</p>
                      <p style="margin:0;color:#d4d4d8;font-size:13px;line-height:20px"><strong>Garantía:</strong> ${esc(garantia)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 24px">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #27272a;border-radius:20px;background:#18181b">
                  <tr>
                    <td style="padding:18px">
                      <h3 style="margin:0 0 10px;color:#facc15;font-size:15px">Datos técnicos</h3>
                      <p style="margin:0;color:#d4d4d8;font-size:13px;line-height:22px"><strong>SKU:</strong> ${esc(readString(producto, 'sku', 'No definido'))} · <strong>Stock:</strong> ${esc(readNumber(producto, 'stock', 0))} · <strong>Consumo estimado:</strong> ${esc(readNumber(consumo, 'kwhInverter', 0).toFixed(1))} kWh/mes</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${link ? `<tr><td align="center" style="padding:4px 28px 32px"><a href="${esc(link)}" style="display:inline-block;background:#facc15;color:#111;text-decoration:none;font-weight:900;border-radius:999px;padding:15px 24px">Abrir presupuesto interactivo</a><p style="margin:14px 0 0;color:#71717a;font-size:12px">El link contiene la versión completa con visor, boleta y detalles actualizados.</p></td></tr>` : ''}
            <tr>
              <td style="padding:18px 28px;background:#080808;color:#71717a;text-align:center;font-size:11px;line-height:18px">Correo comercial enviado desde el panel interno de Soluciones Fabrick. Responde este correo para consultar ajustes del presupuesto.</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildPresupuestoEmailText({ presupuesto, publicLink = '', message = '' }: EmailBudgetOptions) {
  return [
    'Soluciones Fabrick',
    `Presupuesto: ${presupuesto.titulo}`,
    `Cliente: ${presupuesto.empresa_cliente || presupuesto.cliente}`,
    `Total: ${money.format(Number(presupuesto.total_con_iva || 0))}`,
    message ? `Mensaje: ${message}` : '',
    publicLink ? `Link: ${publicLink}` : '',
  ].filter(Boolean).join('\n');
}
