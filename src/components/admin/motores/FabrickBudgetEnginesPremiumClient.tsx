'use client';

import { useMemo, useState } from 'react';
import BudgetScene360 from '@/components/presupuestos/BudgetScene360';
import { AnimatedBudgetTicket } from '@/components/presupuestos/AnimatedBudgetTicket';
import type { PresupuestoItem, PresupuestoPro } from '@/lib/presupuestosBuilder';

type Kind = 'radier' | 'aire';
type SaleMode = 'equipo_instalacion' | 'solo_instalacion' | 'solo_equipo';
type Capacity = 9000 | 12000 | 18000 | 24000;
type Tab = 'cliente' | 'comercial' | 'stock' | 'correo';

type ClientData = { cliente: string; empresa: string; email: string; telefono: string; ciudad: string; direccion: string; proyecto: string };
type AireState = {
  nombre: string; largo: number; ancho: number; alto: number; personas: number; watts: number; sol: number; aislacion: number; uso: number;
  capacidad: 'auto' | Capacity; venta: SaleMode; equipoCosto: number; instalacionCosto: number; envioCosto: number; mantencionCosto: number;
  materialesCosto: number; visitaCosto: number; otrosCosto: number; margenPct: number; ivaPct: number; incluirIva: boolean;
  p9000: number; p12000: number; p18000: number; p24000: number; potenciaW: number; horasDia: number; diasMes: number; tarifaKwh: number; venceHoras: number; venceFecha: string;
};
type ProductState = { productoId: string; sku: string; linkProducto: string; stock: number; publicarTienda: boolean; sincronizarProductos: boolean; destacado: boolean; relacionados: string[] };
type CopyState = { incluye: string[]; limites: string[]; garantia: string; visitaTecnica: string };

type CalcAire = ReturnType<typeof calcAire>;

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
const capacities: Capacity[] = [9000, 12000, 18000, 24000];

const defaultClient: ClientData = { cliente: 'Paula González', empresa: 'Hotel Demo', email: 'paula@hoteldemo.cl', telefono: '+56 987 654 321', ciudad: 'Santiago', direccion: 'Av. Providencia 1234, Santiago', proyecto: 'Suite principal' };
const defaultAire: AireState = { nombre: 'Suite principal', largo: 5, ancho: 4, alto: 2.6, personas: 2, watts: 350, sol: 1, aislacion: 1, uso: 1, capacidad: 'auto', venta: 'equipo_instalacion', equipoCosto: 0, instalacionCosto: 180000, envioCosto: 25000, mantencionCosto: 0, materialesCosto: 65000, visitaCosto: 25000, otrosCosto: 0, margenPct: 18, ivaPct: 19, incluirIva: true, p9000: 289000, p12000: 349000, p18000: 529000, p24000: 749000, potenciaW: 1580, horasDia: 6, diasMes: 30, tarifaKwh: 210, venceHoras: 720, venceFecha: '' };
const defaultProduct: ProductState = { productoId: 'pb_air_12000_demo', sku: 'AIR-INV-12K-DEMO', linkProducto: '/productos/aire-inverter-12000', stock: 4, publicarTienda: true, sincronizarProductos: true, destacado: false, relacionados: ['Tubería cobre 3m', 'Soporte exterior', 'Mantención preventiva', 'Aire 18.000 BTU'] };
const defaultCopy: CopyState = { incluye: ['Cálculo BTU y cobertura en m²', 'Visor 360 interactivo', 'Equipo seleccionado según capacidad', 'Instalación estándar y puesta en marcha', 'Calculadora de consumo kWh'], limites: ['Trabajos eléctricos especiales no declarados', 'Perforaciones estructurales complejas', 'Extensiones de tubería fuera de estándar', 'Validación final sujeta a visita técnica'], garantia: 'Garantía de instalación según correcta operación y condiciones reales verificadas. Garantía del equipo según proveedor/fabricante.', visitaTecnica: 'Visita técnica para validar muro, distancia de tubería, energía eléctrica, drenaje, ubicación del condensador y accesibilidad.' };

