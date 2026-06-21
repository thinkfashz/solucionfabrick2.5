'use client';

import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text as Text3D } from '@react-three/drei';
import * as THREE from 'three';

type SaleMode = 'equipo_instalacion' | 'solo_equipo' | 'solo_instalacion';
type ClientData = { cliente: string; empresa: string; email: string; telefono: string; ciudad: string };
type RoomState = {
  nombre: string;
  largo: number;
  ancho: number;
  alto: number;
  habitaciones: number;
  activa: number;
  personas: number;
  watts: number;
  sol: number;
  aislacion: number;
  uso: number;
};
type Product = {
  id: string;
  marca: string;
  modelo: string;
  btu: number;
  tipo: string;
  compra: number;
  margenPct: number;
  proveedorUrl: string;
  descripcion: string;
  destacado: string;
};
type BudgetItem = { id: string; nombre: string; descripcion: string; categoria: string; cantidad: number; unidad: string; precio_unitario: number; total: number; orden: number };

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const numberFmt = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

const defaultClient: ClientData = { cliente: '', empresa: '', email: '', telefono: '', ciudad: 'Chile' };
const defaultRoom: RoomState = {
  nombre: 'Dormitorio principal',
  largo: 4.2,
  ancho: 3.5,
  alto: 2.5,
  habitaciones: 1,
  activa: 1,
  personas: 2,
  watts: 250,
  sol: 1,
  aislacion: 1,
  uso: 1
};

const products: Product[] = [
  {
    id: 'samsung-windfree-9000',
    marca: 'Samsung',
    modelo: 'WindFree Inverter 9000 BTU',
    btu: 9000,
    tipo: 'Split muro frío/calor inverter',
    compra: 389990,
    margenPct: 30,
    proveedorUrl: 'https://www.samsung.com/cl/air-conditioners/',
    descripcion: 'Equipo para dormitorio pequeño u oficina compacta. Enfoque en bajo consumo, operación silenciosa y confort estable.',
    destacado: 'Dormitorio / oficina'
  },
  {
    id: 'samsung-windfree-12000',
    marca: 'Samsung',
    modelo: 'WindFree Inverter 12000 BTU',
    btu: 12000,
    tipo: 'Split muro frío/calor inverter',
    compra: 459990,
    margenPct: 30,
    proveedorUrl: 'https://www.samsung.com/cl/air-conditioners/',
    descripcion: 'Capacidad recomendada para habitaciones medianas, living compacto o espacios de uso diario.',
    destacado: 'Más vendido residencial'
  },
  {
    id: 'samsung-windfree-18000',
    marca: 'Samsung',
    modelo: 'WindFree Inverter 18000 BTU',
    btu: 18000,
    tipo: 'Split muro frío/calor inverter',
    compra: 649990,
    margenPct: 30,
    proveedorUrl: 'https://www.samsung.com/cl/air-conditioners/',
    descripcion: 'Equipo para living amplio, sala comercial pequeña o espacios con mayor carga térmica.',
    destacado: 'Living amplio'
  },
  {
    id: 'samsung-windfree-24000',
    marca: 'Samsung',
    modelo: 'WindFree Inverter 24000 BTU',
    btu: 24000,
    tipo: 'Split muro frío/calor inverter',
    compra: 899990,
    margenPct: 30,
    proveedorUrl: 'https://www.samsung.com/cl/air-conditioners/',
    descripcion: 'Alta capacidad para espacios grandes, oficinas abiertas, salones o locales comerciales.',
    destacado: 'Alta capacidad'
  }
];

