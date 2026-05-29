'use client';

import { useState, useMemo } from 'react';
import { Calculator, Plus } from 'lucide-react';
import type { PresupuestoItem } from '@/lib/presupuestosBuilder';
import { createBudgetId, formatBudgetMoney } from '@/lib/presupuestosBuilder';

interface RadierInputs {
  modo: 'trompo' | 'camion';
  largo: number;
  ancho: number;
  espesor_cm: number;
  estabilizado_cm: number;
  gravilla_cm: number;
  sacos_por_m3: number;
  precio_saco: number;
  precio_arena: number;
  precio_gravilla: number;
  precio_estabilizado: number;
  precio_hormigon_preparado: number;
  mano_obra: number;
  moldaje: number;
  malla_fierro: number;
  polietileno: number;
  pintura_sellador: number;
  extras: number;
  margen_pct: number;
}

const DEFAULTS: RadierInputs = {
  modo: 'trompo',
  largo: 0,
  ancho: 0,
  espesor_cm: 10,
  estabilizado_cm: 15,
  gravilla_cm: 0,
  sacos_por_m3: 7,
  precio_saco: 8000,
  precio_arena: 40000,
  precio_gravilla: 45000,
  precio_estabilizado: 35000,
  precio_hormigon_preparado: 120000,
  mano_obra: 0,
  moldaje: 0,
  malla_fierro: 0,
  polietileno: 0,
  pintura_sellador: 0,
  extras: 0,
  margen_pct: 30,
};

function Num({ label, value, onChange, prefix }: { label: string; value: number; onChange: (v: number) => void; prefix?: string }) {
  return (
    <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">
      <span>{label}</span>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-xs text-zinc-500">{prefix}</span>}
        <input
          type="number"
          value={value || ''}
          onChange={e => onChange(Number(e.target.value) || 0)}
          className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70"
        />
      </div>
    </label>
  );
}

interface Props {
  onAddItem: (item: PresupuestoItem, desglose: string) => void;
  nextOrden: number;
}

