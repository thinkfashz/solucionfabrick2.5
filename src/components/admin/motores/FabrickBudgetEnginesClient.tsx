'use client';

import { useMemo, useState } from 'react';
import type { PresupuestoItem, PresupuestoPro } from '@/lib/presupuestosBuilder';

type Kind = 'radier' | 'aire';
type Shape = 'rect' | 'square' | 'L' | 'U' | 'C' | 'T';
type SaleMode = 'equipo_instalacion' | 'solo_instalacion' | 'solo_equipo';

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

function uid(prefix = 'sf') {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || `presupuesto-${Date.now()}`;
}

function item(partial: Partial<PresupuestoItem>, orden: number): PresupuestoItem {
  const cantidad = Number(partial.cantidad ?? 1) || 1;
  const precio = Math.round(Number(partial.precio_unitario ?? 0) || 0);
  return {
    id: uid('item'),
    nombre: partial.nombre || 'Item',
    descripcion: partial.descripcion || '',
    categoria: partial.categoria || 'Servicios',
    cantidad,
    unidad: partial.unidad || 'un',
    precio_unitario: precio,
    total: Math.round(cantidad * precio),
    orden,
  };
}

const shapeLabel: Record<Shape, string> = {
  rect: 'Rectangular',
  square: 'Cuadrado',
  L: 'Tipo L',
  U: 'Tipo U',
  C: 'Tipo C',
  T: 'Tipo T',
};

const capacityOptions = [9000, 12000, 13000, 16000, 18000, 24000];