function uid(prefix = 'sf') { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
function pct(value: number) { return Number.isFinite(value) ? value / 100 : 0; }
function serviceLabel(mode: SaleMode) { return mode === 'solo_instalacion' ? 'Solo instalación' : mode === 'solo_equipo' ? 'Solo equipo' : 'Aire + instalación'; }
function slugify(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || `presupuesto-${Date.now()}`; }
function nextDateFromHours(hours: number) { const d = new Date(Date.now() + Math.max(1, hours) * 3600_000); return d.toISOString().slice(0, 16); }
function hoursFromLocalDate(value: string, fallback: number) { if (!value) return fallback; const target = new Date(value).getTime(); const diff = Math.ceil((target - Date.now()) / 3600_000); return Number.isFinite(diff) && diff > 0 ? diff : fallback; }
function makeItem(partial: Partial<PresupuestoItem>, orden: number): PresupuestoItem {
  const cantidad = Number(partial.cantidad ?? 1) || 1;
  const precio = Math.round(Number(partial.precio_unitario ?? 0) || 0);
  return { id: uid('item'), nombre: partial.nombre || 'Item', descripcion: partial.descripcion || '', categoria: partial.categoria || 'Servicios', cantidad, unidad: partial.unidad || 'un', precio_unitario: precio, total: Math.round(cantidad * precio), orden };
}

function calcAire(a: AireState) {
  const area = a.largo * a.ancho;
  const volumen = area * a.alto;
  const btu = Math.ceil((area * 600 + volumen * 55 + a.personas * 600 + a.watts * 3.412) * a.sol * a.aislacion * a.uso);
  const recomendado = capacities.find((c) => c >= btu) || 24000;
  const seleccionado = a.capacidad === 'auto' ? recomendado : a.capacidad;
  const prices: Record<Capacity, number> = { 9000: a.p9000, 12000: a.p12000, 18000: a.p18000, 24000: a.p24000 };
  const precioVentaEquipo = prices[seleccionado] || 0;
  const costoEquipo = a.equipoCosto > 0 ? a.equipoCosto : Math.round(precioVentaEquipo * 0.72);
  const equipo = a.venta !== 'solo_instalacion' ? precioVentaEquipo : 0;
  const instalacion = a.venta !== 'solo_equipo' ? a.instalacionCosto : 0;
  const envio = a.venta !== 'solo_equipo' ? a.envioCosto : 0;
  const mantencion = a.mantencionCosto;
  const materiales = a.venta !== 'solo_equipo' ? a.materialesCosto : 0;
  const visita = a.venta !== 'solo_equipo' ? a.visitaCosto : 0;
  const otros = a.otrosCosto;
  const subtotalVenta = equipo + instalacion + envio + mantencion + materiales + visita + otros;
  const margen = subtotalVenta * pct(a.margenPct);
  const neto = subtotalVenta + margen;
  const iva = a.incluirIva ? neto * pct(a.ivaPct) : 0;
  const total = neto + iva;
  const ratio = seleccionado / Math.max(1, btu);
  const estado = ratio < 0.92 ? 'Bajo' : ratio > 1.18 ? 'Sobredimensionado' : 'Equilibrado';
  const kwhMes = (a.potenciaW / 1000) * a.horasDia * a.diasMes;
  const costoMensual = kwhMes * a.tarifaKwh;
  const kwhInverter = kwhMes * 0.72;
  const costoInverter = kwhInverter * a.tarifaKwh;
  const ahorro = kwhMes ? Math.round((1 - kwhInverter / kwhMes) * 100) : 0;
  return { area, volumen, btu, recomendado, seleccionado, precioVentaEquipo, costoEquipo, equipo, instalacion, envio, mantencion, materiales, visita, otros, subtotalVenta, margen, neto, iva, total, estado, kwhMes, costoMensual, kwhInverter, costoInverter, ahorro, potenciaW: a.potenciaW, horasDia: a.horasDia, diasMes: a.diasMes, tarifaKwh: a.tarifaKwh };
}

function buildItems(aire: AireState, calc: CalcAire, client: ClientData, product: ProductState, copy: CopyState): PresupuestoItem[] {
  const items: PresupuestoItem[] = [];
  let order = 1;
  if (aire.venta !== 'solo_instalacion') items.push(makeItem({ nombre: `Equipo ${whole.format(calc.seleccionado)} BTU`, descripcion: `${client.proyecto || aire.nombre}: cubre aprox. ${num.format(calc.area)} m², requiere ${whole.format(calc.btu)} BTU. Stock: ${product.stock}. SKU: ${product.sku}.`, categoria: 'Aire / Equipo', cantidad: 1, unidad: 'equipo', precio_unitario: calc.equipo }, order++));
  if (aire.venta !== 'solo_equipo') {
    items.push(makeItem({ nombre: 'Instalación estándar', descripcion: 'Montaje, vacío, pruebas y puesta en marcha.', categoria: 'Aire / Instalación', precio_unitario: aire.instalacionCosto }, order++));
    items.push(makeItem({ nombre: 'Materiales de instalación', descripcion: 'Tubería, cableado, drenaje y terminaciones estándar.', categoria: 'Aire / Materiales', precio_unitario: aire.materialesCosto }, order++));
    items.push(makeItem({ nombre: 'Envío / traslado', descripcion: 'Logística y movilización del equipo técnico.', categoria: 'Aire / Logística', precio_unitario: aire.envioCosto }, order++));
    if (aire.visitaCosto > 0) items.push(makeItem({ nombre: 'Visita técnica', descripcion: copy.visitaTecnica, categoria: 'Aire / Diagnóstico', precio_unitario: aire.visitaCosto }, order++));
  }
  if (aire.mantencionCosto > 0) items.push(makeItem({ nombre: 'Mantención preventiva', descripcion: 'Servicio preventivo opcional asociado al equipo.', categoria: 'Aire / Mantención', precio_unitario: aire.mantencionCosto }, order++));
  if (aire.otrosCosto > 0) items.push(makeItem({ nombre: 'Otros costos asociados', descripcion: 'Costos adicionales definidos por el administrador.', categoria: 'Aire / Otros', precio_unitario: aire.otrosCosto }, order++));
  items.push(makeItem({ nombre: 'Margen comercial', descripcion: `${aire.margenPct}% aplicado sobre subtotal de venta.`, categoria: 'Comercial', precio_unitario: calc.margen }, order++));
  return items;
}

function buildBudget(kind: Kind, aire: AireState, calc: CalcAire, client: ClientData, product: ProductState, copy: CopyState, expiresHours: number, items: PresupuestoItem[]): PresupuestoPro {
  const now = new Date();
  const expires = new Date(now.getTime() + Math.max(1, expiresHours) * 3600_000);
  const cliente = client.cliente.trim() || 'Cliente sin nombre';
  const neto = items.reduce((s, i) => s + i.total, 0);
  const iva = aire.incluirIva ? Math.round(neto * pct(aire.ivaPct)) : 0;
  const titulo = `${client.proyecto || aire.nombre} · ${whole.format(calc.seleccionado)} BTU · ${serviceLabel(aire.venta)}`;
  const consumo = { potenciaW: aire.potenciaW, horasDia: aire.horasDia, diasMes: aire.diasMes, tarifaKwh: aire.tarifaKwh, kwhMes: calc.kwhMes, costoMensual: calc.costoMensual, kwhInverter: calc.kwhInverter, costoInverter: calc.costoInverter, ahorro: calc.ahorro };
  return { id: uid(kind), slug: slugify(`${cliente}-${titulo}-${Date.now().toString(36)}`), proveedor: 'Soluciones Fabrick', cliente, empresa_cliente: client.empresa, email_cliente: client.email, telefono_whatsapp: client.telefono, titulo, descripcion: `Climatización 360: ${serviceLabel(aire.venta)} para ${num.format(calc.area)} m². Requiere ${whole.format(calc.btu)} BTU, equipo sugerido ${whole.format(calc.seleccionado)} BTU.`, ciudad: client.ciudad, fecha: now.toISOString().slice(0, 10), validez: `${expiresHours} horas`, plazo_entrega: 'Según stock, agenda técnica y validación del lugar', fecha_vencimiento: expires.toISOString(), fecha_activacion: now.toISOString(), estado: 'enviado', valor_neto: neto, iva_porcentaje: aire.incluirIva ? aire.ivaPct : 0, total_iva: iva, total_con_iva: neto + iva, html_personalizado: '', usar_html_personalizado: false, json_presentacion: { motor: 'aire', venta: aire.venta, expires_at: expires.toISOString(), autodestruct_hours: expiresHours, calculo: calc, inputs: aire, cliente: client, producto: product, consumo, relacionados: product.relacionados.filter(Boolean), garantia: copy.garantia, visita_tecnica: copy.visitaTecnica, limites: copy.limites, scene360: true }, imagenes: [], archivos: [], incluye: copy.incluye.filter(Boolean), no_incluye: copy.limites.filter(Boolean), materiales: ['Equipo split', 'Tubería', 'Cableado', 'Soportes', ...product.relacionados.filter(Boolean)], forma_pago: [{ porcentaje: 50, descripcion: 'Reserva e inicio' }, { porcentaje: 50, descripcion: 'Contra entrega o avance' }], observacion_tecnica: copy.visitaTecnica, items, created_at: now.toISOString(), updated_at: now.toISOString() };
}

export default function FabrickBudgetEnginesPremiumClient({ kind }: { kind: Kind }) {
  const [client, setClient] = useState<ClientData>(defaultClient);
  const [aire, setAire] = useState<AireState>(defaultAire);
  const [product, setProduct] = useState<ProductState>(defaultProduct);
  const [copy, setCopy] = useState<CopyState>(defaultCopy);
  const [active, setActive] = useState<Tab>('cliente');
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [status, setStatus] = useState('');
  const [link, setLink] = useState('');
  const [shareEmail, setShareEmail] = useState(defaultClient.email);
  const [emailMessage, setEmailMessage] = useState('Te comparto el presupuesto con el detalle técnico, boleta resumen y link interactivo.');
  const calc = useMemo(() => calcAire(aire), [aire]);
  const expiresHours = hoursFromLocalDate(aire.venceFecha, aire.venceHoras);
  const budgetItems = useMemo(() => buildItems(aire, calc, client, product, copy), [aire, calc, client, product, copy]);
  const budget = useMemo(() => buildBudget(kind, aire, calc, client, product, copy, expiresHours, budgetItems), [kind, aire, calc, client, product, copy, expiresHours, budgetItems]);
  const sceneData = { ...aire, ...calc, horasDia: aire.horasDia, diasMes: aire.diasMes, tarifaKwh: aire.tarifaKwh, potenciaW: aire.potenciaW };

  function updateAire<K extends keyof AireState>(key: K, value: AireState[K]) { setAire((prev) => ({ ...prev, [key]: value })); }
  function updateClient<K extends keyof ClientData>(key: K, value: ClientData[K]) { setClient((prev) => ({ ...prev, [key]: value })); }
  function updateProduct<K extends keyof ProductState>(key: K, value: ProductState[K]) { setProduct((prev) => ({ ...prev, [key]: value })); }
  function updateCopy<K extends keyof CopyState>(key: K, value: CopyState[K]) { setCopy((prev) => ({ ...prev, [key]: value })); }
  function setRelated(index: number, value: string) { setProduct((prev) => ({ ...prev, relacionados: prev.relacionados.map((item, i) => i === index ? value : item) })); }
  function addRelated() { setProduct((prev) => ({ ...prev, relacionados: [...prev.relacionados, 'Nuevo relacionado'] })); }
  function removeRelated(index: number) { setProduct((prev) => ({ ...prev, relacionados: prev.relacionados.filter((_, i) => i !== index) })); }

  async function publishBudget(presupuesto: PresupuestoPro) {
    const publicLink = `${window.location.origin}/presupuestos/${presupuesto.slug}`;
    const res = await fetch('/api/admin/presupuestos/registros', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ presupuesto: { ...presupuesto, public_link: publicLink, meta: { modulo: 'motor_aire', producto_id: product.productoId, sku: product.sku, publish_store: product.publicarTienda, sync_products: product.sincronizarProductos, sale_mode: aire.venta, expires_at: presupuesto.fecha_vencimiento, autodestruct_hours: expiresHours, public_link: publicLink } } }) });
    const json = await res.json().catch(() => ({})) as { error?: string };
    if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
    setLink(publicLink);
    return publicLink;
  }

  async function saveBudget() {
    setSaving(true);
    setStatus('Guardando presupuesto en base de datos…');
    try {
      const publicLink = await publishBudget(budget);
      setStatus(`Presupuesto publicado correctamente: ${publicLink}`);
    } catch (err) {
      setStatus(`Error guardando: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function sendBudgetEmail() {
    setSendingEmail(true);
    setStatus('Preparando HTML y enviando correo con Resend…');
    try {
      const publicLink = link || await publishBudget(budget);
      const res = await fetch('/api/admin/presupuestos/enviar-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: shareEmail || client.email, subject: `Presupuesto ${budget.titulo} — Soluciones Fabrick`, message: emailMessage, publicLink, presupuesto: { ...budget, public_link: publicLink } }) });
      const json = await res.json().catch(() => ({})) as { error?: string; id?: string };
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setStatus(`Correo enviado correctamente por Resend. ID: ${json.id || 'sin-id'}`);
    } catch (err) {
      setStatus(`Error enviando correo: ${(err as Error).message}`);
    } finally {
      setSendingEmail(false);
    }
  }

  if (kind !== 'aire') return <main className="min-h-screen bg-[#050403] p-6 text-white">Este panel comercial está optimizado para el motor de aire acondicionado.</main>;

  return <main className="min-h-screen overflow-x-hidden bg-[#050403] pb-24 text-white md:pb-0">
    <div className="mx-auto grid max-w-[1680px] gap-5 p-3 sm:p-5 xl:grid-cols-[420px_1fr_380px]">
      <aside className="rounded-[2rem] border border-amber-300/15 bg-black/60 p-4 shadow-[0_24px_90px_rgba(0,0,0,.55)] backdrop-blur-2xl">
        <p className="text-[10px] font-black uppercase tracking-[.32em] text-amber-300">Motor comercial</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-.06em]">Aire 360</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">Presupuesto, visor 360, boleta y envío real por Resend desde admin.</p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {(['cliente', 'comercial', 'stock', 'correo'] as Tab[]).map((tab) => <button key={tab} onClick={() => setActive(tab)} className={`rounded-2xl border p-3 text-left text-sm font-black capitalize transition ${active === tab ? 'border-amber-300 bg-amber-400 text-black' : 'border-white/10 bg-white/[.045] text-white/75'}`}>{tab}</button>)}
        </div>

        <div className="mt-5 rounded-[1.7rem] border border-amber-300/20 bg-black/55 p-4">
          {active === 'cliente' && <Panel title="Cliente y medidas" subtitle="Datos del cliente y dimensiones del cuarto.">
            <Grid><Text label="Cliente" value={client.cliente} onChange={(v) => updateClient('cliente', v)} /><Text label="Empresa" value={client.empresa} onChange={(v) => updateClient('empresa', v)} /><Text label="Correo" value={client.email} onChange={(v) => { updateClient('email', v); setShareEmail(v); }} /><Text label="WhatsApp" value={client.telefono} onChange={(v) => updateClient('telefono', v)} /><Text label="Ciudad" value={client.ciudad} onChange={(v) => updateClient('ciudad', v)} /><Text label="Proyecto" value={client.proyecto} onChange={(v) => { updateClient('proyecto', v); updateAire('nombre', v); }} /></Grid>
            <Text label="Dirección" value={client.direccion} onChange={(v) => updateClient('direccion', v)} />
            <Grid><NumberInput label="Largo m" value={aire.largo} onChange={(v) => updateAire('largo', v)} /><NumberInput label="Ancho m" value={aire.ancho} onChange={(v) => updateAire('ancho', v)} /><NumberInput label="Alto m" value={aire.alto} onChange={(v) => updateAire('alto', v)} /><NumberInput label="Personas" value={aire.personas} onChange={(v) => updateAire('personas', v)} /></Grid>
          </Panel>}

          {active === 'comercial' && <Panel title="Comercial" subtitle="Modo de venta, precios, costos, garantía e incluye.">
            <Select label="Modo de venta" value={aire.venta} onChange={(v) => updateAire('venta', v as SaleMode)} options={[['equipo_instalacion', 'Equipo + instalación'], ['solo_instalacion', 'Solo instalación'], ['solo_equipo', 'Solo equipo']]} />
            <Select label="Capacidad" value={String(aire.capacidad)} onChange={(v) => updateAire('capacidad', v === 'auto' ? 'auto' : Number(v) as Capacity)} options={['auto', ...capacities.map(String)].map((v) => [v, v === 'auto' ? 'Automática' : `${whole.format(Number(v))} BTU`])} />
            <Grid><NumberInput label="Precio 9K" value={aire.p9000} onChange={(v) => updateAire('p9000', v)} /><NumberInput label="Precio 12K" value={aire.p12000} onChange={(v) => updateAire('p12000', v)} /><NumberInput label="Precio 18K" value={aire.p18000} onChange={(v) => updateAire('p18000', v)} /><NumberInput label="Precio 24K" value={aire.p24000} onChange={(v) => updateAire('p24000', v)} /><NumberInput label="Instalación" value={aire.instalacionCosto} onChange={(v) => updateAire('instalacionCosto', v)} /><NumberInput label="Materiales" value={aire.materialesCosto} onChange={(v) => updateAire('materialesCosto', v)} /><NumberInput label="Visita técnica" value={aire.visitaCosto} onChange={(v) => updateAire('visitaCosto', v)} /><NumberInput label="Margen %" value={aire.margenPct} onChange={(v) => updateAire('margenPct', v)} /></Grid>
            <ArrayEditor title="Incluye" items={copy.incluye} onChange={(items) => updateCopy('incluye', items)} />
            <ArrayEditor title="Límites / no incluye" items={copy.limites} onChange={(items) => updateCopy('limites', items)} />
            <TextArea label="Visita técnica" value={copy.visitaTecnica} onChange={(v) => updateCopy('visitaTecnica', v)} />
            <TextArea label="Garantía" value={copy.garantia} onChange={(v) => updateCopy('garantia', v)} />
          </Panel>}

          {active === 'stock' && <Panel title="Stock y tienda" subtitle="Producto, SKU, stock y relacionados.">
            <Grid><Text label="ID producto BD" value={product.productoId} onChange={(v) => updateProduct('productoId', v)} /><Text label="SKU" value={product.sku} onChange={(v) => updateProduct('sku', v)} /><NumberInput label="Stock" value={product.stock} onChange={(v) => updateProduct('stock', v)} /><Text label="Link producto" value={product.linkProducto} onChange={(v) => updateProduct('linkProducto', v)} /></Grid>
            <Toggle label="Publicar / mostrar en tienda" checked={product.publicarTienda} onChange={(v) => updateProduct('publicarTienda', v)} />
            <Toggle label="Sincronizar con módulo productos" checked={product.sincronizarProductos} onChange={(v) => updateProduct('sincronizarProductos', v)} />
            <ArrayEditor title="Productos relacionados" items={product.relacionados} onChange={(items) => updateProduct('relacionados', items)} onAdd={addRelated} onRemove={removeRelated} onItemChange={setRelated} />
          </Panel>}

          {active === 'correo' && <Panel title="Enviar presupuesto por correo" subtitle="El cliente recibe HTML; Resend queda oculto en el backend.">
            <Text label="Correo destino" value={shareEmail} onChange={setShareEmail} />
            <TextArea label="Mensaje interno del correo" value={emailMessage} onChange={setEmailMessage} />
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-xs leading-5 text-cyan-100">El correo se envía desde `/api/admin/presupuestos/enviar-email` usando Resend en servidor. El cliente solo ve el correo HTML y el botón para abrir el presupuesto interactivo.</div>
            <button type="button" onClick={sendBudgetEmail} disabled={sendingEmail} className="w-full rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-black text-black disabled:opacity-60">{sendingEmail ? 'Enviando con Resend…' : 'Enviar presupuesto por correo'}</button>
          </Panel>}
        </div>
      </aside>

      <section className="grid min-w-0 gap-5">
        <header className="rounded-[2rem] border border-amber-300/20 bg-[radial-gradient(circle_at_82%_0%,rgba(245,158,11,.22),transparent_22rem),linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.02))] p-5 shadow-2xl sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-300">Soluciones Fabrick · herramienta premium</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-.06em] sm:text-6xl">Motor Aire 360 + Correo HTML</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-300">Calcula BTU, controla costos, stock, vigencia, boleta y envía el presupuesto por Resend desde el admin.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-4"><Metric label="Neto" value={money.format(budget.valor_neto)} /><Metric label="IVA" value={money.format(budget.total_iva)} /><Metric label="Total" value={money.format(budget.total_con_iva)} accent /><Metric label="Cubre" value={`${num.format(calc.area)} m²`} /></div>
          <div className="mt-5 flex flex-wrap gap-2"><button disabled={saving} onClick={saveBudget} className="rounded-full bg-amber-400 px-4 py-3 text-xs font-black text-black disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar BD + link'}</button><button disabled={sendingEmail} onClick={sendBudgetEmail} className="rounded-full bg-cyan-300 px-4 py-3 text-xs font-black text-black disabled:opacity-60">{sendingEmail ? 'Enviando…' : 'Enviar correo HTML'}</button>{link && <a href={link} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 bg-white/10 px-4 py-3 text-xs font-black text-white">Abrir link</a>}</div>
        </header>

        <section className="rounded-[2rem] border border-amber-300/15 bg-black/45 p-4 shadow-2xl backdrop-blur-2xl"><BudgetScene360 kind="aire" title="Cuarto + aire acondicionado 360" subtitle="El cliente lo verá en el link público. El correo lleva una versión HTML compatible con Gmail." data={sceneData as Record<string, unknown>} compact /></section>
      </section>

      <aside className="rounded-[2rem] border border-amber-300/15 bg-black/55 p-4 shadow-2xl backdrop-blur-2xl">
        <p className="text-[10px] font-black uppercase tracking-[.32em] text-amber-300">Boleta / email preview</p>
        <div className="mt-4 grid place-items-center"><AnimatedBudgetTicket ticketId={budget.id} amount={budget.total_con_iva} date={budget.created_at} clientName={client.empresa || client.cliente} companyName="Soluciones Fabrick" serviceMode={aire.venta} projectTitle={budget.titulo} coverageM2={calc.area} btu={calc.seleccionado} barcodeValue={budget.slug} items={budgetItems} /></div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.045] p-4"><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Consumo visible</p><b className="mt-1 block text-2xl text-cyan-200">{num.format(calc.kwhInverter)} kWh/mes</b><p className="mt-1 text-xs text-zinc-400">Estimado con {aire.horasDia} h/día y tarifa {money.format(aire.tarifaKwh)} por kWh.</p></div>
        {status && <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100">{status}</div>}
      </aside>
    </div>
  </main>;
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <div className="grid gap-3"><div><h3 className="text-2xl font-black text-amber-300">{title}</h3><p className="text-xs leading-5 text-zinc-400">{subtitle}</p></div>{children}</div>; }
function Grid({ children }: { children: React.ReactNode }) { return <div className="grid gap-3 sm:grid-cols-2">{children}</div>; }
function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) { return <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{label}</p><p className={`mt-1 truncate text-xl font-black tracking-tight ${accent ? 'text-amber-300' : 'text-white'}`}>{value}</p></div>; }
function Text({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) { return <label className="grid gap-1 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">{label}<input value={value} onChange={(e) => onChange(e.target.value)} className="rounded-2xl border border-white/10 bg-black/35 px-3 py-3 text-sm text-white outline-none focus:border-amber-300/70" /></label>; }
function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) { return <label className="grid gap-1 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">{label}<textarea value={value} onChange={(e) => onChange(e.target.value)} className="min-h-24 rounded-2xl border border-white/10 bg-black/35 px-3 py-3 text-sm text-white outline-none focus:border-amber-300/70" /></label>; }
function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) { return <label className="grid gap-1 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">{label}<input type="number" value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Number(e.target.value) || 0)} className="rounded-2xl border border-white/10 bg-black/35 px-3 py-3 text-sm text-white outline-none focus:border-amber-300/70" /></label>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[][] }) { return <label className="grid gap-1 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-2xl border border-white/10 bg-black/35 px-3 py-3 text-sm text-white outline-none focus:border-amber-300/70">{options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}</select></label>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) { return <button type="button" onClick={() => onChange(!checked)} className="mt-2 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.045] px-3 py-3 text-left text-sm font-bold"><span>{label}</span><span className={`rounded-full px-3 py-1 text-xs font-black ${checked ? 'bg-amber-400 text-black' : 'bg-white/10 text-white'}`}>{checked ? 'Sí' : 'No'}</span></button>; }
function ArrayEditor({ title, items, onChange, onAdd, onRemove, onItemChange }: { title: string; items: string[]; onChange: (items: string[]) => void; onAdd?: () => void; onRemove?: (index: number) => void; onItemChange?: (index: number, value: string) => void }) { return <div className="mt-3 rounded-2xl border border-white/10 bg-white/[.045] p-3"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{title}</p><button type="button" onClick={() => onAdd ? onAdd() : onChange([...items, 'Nuevo punto'])} className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-black">Añadir</button></div><div className="mt-3 grid gap-2">{items.map((item, i) => <div key={`${title}-${i}`} className="grid grid-cols-[1fr_auto] gap-2"><input value={item} onChange={(e) => onItemChange ? onItemChange(i, e.target.value) : onChange(items.map((current, index) => index === i ? e.target.value : current))} className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm outline-none focus:border-amber-300/70" /><button type="button" onClick={() => onRemove ? onRemove(i) : onChange(items.filter((_, index) => index !== i))} className="rounded-xl bg-white/10 px-3 text-xs font-black">×</button></div>)}</div></div>; }