export default function RadierCalculator({ onAddItem, nextOrden }: Props) {
  const [r, setR] = useState<RadierInputs>(DEFAULTS);
  const set = (k: keyof RadierInputs, v: RadierInputs[keyof RadierInputs]) => setR(prev => ({ ...prev, [k]: v }));

  const calc = useMemo(() => {
    const area = r.largo * r.ancho;
    const volHormigon = area * (r.espesor_cm / 100);
    const volEstabilizado = area * (r.estabilizado_cm / 100);
    const volGravilla = area * (r.gravilla_cm / 100);
    const sacosTotal = r.modo === 'trompo' ? Math.ceil(volHormigon * r.sacos_por_m3) : 0;
    const arenaM3 = r.modo === 'trompo' ? volHormigon * 0.6 : 0;
    const gravillaM3 = volGravilla;
    const paladasArena = Math.ceil(arenaM3 * 20);
    const paladasGravilla = Math.ceil(gravillaM3 * 20);

    let costoHormigon = 0;
    if (r.modo === 'trompo') {
      costoHormigon = sacosTotal * r.precio_saco + arenaM3 * r.precio_arena + gravillaM3 * r.precio_gravilla;
    } else {
      costoHormigon = volHormigon * r.precio_hormigon_preparado;
    }
    const costoEstabilizado = volEstabilizado * r.precio_estabilizado;
    const subtotalMateriales = costoHormigon + costoEstabilizado;
    const subtotalMO = r.mano_obra + r.moldaje + r.malla_fierro + r.polietileno + r.pintura_sellador + r.extras;
    const subtotal = subtotalMateriales + subtotalMO;
    const margen = Math.round(subtotal * (r.margen_pct / 100));
    const total = subtotal + margen;

    return { area, volHormigon, volEstabilizado, volGravilla, sacosTotal, arenaM3, gravillaM3, paladasArena, paladasGravilla, subtotalMateriales, subtotalMO, subtotal, margen, total };
  }, [r]);

  function handleAdd() {
    const desglose = [
      `Área: ${calc.area.toFixed(2)} m²`,
      `Hormigón: ${calc.volHormigon.toFixed(3)} m³ (${r.modo === 'trompo' ? `${calc.sacosTotal} sacos, ${calc.arenaM3.toFixed(2)} m³ arena` : 'camión preparado'})`,
      calc.volEstabilizado > 0 ? `Estabilizado: ${calc.volEstabilizado.toFixed(3)} m³` : '',
      calc.volGravilla > 0 ? `Gravilla: ${calc.volGravilla.toFixed(3)} m³` : '',
      `Subtotal materiales: ${formatBudgetMoney(calc.subtotalMateriales)}`,
      `Mano de obra y otros: ${formatBudgetMoney(calc.subtotalMO)}`,
      `Margen ${r.margen_pct}%: ${formatBudgetMoney(calc.margen)}`,
      `Total: ${formatBudgetMoney(calc.total)}`,
    ].filter(Boolean).join(' · ');

    const item: PresupuestoItem = {
      id: createBudgetId('item'),
      nombre: 'Radier de hormigón',
      descripcion: desglose,
      categoria: 'Radier / Obra civil',
      cantidad: 1,
      unidad: 'proyecto',
      precio_unitario: calc.total,
      total: calc.total,
      orden: nextOrden,
    };
    onAddItem(item, desglose);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calculator className="h-5 w-5 text-yellow-400" />
        <h3 className="font-black text-white">Calculadora de Radier</h3>
      </div>

      {/* Modo */}
      <div className="flex gap-3">
        {(['trompo', 'camion'] as const).map(m => (
          <button
            key={m}
            onClick={() => set('modo', m)}
            className={`flex-1 rounded-2xl border px-4 py-2 text-sm font-black capitalize ${r.modo === m ? 'border-yellow-400 bg-yellow-400/10 text-yellow-300' : 'border-white/10 text-zinc-400'}`}
          >
            {m === 'trompo' ? 'Trompo (sacos)' : 'Camión preparado'}
          </button>
        ))}
      </div>

      {/* Dimensiones */}
      <div className="grid gap-4 md:grid-cols-3">
        <Num label="Largo m" value={r.largo} onChange={v => set('largo', v)} />
        <Num label="Ancho m" value={r.ancho} onChange={v => set('ancho', v)} />
        <Num label="Espesor hormigón cm" value={r.espesor_cm} onChange={v => set('espesor_cm', v)} />
        <Num label="Estabilizado cm" value={r.estabilizado_cm} onChange={v => set('estabilizado_cm', v)} />
        <Num label="Gravilla cm" value={r.gravilla_cm} onChange={v => set('gravilla_cm', v)} />
        <Num label="Margen %" value={r.margen_pct} onChange={v => set('margen_pct', v)} />
      </div>

      {/* Precios según modo */}
      {r.modo === 'trompo' ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Num label="Sacos cemento / m³" value={r.sacos_por_m3} onChange={v => set('sacos_por_m3', v)} />
          <Num label="Precio saco $" value={r.precio_saco} onChange={v => set('precio_saco', v)} prefix="$" />
          <Num label="Precio m³ arena $" value={r.precio_arena} onChange={v => set('precio_arena', v)} prefix="$" />
          <Num label="Precio m³ gravilla $" value={r.precio_gravilla} onChange={v => set('precio_gravilla', v)} prefix="$" />
          <Num label="Precio m³ estabilizado $" value={r.precio_estabilizado} onChange={v => set('precio_estabilizado', v)} prefix="$" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Num label="Precio m³ hormigón preparado $" value={r.precio_hormigon_preparado} onChange={v => set('precio_hormigon_preparado', v)} prefix="$" />
          <Num label="Precio m³ estabilizado $" value={r.precio_estabilizado} onChange={v => set('precio_estabilizado', v)} prefix="$" />
        </div>
      )}

      {/* Mano de obra y extras */}
      <div className="grid gap-4 md:grid-cols-3">
        <Num label="Mano de obra $" value={r.mano_obra} onChange={v => set('mano_obra', v)} prefix="$" />
        <Num label="Moldaje $" value={r.moldaje} onChange={v => set('moldaje', v)} prefix="$" />
        <Num label="Malla / fierro $" value={r.malla_fierro} onChange={v => set('malla_fierro', v)} prefix="$" />
        <Num label="Polietileno $" value={r.polietileno} onChange={v => set('polietileno', v)} prefix="$" />
        <Num label="Pintura / sellador $" value={r.pintura_sellador} onChange={v => set('pintura_sellador', v)} prefix="$" />
        <Num label="Extras $" value={r.extras} onChange={v => set('extras', v)} prefix="$" />
      </div>

      {/* Resultados */}
      {calc.area > 0 && (
        <div className="rounded-3xl border border-yellow-400/20 bg-yellow-400/5 p-5 space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-yellow-400">Resumen calculado</p>
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <span className="text-zinc-400">Área: <b className="text-white">{calc.area.toFixed(2)} m²</b></span>
            <span className="text-zinc-400">Hormigón: <b className="text-white">{calc.volHormigon.toFixed(3)} m³</b></span>
            {calc.volEstabilizado > 0 && <span className="text-zinc-400">Estabilizado: <b className="text-white">{calc.volEstabilizado.toFixed(3)} m³</b></span>}
            {calc.volGravilla > 0 && <span className="text-zinc-400">Gravilla adicional: <b className="text-white">{calc.volGravilla.toFixed(3)} m³</b></span>}
            {r.modo === 'trompo' && <>
              <span className="text-zinc-400">Sacos cemento: <b className="text-white">{calc.sacosTotal}</b></span>
              <span className="text-zinc-400">Arena: <b className="text-white">{calc.arenaM3.toFixed(2)} m³ (~{calc.paladasArena} paladas)</b></span>
              {calc.gravillaM3 > 0 && <span className="text-zinc-400">Gravilla: <b className="text-white">{calc.gravillaM3.toFixed(2)} m³ (~{calc.paladasGravilla} paladas)</b></span>}
            </>}
          </div>
          <div className="grid gap-2 text-sm border-t border-yellow-400/10 pt-3 md:grid-cols-3">
            <div><span className="text-zinc-400 block text-xs">Subtotal</span><b className="text-white">{formatBudgetMoney(calc.subtotal)}</b></div>
            <div><span className="text-zinc-400 block text-xs">Margen {r.margen_pct}%</span><b className="text-yellow-300">{formatBudgetMoney(calc.margen)}</b></div>
            <div><span className="text-zinc-400 block text-xs">Total</span><b className="text-2xl text-yellow-300">{formatBudgetMoney(calc.total)}</b></div>
          </div>
          <button
            onClick={handleAdd}
            className="mt-2 flex items-center gap-2 rounded-2xl bg-yellow-400 px-5 py-2.5 text-sm font-black text-black hover:bg-yellow-300"
          >
            <Plus className="h-4 w-4" />
            Agregar al presupuesto
          </button>
        </div>
      )}
    </div>
  );
}