export default function FabrickBudgetEnginesClient({ kind }: { kind: Kind }) {
  const isRadier = kind === 'radier';
  const [client, setClient] = useState({ cliente: '', empresa: '', email: '', telefono: '', ciudad: 'Chile' });
  const [expiresHours, setExpiresHours] = useState(120);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [link, setLink] = useState('');

  const [radier, setRadier] = useState({
    nombre: 'Radier patio / bodega', shape: 'rect' as Shape, largo: 6, ancho: 4,
    retornoX: 3, retornoY: 2, vanoW: 2, vanoD: 2, talloW: 2, talloD: 3,
    espesorCm: 10, estabilizadoCm: 10, gravillaCm: 5, sacosM3: 7,
    precioSaco: 8200, precioArena: 38000, precioGravilla: 42000,
    precioEstabilizado: 28000, precioBase: 32000, moldajeMl: 2600,
    manoObraM2: 12000, fijo: 45000, margenPct: 28, ivaPct: 19,
  });

  const [aire, setAire] = useState({
    nombre: 'Dormitorio principal', largo: 4.2, ancho: 3.5, alto: 2.5, personas: 2, watts: 250,
    sol: 1, aislacion: 1, uso: 1, capacidad: 'auto', venta: 'equipo_instalacion' as SaleMode,
    instalacion: 180000, materiales: 65000, visita: 25000, margenPct: 18, ivaPct: 19,
    p9000: 289000, p12000: 349000, p13000: 379000, p16000: 449000, p18000: 529000, p24000: 749000,
    horasDia: 6, diasMes: 30, tarifaKwh: 210,
  });

  const radierCalc = useMemo(() => {
    const largo = radier.shape === 'square' ? radier.ancho : radier.largo;
    const ancho = radier.ancho;
    const box = largo * ancho;
    let area = box;
    let perimetro = 2 * (largo + ancho);
    if (radier.shape === 'L') {
      const cutX = Math.max(0, largo - radier.retornoX);
      const cutY = Math.max(0, ancho - radier.retornoY);
      area = box - cutX * cutY;
      perimetro += 2 * (cutX + cutY);
    }
    if (radier.shape === 'U') {
      area = box - Math.min(largo * .8, radier.vanoW) * Math.min(ancho * .86, radier.vanoD);
      perimetro += 2 * Math.min(ancho * .86, radier.vanoD);
    }
    if (radier.shape === 'C') {
      area = box - Math.min(largo * .7, radier.vanoW) * Math.min(ancho * .82, radier.vanoD);
      perimetro += 2 * Math.min(largo * .7, radier.vanoW);
    }
    if (radier.shape === 'T') {
      const topD = Math.max(ancho - radier.talloD, ancho * .28);
      area = largo * topD + radier.talloW * radier.talloD;
      perimetro = 2 * largo + 2 * topD + 2 * radier.talloD + 2 * radier.talloW;
    }
    area = Math.max(0, area);
    const hormigon = area * (radier.espesorCm / 100);
    const estabilizado = area * (radier.estabilizadoCm / 100);
    const base = area * (radier.gravillaCm / 100);
    const sacos = Math.ceil(hormigon * radier.sacosM3);
    const arena = hormigon * .52;
    const gravilla = hormigon * .78;
    const costo = sacos * radier.precioSaco + arena * radier.precioArena + gravilla * radier.precioGravilla + estabilizado * radier.precioEstabilizado + base * radier.precioBase + perimetro * radier.moldajeMl + area * radier.manoObraM2 + radier.fijo;
    const margen = costo * (radier.margenPct / 100);
    const neto = costo + margen;
    const iva = neto * (radier.ivaPct / 100);
    return { largo, ancho, area, perimetro, hormigon, estabilizado, base, sacos, arena, gravilla, costo, margen, neto, iva, total: neto + iva };
  }, [radier]);

  const aireCalc = useMemo(() => {
    const area = aire.largo * aire.ancho;
    const volumen = area * aire.alto;
    const btu = Math.ceil((area * 600 + volumen * 55 + aire.personas * 600 + aire.watts * 3.412) * aire.sol * aire.aislacion * aire.uso);
    const recomendado = capacityOptions.find((c) => c >= btu) || 24000;
    const seleccionado = aire.capacidad === 'auto' ? recomendado : Number(aire.capacidad);
    const prices: Record<number, number> = { 9000: aire.p9000, 12000: aire.p12000, 13000: aire.p13000, 16000: aire.p16000, 18000: aire.p18000, 24000: aire.p24000 };
    const equipo = aire.venta !== 'solo_instalacion' ? prices[seleccionado] || 0 : 0;
    const instalacion = aire.venta !== 'solo_equipo' ? aire.instalacion : 0;
    const materiales = aire.venta !== 'solo_equipo' ? aire.materiales : 0;
    const visita = aire.venta !== 'solo_equipo' ? aire.visita : 0;
    const costo = equipo + instalacion + materiales + visita;
    const margen = costo * (aire.margenPct / 100);
    const neto = costo + margen;
    const iva = neto * (aire.ivaPct / 100);
    const ratio = seleccionado / Math.max(1, btu);
    const estado = ratio < .92 ? 'Bajo' : ratio > 1.18 ? 'Sobredimensionado' : 'Equilibrado';
    const invKwh = seleccionado / 10000 * .78 * aire.horasDia * aire.diasMes;
    const oldKwh = seleccionado / 10000 * 1.08 * aire.horasDia * aire.diasMes;
    return { area, volumen, btu, recomendado, seleccionado, equipo, instalacion, materiales, visita, costo, margen, neto, iva, total: neto + iva, estado, invKwh, oldKwh, ahorro: oldKwh ? Math.round((1 - invKwh / oldKwh) * 100) : 0 };
  }, [aire]);

  const calc = isRadier ? radierCalc : aireCalc;

  function buildItems(): PresupuestoItem[] {
    if (isRadier) return [
      item({ nombre: 'Cemento requerido', descripcion: `${radierCalc.sacos} sacos de 25 kg para ${num.format(radierCalc.hormigon)} m³ de hormigón.`, categoria: 'Radier / Materiales', cantidad: radierCalc.sacos, unidad: 'saco', precio_unitario: radier.precioSaco }, 1),
      item({ nombre: 'Arena hormigón', descripcion: `${num.format(radierCalc.arena)} m³ estimados para mezcla.`, categoria: 'Radier / Materiales', cantidad: radierCalc.arena, unidad: 'm³', precio_unitario: radier.precioArena }, 2),
      item({ nombre: 'Gravilla hormigón', descripcion: `${num.format(radierCalc.gravilla)} m³ estimados para mezcla.`, categoria: 'Radier / Materiales', cantidad: radierCalc.gravilla, unidad: 'm³', precio_unitario: radier.precioGravilla }, 3),
      item({ nombre: 'Base estabilizada', descripcion: `${num.format(radierCalc.estabilizado)} m³ con espesor ${radier.estabilizadoCm} cm.`, categoria: 'Radier / Base', cantidad: radierCalc.estabilizado, unidad: 'm³', precio_unitario: radier.precioEstabilizado }, 4),
      item({ nombre: 'Gravilla base', descripcion: `${num.format(radierCalc.base)} m³ con espesor ${radier.gravillaCm} cm.`, categoria: 'Radier / Base', cantidad: radierCalc.base, unidad: 'm³', precio_unitario: radier.precioBase }, 5),
      item({ nombre: 'Moldaje perimetral', descripcion: `${num.format(radierCalc.perimetro)} metros lineales.`, categoria: 'Radier / Moldaje', cantidad: radierCalc.perimetro, unidad: 'ml', precio_unitario: radier.moldajeMl }, 6),
      item({ nombre: 'Mano de obra radier', descripcion: `Preparación, nivelación, hormigonado y terminación para ${num.format(radierCalc.area)} m².`, categoria: 'Radier / Mano de obra', cantidad: radierCalc.area, unidad: 'm²', precio_unitario: radier.manoObraM2 }, 7),
      item({ nombre: 'Traslado y costo fijo', descripcion: 'Movilización, coordinación y herramientas menores.', categoria: 'Operación', cantidad: 1, unidad: 'servicio', precio_unitario: radier.fijo }, 8),
      item({ nombre: 'Utilidad y gestión comercial', descripcion: `Margen comercial ${radier.margenPct}%.`, categoria: 'Margen', cantidad: 1, unidad: 'margen', precio_unitario: radierCalc.margen }, 9),
    ];

    const items: PresupuestoItem[] = [];
    let orden = 1;
    if (aire.venta !== 'solo_instalacion') items.push(item({ nombre: `Equipo aire acondicionado ${whole.format(aireCalc.seleccionado)} BTU`, descripcion: `${aire.nombre}: ${num.format(aireCalc.area)} m², requerimiento ${whole.format(aireCalc.btu)} BTU, estado ${aireCalc.estado}.`, categoria: 'Climatización / Equipo', cantidad: 1, unidad: 'equipo', precio_unitario: aireCalc.equipo }, orden++));
    if (aire.venta !== 'solo_equipo') {
      items.push(item({ nombre: 'Instalación y puesta en marcha', descripcion: 'Montaje, vacío, pruebas, canalización básica y puesta en marcha.', categoria: 'Climatización / Instalación', cantidad: 1, unidad: 'servicio', precio_unitario: aire.instalacion }, orden++));
      items.push(item({ nombre: 'Materiales de instalación', descripcion: 'Tubería, cableado, soportes, conexión y drenaje estándar.', categoria: 'Climatización / Materiales', cantidad: 1, unidad: 'kit', precio_unitario: aire.materiales }, orden++));
      items.push(item({ nombre: 'Visita / traslado', descripcion: 'Inspección, movilización y coordinación.', categoria: 'Operación', cantidad: 1, unidad: 'visita', precio_unitario: aire.visita }, orden++));
    }
    items.push(item({ nombre: 'Utilidad y gestión comercial', descripcion: `Margen comercial ${aire.margenPct}%.`, categoria: 'Margen', cantidad: 1, unidad: 'margen', precio_unitario: aireCalc.margen }, orden));
    return items;
  }

  function buildBudget(): PresupuestoPro {
    const now = new Date();
    const expires = new Date(now.getTime() + Math.max(1, expiresHours) * 3600_000);
    const cliente = client.cliente.trim() || 'Cliente sin nombre';
    const titulo = isRadier ? `${radier.nombre} · ${shapeLabel[radier.shape]} · ${num.format(radierCalc.area)} m²` : `${aire.nombre} · ${whole.format(aireCalc.seleccionado)} BTU · ${aireCalc.estado}`;
    const items = buildItems();
    const neto = items.reduce((s, i) => s + i.total, 0);
    const ivaPct = isRadier ? radier.ivaPct : aire.ivaPct;
    const iva = Math.round(neto * ivaPct / 100);
    const slug = slugify(`${cliente}-${titulo}-${Date.now().toString(36)}`);
    return {
      id: uid(kind), slug, proveedor: 'Soluciones Fabrick', cliente, empresa_cliente: client.empresa, email_cliente: client.email, telefono_whatsapp: client.telefono,
      titulo, ciudad: client.ciudad, fecha: now.toISOString().slice(0, 10), validez: `${expiresHours} horas`, fecha_vencimiento: expires.toISOString(), estado: 'enviado',
      descripcion: isRadier ? `Cubicación automática: área ${num.format(radierCalc.area)} m², hormigón ${num.format(radierCalc.hormigon)} m³ y ${whole.format(radierCalc.sacos)} sacos.` : `Cálculo automático BTU: requiere ${whole.format(aireCalc.btu)} BTU y se propone equipo ${whole.format(aireCalc.seleccionado)} BTU.`,
      valor_neto: neto, iva_porcentaje: ivaPct, total_iva: iva, total_con_iva: neto + iva, items,
      incluye: isRadier ? ['Cubicación de hormigón', 'Base estabilizada y gravilla', 'Moldaje', 'Mano de obra', 'Link privado con vencimiento'] : ['Cálculo BTU', 'Equipo recomendado', 'Instalación/materiales', 'Comparativa consumo', 'Link privado con vencimiento'],
      no_incluye: isRadier ? ['Permisos municipales', 'Retiro de escombros no declarado', 'Mejoramiento de terreno no detectado'] : ['Refuerzo eléctrico no declarado', 'Trabajos en altura no informados', 'Canalizaciones especiales'],
      materiales: isRadier ? ['Cemento', 'Arena', 'Gravilla', 'Estabilizado', 'Moldaje'] : ['Equipo split inverter', 'Tubería', 'Cableado', 'Soportes', 'Drenaje'],
      forma_pago: [{ porcentaje: 50, descripcion: 'Reserva e inicio' }, { porcentaje: 50, descripcion: 'Contra entrega o avance' }],
      observacion_tecnica: isRadier ? 'Cálculo referencial editable. Validar niveles, compactación, accesos y condiciones reales del terreno antes de ejecutar.' : 'Cálculo referencial comercial. Validar orientación, punto eléctrico, distancia de tubería y ubicación del condensador en visita técnica.',
      json_presentacion: { motor: kind, expires_at: expires.toISOString(), autodestruct_hours: expiresHours, calculo: calc, inputs: isRadier ? radier : aire },
      imagenes: [], archivos: [], html_personalizado: '', usar_html_personalizado: false, created_at: now.toISOString(), updated_at: now.toISOString(),
    };
  }

  async function saveBudget() {
    setSaving(true);
    setStatus('Guardando presupuesto en base de datos…');
    try {
      const presupuesto = buildBudget();
      const publicLink = `${window.location.origin}/presupuestos/${presupuesto.slug}`;
      const res = await fetch('/api/admin/presupuestos/registros', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presupuesto: { ...presupuesto, public_link: publicLink, meta: { modulo: `motor_${kind}`, expires_at: presupuesto.fecha_vencimiento, autodestruct_hours: expiresHours, public_link: publicLink } } }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setLink(publicLink);
      setStatus('Presupuesto creado, guardado y listo para compartir.');
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function createTemporal() {
    setSaving(true);
    setStatus('Creando link temporal rápido…');
    try {
      const presupuesto = buildBudget();
      const res = await fetch('/api/presupuestos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_name: presupuesto.cliente, customer_email: presupuesto.email_cliente || null, customer_phone: presupuesto.telefono_whatsapp || null, total: presupuesto.total_con_iva, notas: `${presupuesto.titulo}\n${presupuesto.descripcion}\nVence: ${presupuesto.fecha_vencimiento}`, items: presupuesto.items.map((i) => ({ descripcion: `${i.nombre}: ${i.descripcion}`, cantidad: i.cantidad, precio_unitario: i.precio_unitario })) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setLink(json.link || '');
      setStatus('Link temporal creado.');
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  const budgetItems = buildItems();
  const budget = buildBudget();

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#090806] p-3 text-white sm:p-5 lg:p-8">
      <style jsx global>{`@media (prefers-reduced-motion: reduce){.sf-anim,.sf-anim *{animation:none!important;transition-duration:.01ms!important}}`}</style>
      <section className="mx-auto grid max-w-7xl gap-5">
        <header className="relative overflow-hidden rounded-[2rem] border border-amber-300/20 bg-zinc-950 p-5 shadow-2xl sm:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(251,191,36,.24),transparent_30rem),radial-gradient(circle_at_88%_8%,rgba(249,115,22,.18),transparent_28rem)]" />
          <div className="relative grid gap-5 lg:grid-cols-[1fr_430px]">
            <div><p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-300">21st.dev style · Soluciones Fabrick</p><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl lg:text-6xl">{isRadier ? 'Motor Radier 3D + Presupuesto' : 'Motor Aire Acondicionado 3D + Presupuesto'}</h1><p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-300">Calcula, visualiza, guarda en base de datos y comparte un link privado con vencimiento automático.</p></div>
            <div className="grid grid-cols-2 gap-3"><Metric label="Neto" value={money.format(budget.valor_neto)} /><Metric label="IVA" value={money.format(budget.total_iva)} /><Metric label="Total" value={money.format(budget.total_con_iva)} accent /><Metric label="Vence" value={`${expiresHours} h`} /></div>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <aside className="grid content-start gap-4 rounded-[1.75rem] border border-white/10 bg-zinc-950/85 p-4 shadow-2xl">
            <Title>Cliente</Title>
            <Text label="Cliente" value={client.cliente} onChange={(v) => setClient({ ...client, cliente: v })} />
            <Text label="Empresa" value={client.empresa} onChange={(v) => setClient({ ...client, empresa: v })} />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><Text label="Email" value={client.email} onChange={(v) => setClient({ ...client, email: v })} /><Text label="WhatsApp" value={client.telefono} onChange={(v) => setClient({ ...client, telefono: v })} /></div>
            <div className="grid gap-3 sm:grid-cols-2"><Text label="Ciudad" value={client.ciudad} onChange={(v) => setClient({ ...client, ciudad: v })} /><Num label="Vence horas" value={expiresHours} onChange={setExpiresHours} /></div>

            {isRadier ? <RadierForm state={radier} setState={setRadier} /> : <AireForm state={aire} setState={setAire} />}
          </aside>

          <section className="grid gap-5">
            <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-950/85 shadow-2xl">
              <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between"><Title>{isRadier ? 'Visualizador radier ligero' : 'Visualizador cuarto + condensador'}</Title><div className="flex flex-wrap gap-2"><button disabled={saving} onClick={saveBudget} className="rounded-full bg-amber-400 px-4 py-2 text-xs font-black text-black disabled:opacity-60">Guardar BD + link</button><button disabled={saving} onClick={createTemporal} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black">Link temporal /p</button><button onClick={() => navigator.clipboard.writeText(summaryText(budget))} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black">Copiar resumen</button></div></div>
              <div className="grid gap-4 p-4 lg:grid-cols-[1fr_320px]"><div className="sf-anim min-h-[360px] overflow-hidden rounded-[1.6rem] border border-amber-300/20 bg-[radial-gradient(circle_at_50%_18%,rgba(251,191,36,.16),transparent_24rem),#050505]">{isRadier ? <RadierVisual shape={radier.shape} calc={radierCalc} /> : <AireVisual calc={aireCalc} />}</div><div className="grid content-start gap-3">{isRadier ? <><Metric label="Superficie" value={`${num.format(radierCalc.area)} m²`} /><Metric label="Hormigón" value={`${num.format(radierCalc.hormigon)} m³`} /><Metric label="Cemento" value={`${whole.format(radierCalc.sacos)} sacos`} /><Metric label="Perímetro" value={`${num.format(radierCalc.perimetro)} ml`} /></> : <><Metric label="Área" value={`${num.format(aireCalc.area)} m²`} /><Metric label="BTU" value={`${whole.format(aireCalc.btu)} BTU`} /><Metric label="Equipo" value={`${whole.format(aireCalc.seleccionado)} BTU`} /><Metric label="Balance" value={aireCalc.estado} /><Metric label="Ahorro" value={`${aireCalc.ahorro}% aprox.`} /></>}</div></div>
            </div>

            <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-950/85 p-4 shadow-2xl"><Title>Presupuesto automático conectado</Title><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left text-sm"><thead className="text-[10px] uppercase tracking-[0.2em] text-zinc-500"><tr><th className="px-3">Concepto</th><th className="px-3">Detalle</th><th className="px-3">Cant.</th><th className="px-3">Unitario</th><th className="px-3 text-right">Total</th></tr></thead><tbody>{budgetItems.map((it) => <tr key={it.id}><td className="rounded-l-2xl border-y border-l border-white/10 bg-white/[0.045] px-3 py-3 font-black">{it.nombre}</td><td className="max-w-[360px] border-y border-white/10 bg-white/[0.045] px-3 py-3 text-xs text-zinc-400">{it.descripcion}</td><td className="border-y border-white/10 bg-white/[0.045] px-3 py-3 text-zinc-300">{num.format(it.cantidad)} {it.unidad}</td><td className="border-y border-white/10 bg-white/[0.045] px-3 py-3 text-zinc-300">{money.format(it.precio_unitario)}</td><td className="rounded-r-2xl border-y border-r border-white/10 bg-white/[0.045] px-3 py-3 text-right font-black text-amber-300">{money.format(it.total)}</td></tr>)}</tbody></table></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><Metric label="Neto" value={money.format(budget.valor_neto)} /><Metric label="IVA" value={money.format(budget.total_iva)} /><Metric label="Total final" value={money.format(budget.total_con_iva)} accent /></div>{(status || link) && <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-sm text-zinc-300">{status && <p>{status}</p>}{link && <a href={link} target="_blank" rel="noreferrer" className="mt-2 block break-all text-amber-300 underline">{link}</a>}</div>}</div>
          </section>
        </section>
      </section>
    </main>
  );
}

function Title({ children }: { children: React.ReactNode }) { return <h2 className="text-xs font-black uppercase tracking-[0.24em] text-amber-300">{children}</h2>; }
function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) { return <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.045] p-4"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{label}</p><p className={`mt-1 truncate text-xl font-black tracking-tight ${accent ? 'text-amber-300' : 'text-white'}`}>{value}</p></div>; }
function Text({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) { return <label className="grid gap-1 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">{label}<input value={value} onChange={(e) => onChange(e.target.value)} className="rounded-2xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300/70" /></label>; }
function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) { return <label className="grid gap-1 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">{label}<input type="number" value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Number(e.target.value) || 0)} className="rounded-2xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300/70" /></label>; }
function Select({ label, value, onChange, options }: { label: string; value: string | number; onChange: (v: string) => void; options: { value: string | number; label: string }[] }) { return <label className="grid gap-1 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-2xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300/70">{options.map((o) => <option key={String(o.value)} value={o.value} className="bg-zinc-950 text-white">{o.label}</option>)}</select></label>; }

function RadierForm({ state, setState }: { state: any; setState: (v: any) => void }) { return <><Title>Radier</Title><Select label="Forma" value={state.shape} onChange={(v) => setState({ ...state, shape: v })} options={Object.entries(shapeLabel).map(([value, label]) => ({ value, label }))} /><Text label="Nombre" value={state.nombre} onChange={(v) => setState({ ...state, nombre: v })} /><div className="grid gap-3 sm:grid-cols-2"><Num label="Largo m" value={state.largo} onChange={(v) => setState({ ...state, largo: v })} /><Num label="Ancho m" value={state.ancho} onChange={(v) => setState({ ...state, ancho: v })} /><Num label="Retorno/Vano X" value={state.retornoX} onChange={(v) => setState({ ...state, retornoX: v, vanoW: v })} /><Num label="Retorno/Vano Y" value={state.retornoY} onChange={(v) => setState({ ...state, retornoY: v, vanoD: v })} /><Num label="Tallo W" value={state.talloW} onChange={(v) => setState({ ...state, talloW: v })} /><Num label="Tallo D" value={state.talloD} onChange={(v) => setState({ ...state, talloD: v })} /><Num label="Espesor cm" value={state.espesorCm} onChange={(v) => setState({ ...state, espesorCm: v })} /><Num label="Estabilizado cm" value={state.estabilizadoCm} onChange={(v) => setState({ ...state, estabilizadoCm: v })} /><Num label="Saco $" value={state.precioSaco} onChange={(v) => setState({ ...state, precioSaco: v })} /><Num label="Mano obra m²" value={state.manoObraM2} onChange={(v) => setState({ ...state, manoObraM2: v })} /><Num label="Fijo $" value={state.fijo} onChange={(v) => setState({ ...state, fijo: v })} /><Num label="Margen %" value={state.margenPct} onChange={(v) => setState({ ...state, margenPct: v })} /></div></>; }
function AireForm({ state, setState }: { state: any; setState: (v: any) => void }) { return <><Title>Aire acondicionado</Title><Text label="Habitación" value={state.nombre} onChange={(v) => setState({ ...state, nombre: v })} /><div className="grid gap-3 sm:grid-cols-2"><Num label="Largo m" value={state.largo} onChange={(v) => setState({ ...state, largo: v })} /><Num label="Ancho m" value={state.ancho} onChange={(v) => setState({ ...state, ancho: v })} /><Num label="Alto m" value={state.alto} onChange={(v) => setState({ ...state, alto: v })} /><Num label="Personas" value={state.personas} onChange={(v) => setState({ ...state, personas: v })} /></div><div className="grid gap-3 sm:grid-cols-2"><Select label="Capacidad" value={state.capacidad} onChange={(v) => setState({ ...state, capacidad: v })} options={[{ value: 'auto', label: 'Automática' }, ...capacityOptions.map((c) => ({ value: String(c), label: `${whole.format(c)} BTU` }))]} /><Select label="Venta" value={state.venta} onChange={(v) => setState({ ...state, venta: v })} options={[{ value: 'equipo_instalacion', label: 'Equipo + instalación' }, { value: 'solo_instalacion', label: 'Solo instalación' }, { value: 'solo_equipo', label: 'Solo equipo' }]} /><Num label="Instalación $" value={state.instalacion} onChange={(v) => setState({ ...state, instalacion: v })} /><Num label="Materiales $" value={state.materiales} onChange={(v) => setState({ ...state, materiales: v })} /><Num label="9.000 $" value={state.p9000} onChange={(v) => setState({ ...state, p9000: v })} /><Num label="12.000 $" value={state.p12000} onChange={(v) => setState({ ...state, p12000: v })} /><Num label="13.000 $" value={state.p13000} onChange={(v) => setState({ ...state, p13000: v })} /><Num label="16.000 $" value={state.p16000} onChange={(v) => setState({ ...state, p16000: v })} /><Num label="18.000 $" value={state.p18000} onChange={(v) => setState({ ...state, p18000: v })} /><Num label="24.000 $" value={state.p24000} onChange={(v) => setState({ ...state, p24000: v })} /></div></>; }

function RadierVisual({ shape, calc }: { shape: Shape; calc: any }) { const poly: Record<Shape, string> = { rect: '100,78 455,78 515,236 158,270', square: '155,70 430,70 500,250 220,278', L: '100,78 350,78 410,150 315,150 350,250 158,270', U: '100,78 455,78 515,236 410,246 382,158 232,158 250,258 158,270', C: '100,78 455,78 480,140 300,140 320,205 505,205 515,236 158,270', T: '100,78 455,78 475,135 360,135 410,250 245,266 285,135 125,135' }; return <svg viewBox="0 0 620 360" className="h-full min-h-[360px] w-full"><defs><linearGradient id="r1" x1="0" x2="1"><stop offset="0%" stopColor="#f3ead6"/><stop offset="100%" stopColor="#655d52"/></linearGradient></defs><polygon points="85,265 520,265 545,294 120,314" fill="#000" opacity=".33"/><polygon points={poly[shape]} transform="translate(0 24)" fill="#7a5035" opacity=".75"/><polygon points={poly[shape]} fill="url(#r1)" stroke="#ffd166" strokeWidth="4"/><text x="66" y="326" fill="#fff4df" fontSize="15" fontWeight="900">{shapeLabel[shape]} · Área {num.format(calc.area)} m² · Hormigón {num.format(calc.hormigon)} m³ · {whole.format(calc.sacos)} sacos</text></svg>; }
function AireVisual({ calc }: { calc: any }) { return <svg viewBox="0 0 640 360" className="h-full min-h-[360px] w-full"><polygon points="85,92 456,92 535,250 150,285" fill="#111827" stroke="#ffd166" strokeWidth="3"/><polygon points="85,92 150,285 150,146 85,45" fill="#101014"/><rect x="185" y="214" width="130" height="52" rx="14" fill="#2b211b"/><rect x="260" y="58" width="150" height="36" rx="14" fill="#e0f7ff"/><path d="M300 100 C278 134, 312 156, 288 192 M350 100 C328 136, 366 160, 342 202 M392 100 C374 130, 410 156, 388 190" stroke="#66e7ff" strokeWidth="4" fill="none" strokeLinecap="round"><animate attributeName="opacity" values=".35;.9;.35" dur="2.8s" repeatCount="indefinite"/></path><path d="M410 76 L448 76 L448 138 L514 138" stroke="#c98347" strokeWidth="7" fill="none"/><rect x="515" y="112" width="76" height="70" rx="13" fill="#202328" stroke="#ffd166"/><circle cx="553" cy="147" r="24" fill="none" stroke="#85dfff" strokeWidth="5"/><text x="72" y="325" fill="#fff4df" fontSize="15" fontWeight="900">{num.format(calc.area)} m² · {whole.format(calc.btu)} BTU requerido · equipo {whole.format(calc.seleccionado)} BTU · {calc.estado}</text></svg>; }
function summaryText(budget: PresupuestoPro) { return `PRESUPUESTO - ${budget.cliente}\n${budget.titulo}\nTOTAL: ${money.format(budget.total_con_iva)}\nVence: ${budget.fecha_vencimiento}\n${budget.items.map((i) => `- ${i.nombre}: ${money.format(i.total)}`).join('\n')}`; }