function uid(prefix = 'sf') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || `presupuesto-${Date.now()}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function salePrice(product: Product) {
  return Math.round(product.compra * (1 + product.margenPct / 100));
}

function calculate(room: RoomState, productId: string, saleMode: SaleMode, install: number, maintenance: boolean, maintenancePrice: number, materials: number) {
  const area = room.largo * room.ancho;
  const volumen = area * room.alto;
  const baseBtu = area * 600 + volumen * 55 + room.personas * 600 + room.watts * 3.412;
  const requerido = Math.ceil(baseBtu * room.sol * room.aislacion * room.uso);
  const recomendado = products.find((item) => item.btu >= requerido) ?? products[products.length - 1];
  const selected = products.find((item) => item.id === productId) ?? recomendado;
  const equipo = saleMode !== 'solo_instalacion' ? salePrice(selected) : 0;
  const instalacion = saleMode !== 'solo_equipo' ? install : 0;
  const insumos = saleMode !== 'solo_equipo' ? materials : 0;
  const mantencion = maintenance ? maintenancePrice : 0;
  const total = equipo + instalacion + insumos + mantencion;
  const neto = Math.round(total / 1.19);
  const iva = total - neto;
  const ratio = selected.btu / Math.max(1, requerido);
  const estado = ratio < 0.92 ? 'Bajo' : ratio > 1.2 ? 'Sobredimensionado' : 'Equilibrado';
  const oldKwh = selected.btu / 10000 * 1.08 * 6 * 30;
  const invKwh = selected.btu / 10000 * 0.78 * 6 * 30;
  const ahorro = Math.round((1 - invKwh / oldKwh) * 100);
  return { area, volumen, requerido, recomendado, selected, equipo, instalacion, insumos, mantencion, total, neto, iva, estado, ahorro };
}

function makeItem(nombre: string, descripcion: string, precio: number, orden: number, categoria = 'Climatización'): BudgetItem {
  return { id: uid('item'), nombre, descripcion, categoria, cantidad: 1, unidad: 'un', precio_unitario: Math.round(precio), total: Math.round(precio), orden };
}

function buildItems(calc: ReturnType<typeof calculate>, saleMode: SaleMode): BudgetItem[] {
  const items: BudgetItem[] = [];
  let order = 1;
  if (saleMode !== 'solo_instalacion') {
    items.push(makeItem(`Equipo ${calc.selected.marca} ${calc.selected.btu} BTU`, `${calc.selected.modelo}. Precio de compra referencial + margen comercial 30%. Proveedor: ${calc.selected.proveedorUrl}`, calc.equipo, order++));
  }
  if (saleMode !== 'solo_equipo') {
    items.push(makeItem('Instalación profesional', 'Montaje, vacío, prueba de presión, drenaje, puesta en marcha y orientación de uso.', calc.instalacion, order++));
    items.push(makeItem('Materiales estándar', 'Canaleta, tubería, cableado, aislación, drenaje y soporte estándar. Validar distancia real en visita.', calc.insumos, order++));
  }
  if (calc.mantencion > 0) {
    items.push(makeItem('Mantención preventiva', 'Limpieza, revisión de filtros, drenaje, evaporador, condensador y chequeo general.', calc.mantencion, order++));
  }
  return items;
}

function summaryText(client: ClientData, room: RoomState, calc: ReturnType<typeof calculate>, saleMode: SaleMode, items: BudgetItem[]) {
  return [
    'PRESUPUESTO AIRE ACONDICIONADO · SOLUCIONES FABRICK',
    `Cliente: ${client.cliente || 'Sin nombre'}`,
    `Espacio: ${room.nombre} · ${numberFmt.format(calc.area)} m² · ${numberFmt.format(calc.volumen)} m³`,
    `BTU requerido: ${whole.format(calc.requerido)} · Equipo sugerido: ${calc.selected.marca} ${whole.format(calc.selected.btu)} BTU · Estado: ${calc.estado}`,
    `Modo: ${saleMode}`,
    ...items.map((item) => `- ${item.nombre}: ${money.format(item.total)}`),
    `TOTAL FINAL ESTIMADO: ${money.format(calc.total)}`,
    `Link proveedor: ${calc.selected.proveedorUrl}`
  ].join('\n');
}

function buildBudgetPayload(client: ClientData, room: RoomState, calc: ReturnType<typeof calculate>, saleMode: SaleMode, items: BudgetItem[], expiresHours: number, publicLink: string) {
  const now = new Date();
  const cliente = client.cliente.trim() || 'Cliente sin nombre';
  const id = uid('aire3d');
  const title = `${room.nombre} · ${calc.selected.marca} ${calc.selected.btu} BTU · ${calc.estado}`;
  return {
    id,
    slug: slugify(`${cliente}-${title}-${Date.now().toString(36)}`),
    proveedor: 'Soluciones Fabrick',
    cliente,
    empresa_cliente: client.empresa,
    email_cliente: client.email,
    telefono_whatsapp: client.telefono,
    titulo: title,
    descripcion: `Presupuesto inteligente con cálculo BTU, recomendación de equipo, instalación, mantención y visor 3D interactivo.`,
    ciudad: client.ciudad,
    fecha: now.toISOString().slice(0, 10),
    validez: `${expiresHours} horas`,
    plazo_entrega: 'Según stock del proveedor, agenda y validación técnica en terreno',
    fecha_vencimiento: new Date(now.getTime() + expiresHours * 3600_000).toISOString(),
    fecha_activacion: now.toISOString(),
    estado: 'enviado',
    valor_neto: calc.neto,
    iva_porcentaje: 19,
    total_iva: calc.iva,
    total_con_iva: calc.total,
    public_link: publicLink,
    html_personalizado: '',
    usar_html_personalizado: false,
    json_presentacion: {
      motor: 'aire_acondicionado_3d',
      viewer: 'threejs_room_split_condensador',
      room,
      calculo: { area: calc.area, volumen: calc.volumen, btu_requerido: calc.requerido, estado: calc.estado, ahorro_inverter: calc.ahorro },
      producto: calc.selected,
      proveedorUrl: calc.selected.proveedorUrl,
      venta: saleMode,
      nota: 'Precio de equipo editable. Validar stock y precio proveedor antes de compra final.'
    },
    imagenes: [],
    archivos: [],
    incluye: ['Cálculo BTU', 'Recomendación de equipo', 'Visor 3D', 'Presupuesto automático', 'Link proveedor para compra'],
    no_incluye: ['Trabajos eléctricos mayores', 'Perforaciones especiales no visibles', 'Material adicional fuera de estándar'],
    materiales: ['Equipo split', 'Canaleta', 'Tubería de cobre', 'Cableado', 'Drenaje', 'Soportes'],
    forma_pago: [{ porcentaje: 50, descripcion: 'Reserva / compra de equipo' }, { porcentaje: 50, descripcion: 'Contra instalación o entrega' }],
    observacion_tecnica: 'Presupuesto referencial. Validar condiciones reales, distancia entre evaporador y condensador, muro, altura y disponibilidad eléctrica antes de ejecutar.',
    items,
    meta: { modulo: 'motor_aire_acondicionado_3d', provider_url: calc.selected.proveedorUrl, sale_mode: saleMode },
    created_at: now.toISOString(),
    updated_at: now.toISOString()
  };
}

export default function AireAcondicionado3DViewerClient() {
  const [client, setClient] = useState<ClientData>(defaultClient);
  const [room, setRoom] = useState<RoomState>(defaultRoom);
  const [saleMode, setSaleMode] = useState<SaleMode>('equipo_instalacion');
  const [selectedId, setSelectedId] = useState('');
  const [installPrice, setInstallPrice] = useState(125000);
  const [maintenancePrice, setMaintenancePrice] = useState(65000);
  const [materialsPrice, setMaterialsPrice] = useState(35000);
  const [includeMaintenance, setIncludeMaintenance] = useState(false);
  const [showAirflow, setShowAirflow] = useState(true);
  const [expiresHours, setExpiresHours] = useState(720);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [link, setLink] = useState('');

  const provisional = useMemo(() => calculate(room, selectedId, saleMode, installPrice, includeMaintenance, maintenancePrice, materialsPrice), [room, selectedId, saleMode, installPrice, includeMaintenance, maintenancePrice, materialsPrice]);
  const selectedProductId = selectedId || provisional.recomendado.id;
  const calc = useMemo(() => calculate(room, selectedProductId, saleMode, installPrice, includeMaintenance, maintenancePrice, materialsPrice), [room, selectedProductId, saleMode, installPrice, includeMaintenance, maintenancePrice, materialsPrice]);
  const items = useMemo(() => buildItems(calc, saleMode), [calc, saleMode]);

  async function saveBudget() {
    setSaving(true);
    setStatus('Guardando presupuesto del visor 3D…');
    try {
      const tempSlug = slugify(`${client.cliente || 'cliente'}-${room.nombre}-${calc.selected.btu}-${Date.now().toString(36)}`);
      const publicLink = `${window.location.origin}/presupuestos/${tempSlug}`;
      const budget = buildBudgetPayload(client, room, calc, saleMode, items, expiresHours, publicLink);
      const finalBudget = { ...budget, slug: tempSlug, public_link: publicLink };
      const res = await fetch('/api/admin/presupuestos/registros', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ presupuesto: finalBudget }) });
      const json = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setLink(publicLink);
      setStatus('Presupuesto guardado y listo para compartir.');
    } catch (error) {
      setStatus(`Error al guardar: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050403] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(251,191,36,.18),transparent_28rem),radial-gradient(circle_at_80%_10%,rgba(249,115,22,.14),transparent_26rem)]" />
      <div className="relative mx-auto grid max-w-[1760px] gap-5 p-3 sm:p-5 xl:grid-cols-[360px_1fr_380px]">
        <aside className="rounded-[2rem] border border-amber-300/15 bg-black/60 p-4 shadow-[0_24px_90px_rgba(0,0,0,.55)] backdrop-blur-2xl">
          <p className="text-[10px] font-black uppercase tracking-[.32em] text-amber-300">Motor comercial</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-.05em]">Aire 3D Pro</h1>
          <p className="mt-2 text-xs leading-5 text-zinc-400">Calculadora BTU + productos + instalación + mantención + visor Three.js para cerrar ventas con una simulación visual.</p>

          <SectionTitle>Cliente</SectionTitle>
          <div className="grid gap-2">
            <Input label="Cliente" value={client.cliente} onChange={(value) => setClient({ ...client, cliente: value })} />
            <Input label="Empresa" value={client.empresa} onChange={(value) => setClient({ ...client, empresa: value })} />
            <Input label="Email" value={client.email} onChange={(value) => setClient({ ...client, email: value })} />
            <Input label="WhatsApp" value={client.telefono} onChange={(value) => setClient({ ...client, telefono: value })} />
          </div>

          <SectionTitle>Habitación</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Nombre" value={room.nombre} onChange={(value) => setRoom({ ...room, nombre: value })} className="col-span-2" />
            <NumberBox label="Largo m" value={room.largo} onChange={(value) => setRoom({ ...room, largo: value })} step="0.1" />
            <NumberBox label="Ancho m" value={room.ancho} onChange={(value) => setRoom({ ...room, ancho: value })} step="0.1" />
            <NumberBox label="Alto m" value={room.alto} onChange={(value) => setRoom({ ...room, alto: value })} step="0.1" />
            <NumberBox label="Habitaciones" value={room.habitaciones} onChange={(value) => setRoom({ ...room, habitaciones: Math.max(1, Math.round(value)), activa: Math.min(room.activa, Math.max(1, Math.round(value))) })} step="1" />
            <NumberBox label="Personas" value={room.personas} onChange={(value) => setRoom({ ...room, personas: value })} step="1" />
            <NumberBox label="Watts extra" value={room.watts} onChange={(value) => setRoom({ ...room, watts: value })} step="50" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from({ length: room.habitaciones }).map((_, index) => (
              <button key={index} onClick={() => setRoom({ ...room, activa: index + 1 })} className={`rounded-full border px-3 py-2 text-[11px] font-black ${room.activa === index + 1 ? 'border-amber-300 bg-amber-400 text-black' : 'border-white/10 bg-white/[.05] text-white/70'}`}>Hab {index + 1}</button>
            ))}
          </div>

          <SectionTitle>Factores</SectionTitle>
          <div className="grid gap-2">
            <Select label="Sol" value={room.sol} onChange={(value) => setRoom({ ...room, sol: Number(value) })} options={[['0.95', 'Sombra'], ['1', 'Normal'], ['1.12', 'Mucho sol']]} />
            <Select label="Aislación" value={room.aislacion} onChange={(value) => setRoom({ ...room, aislacion: Number(value) })} options={[['0.95', 'Buena'], ['1', 'Normal'], ['1.15', 'Débil']]} />
            <Select label="Uso" value={room.uso} onChange={(value) => setRoom({ ...room, uso: Number(value) })} options={[['0.95', 'Dormitorio'], ['1', 'Residencial'], ['1.12', 'Comercial / intenso']]} />
          </div>
        </aside>

        <section className="grid min-w-0 gap-5">
          <header className="rounded-[2rem] border border-amber-300/20 bg-[radial-gradient(circle_at_82%_0%,rgba(245,158,11,.22),transparent_22rem),linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.02))] p-5 shadow-2xl sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-300">Soluciones Fabrick · presupuesto interactivo</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-.06em] sm:text-6xl">Cuarto + aire + condensador 3D</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-300">El cliente ve el espacio, entiende por qué necesita esos BTU, elige equipo, instalación o mantención y recibe un presupuesto listo para pagar.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <Metric label="Área" value={`${numberFmt.format(calc.area)} m²`} />
              <Metric label="BTU requerido" value={whole.format(calc.requerido)} />
              <Metric label="Equipo sugerido" value={`${whole.format(calc.selected.btu)} BTU`} />
              <Metric label="Total" value={money.format(calc.total)} accent />
            </div>
          </header>

          <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <div className="rounded-[2rem] border border-amber-300/15 bg-black/45 p-3 shadow-2xl backdrop-blur-2xl sm:p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.32em] text-amber-300">Visor Three.js</p>
                  <h3 className="text-3xl font-black tracking-[-.04em]">Habitación interactiva</h3>
                </div>
                <button onClick={() => setShowAirflow(!showAirflow)} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black">{showAirflow ? 'Ocultar aire' : 'Mostrar aire'}</button>
              </div>
              <div className="h-[520px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#100b05]">
                <Canvas shadows dpr={[1, 1.6]}>
                  <PerspectiveCamera makeDefault position={[6.5, 4.6, 7.4]} fov={45} />
                  <ambientLight intensity={0.8} />
                  <directionalLight position={[4, 8, 6]} intensity={1.2} castShadow />
                  <RoomScene room={room} calc={calc} showAirflow={showAirflow} />
                  <OrbitControls enablePan enableZoom minDistance={4} maxDistance={14} target={[0, 1.2, 0]} />
                </Canvas>
              </div>
            </div>

            <div className="grid gap-3 rounded-[2rem] border border-white/10 bg-white/[.045] p-4">
              <p className="text-[10px] font-black uppercase tracking-[.32em] text-amber-300">Configuración de venta</p>
              <Select label="Modo" value={saleMode} onChange={(value) => setSaleMode(value as SaleMode)} options={[[ 'equipo_instalacion', 'Equipo + instalación' ], [ 'solo_equipo', 'Solo equipo' ], [ 'solo_instalacion', 'Solo instalación' ]]} />
              <Select label="Equipo" value={selectedProductId} onChange={(value) => setSelectedId(value)} options={products.map((item) => [item.id, `${item.marca} ${item.btu} BTU · ${money.format(salePrice(item))}`])} />
              <NumberBox label="Instalación" value={installPrice} onChange={setInstallPrice} step="5000" />
              <NumberBox label="Materiales" value={materialsPrice} onChange={setMaterialsPrice} step="5000" />
              <NumberBox label="Mantención" value={maintenancePrice} onChange={setMaintenancePrice} step="5000" />
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-3 text-sm font-bold text-white/80"><input type="checkbox" checked={includeMaintenance} onChange={(event) => setIncludeMaintenance(event.target.checked)} /> Agregar mantención</label>
              <NumberBox label="Validez horas" value={expiresHours} onChange={setExpiresHours} step="24" />
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {products.map((product) => {
              const active = product.id === selectedProductId;
              return <button key={product.id} onClick={() => setSelectedId(product.id)} className={`rounded-[1.6rem] border p-4 text-left transition ${active ? 'border-amber-300 bg-amber-400 text-black' : 'border-white/10 bg-white/[.045] text-white hover:border-amber-300/50'}`}>
                <p className="text-[10px] font-black uppercase tracking-[.24em] opacity-70">{product.destacado}</p>
                <h4 className="mt-2 text-lg font-black tracking-[-.04em]">{product.marca} {product.btu} BTU</h4>
                <p className="mt-1 text-xs leading-5 opacity-75">{product.descripcion}</p>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <span className="text-xs font-black opacity-70">Venta estimada</span>
                  <b className="text-xl">{money.format(salePrice(product))}</b>
                </div>
              </button>;
            })}
          </section>
        </section>

        <aside className="rounded-[2rem] border border-amber-300/15 bg-black/60 p-4 shadow-2xl backdrop-blur-2xl">
          <p className="text-[10px] font-black uppercase tracking-[.32em] text-amber-300">Presupuesto automático</p>
          <h3 className="mt-2 text-2xl font-black tracking-[-.04em]">{calc.selected.marca} {whole.format(calc.selected.btu)} BTU</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{calc.selected.descripcion}</p>
          <div className="mt-4 grid gap-2">
            <Metric label="Estado técnico" value={calc.estado} />
            <Metric label="Ahorro inverter ref." value={`${calc.ahorro}%`} />
            <Metric label="Precio compra ref." value={money.format(calc.selected.compra)} />
            <Metric label="Precio venta equipo" value={money.format(salePrice(calc.selected))} accent />
          </div>
          <div className="mt-4 grid gap-2">
            {items.map((item) => <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[.045] p-3"><div className="flex justify-between gap-3"><b className="text-sm">{item.nombre}</b><b className="text-amber-300">{money.format(item.total)}</b></div><p className="mt-1 text-xs leading-5 text-zinc-400">{item.descripcion}</p></div>)}
          </div>
          <div className="mt-4 rounded-[1.5rem] border border-amber-300/25 bg-amber-400/10 p-4">
            <p className="text-xs font-black uppercase tracking-[.25em] text-amber-200">Total final</p>
            <p className="mt-1 text-4xl font-black tracking-[-.06em] text-amber-300">{money.format(calc.total)}</p>
            <p className="mt-2 text-xs text-amber-100/80">Incluye IVA estimado. Validar stock, precio proveedor y condiciones reales de instalación.</p>
          </div>
          <div className="mt-4 grid gap-2">
            <button disabled={saving} onClick={saveBudget} className="rounded-full bg-amber-400 px-4 py-3 text-sm font-black text-black disabled:opacity-60">Guardar BD + link</button>
            <button onClick={() => navigator.clipboard.writeText(summaryText(client, room, calc, saleMode, items))} className="rounded-full border border-white/10 bg-white/10 px-4 py-3 text-sm font-black">Copiar resumen</button>
            <a href={calc.selected.proveedorUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 bg-white/10 px-4 py-3 text-center text-sm font-black">Abrir proveedor</a>
          </div>
          {(status || link) && <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100">{status && <p>{status}</p>}{link && <a href={link} target="_blank" rel="noreferrer" className="mt-2 block break-all underline">{link}</a>}</div>}
        </aside>
      </div>
    </main>
  );
}

function RoomScene({ room, calc, showAirflow }: { room: RoomState; calc: ReturnType<typeof calculate>; showAirflow: boolean }) {
  const largo = clamp(room.largo, 2.4, 7.5);
  const ancho = clamp(room.ancho, 2.4, 6.5);
  const alto = clamp(room.alto, 2.2, 3.4);
  const wallY = alto / 2;
  const floorY = 0;
  const outsideZ = -ancho / 2 - 1.1;
  return (
    <group>
      <mesh receiveShadow position={[0, floorY - 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[largo, ancho]} />
        <meshStandardMaterial color="#6b4f31" roughness={0.92} />
      </mesh>
      <mesh receiveShadow position={[0, wallY, -ancho / 2]}>
        <boxGeometry args={[largo, alto, 0.08]} />
        <meshStandardMaterial color="#f6e4c8" roughness={0.86} />
      </mesh>
      <mesh receiveShadow position={[-largo / 2, wallY, 0]}>
        <boxGeometry args={[0.08, alto, ancho]} />
        <meshStandardMaterial color="#ead0ad" roughness={0.9} />
      </mesh>
      <mesh receiveShadow position={[largo / 2, wallY, 0]}>
        <boxGeometry args={[0.08, alto, ancho]} />
        <meshStandardMaterial color="#ead0ad" roughness={0.9} />
      </mesh>
      <mesh castShadow receiveShadow position={[0.2, 0.45, 0.7]}>
        <boxGeometry args={[Math.min(2.4, largo * 0.45), 0.28, Math.min(1.55, ancho * 0.38)]} />
        <meshStandardMaterial color="#2f241b" roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0.2, 0.72, 0.7]}>
        <boxGeometry args={[Math.min(2.25, largo * 0.42), 0.18, Math.min(1.4, ancho * 0.34)]} />
        <meshStandardMaterial color="#f7f0dc" roughness={0.75} />
      </mesh>
      <mesh castShadow position={[0, alto - 0.55, -ancho / 2 + 0.08]}>
        <boxGeometry args={[1.35, 0.34, 0.18]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.1} roughness={0.42} />
      </mesh>
      <mesh castShadow position={[0, alto - 0.74, -ancho / 2 + 0.18]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[1.1, 0.04, 0.08]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.55} />
      </mesh>
      <Pipe from={[0.68, alto - 0.56, -ancho / 2 - 0.02]} to={[1.8, alto - 0.56, outsideZ + 0.4]} />
      <group position={[2.15, 0.72, outsideZ]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.0, 0.82, 0.55]} />
          <meshStandardMaterial color="#e5e7eb" roughness={0.5} metalness={0.15} />
        </mesh>
        <mesh position={[0, 0, -0.29]}>
          <cylinderGeometry args={[0.24, 0.24, 0.05, 32]} />
          <meshStandardMaterial color="#111827" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, -0.33]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.25, 0.012, 10, 48]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
      </group>
      {showAirflow && <AirFlow largo={largo} ancho={ancho} alto={alto} />}
      <Text3D position={[-largo / 2 + 0.2, alto + 0.18, -ancho / 2 + 0.05]} fontSize={0.16} color="#fbbf24" anchorX="left">
        {`${calc.selected.marca} ${calc.selected.btu} BTU · ${calc.estado}`}
      </Text3D>
    </group>
  );
}

function Pipe({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const mid = start.clone().add(end).multiplyScalar(0.5);
  const direction = end.clone().sub(start);
  const length = direction.length();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  return <mesh position={mid} quaternion={quaternion} castShadow><cylinderGeometry args={[0.035, 0.035, length, 18]} /><meshStandardMaterial color="#fbbf24" metalness={0.25} roughness={0.4} /></mesh>;
}

function AirFlow({ largo, ancho, alto }: { largo: number; ancho: number; alto: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.children.forEach((child, index) => {
      const mesh = child as THREE.Mesh;
      mesh.position.z = -ancho / 2 + 0.65 + ((t * 0.65 + index * 0.55) % Math.max(1.2, ancho - 1.2));
      mesh.position.y = alto - 0.85 - Math.sin(t + index) * 0.08;
      mesh.position.x = Math.sin(t * 0.7 + index) * Math.min(1.2, largo * 0.25);
    });
  });
  return <group ref={ref}>{Array.from({ length: 9 }).map((_, index) => <mesh key={index}><sphereGeometry args={[0.055, 16, 16]} /><meshStandardMaterial color="#93c5fd" transparent opacity={0.45} emissive="#38bdf8" emissiveIntensity={0.25} /></mesh>)}</group>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 mt-5 text-[10px] font-black uppercase tracking-[.28em] text-amber-300">{children}</p>;
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{label}</p><p className={`mt-1 truncate text-xl font-black tracking-tight ${accent ? 'text-amber-300' : 'text-white'}`}>{value}</p></div>;
}

function Input({ label, value, onChange, className = '' }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return <label className={`grid gap-1 text-xs font-black uppercase tracking-[0.16em] text-zinc-500 ${className}`}>{label}<input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border border-white/10 bg-black/35 px-3 py-3 text-sm text-white outline-none focus:border-amber-300/70" /></label>;
}

function NumberBox({ label, value, onChange, step = '1' }: { label: string; value: number; onChange: (value: number) => void; step?: string }) {
  return <label className="grid gap-1 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">{label}<input type="number" step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="rounded-2xl border border-white/10 bg-black/35 px-3 py-3 text-sm text-white outline-none focus:border-amber-300/70" /></label>;
}

function Select({ label, value, onChange, options }: { label: string; value: string | number; onChange: (value: string) => void; options: [string, string][] }) {
  return <label className="grid gap-1 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border border-white/10 bg-black/35 px-3 py-3 text-sm text-white outline-none focus:border-amber-300/70">{options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}</select></label>;
}
