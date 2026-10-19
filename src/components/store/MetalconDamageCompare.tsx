'use client';
/*
 * MetalconDamageCompare — HUD de videojuego: comparación de daño y desempeño
 * entre sistemas constructivos (referencia educativa, no cálculo real).
 */
type Row = {
  label: string;
  metal: number;
  wood: number;
  concrete: number;
  /** 'low' = menos es mejor (daño), 'high' = más es mejor */
  good: 'high' | 'low';
};

const ROWS: Row[] = [
  { label: 'Daño en sismo severo', metal: 22, wood: 38, concrete: 58, good: 'low' },
  { label: 'Reparabilidad', metal: 88, wood: 72, concrete: 42, good: 'high' },
  { label: 'Velocidad de construcción', metal: 90, wood: 70, concrete: 34, good: 'high' },
  { label: 'Desempeño a humedad y plaga', metal: 78, wood: 30, concrete: 92, good: 'high' },
  { label: 'Pesa menos · estructura liviana', metal: 74, wood: 72, concrete: 18, good: 'high' },
  { label: 'Mantenimiento en el tiempo', metal: 68, wood: 30, concrete: 76, good: 'high' },
];

const SYSTEMS: { abbr: string; name: string; color: string; chip: string; chipColor: string }[] = [
  { abbr: 'Met', name: 'Metalcon · Steel Framing', color: '#F6C64A', chip: 'RECOMENDADO', chipColor: '#F6C64A' },
  { abbr: 'Mad', name: 'Madera', color: '#4ECDC4', chip: 'CLÁSICO', chipColor: '#4ECDC4' },
  { abbr: 'Con', name: 'Hormigón', color: '#FF7A5A', chip: 'RÍGIDO', chipColor: '#FF7A5A' },
];

function barColor(value: number, good: 'high' | 'low'): string {
  const v = good === 'high' ? value : 100 - value;
  return v >= 70 ? '#57C97B' : v >= 45 ? '#F6C64A' : '#FF7A5A';
}

export default function MetalconDamageCompare() {
  return (
    <div className="space-y-3">
      {/* Leyenda de sistemas estilo "equipo" */}
      <div className="grid grid-cols-3 gap-2">
        {SYSTEMS.map(s => (
          <div key={s.abbr} className="rounded-xl border border-white/10 bg-white/[.03] p-2">
            <span className="text-[7px] font-black uppercase tracking-[.22em]" style={{ color: s.color }}>
              {s.abbr}
            </span>
            <p className="mt-1 text-[8px] font-bold leading-3 text-white/60">{s.name}</p>
            <span
              className="mt-1.5 inline-block rounded-full px-1.5 py-0.5 text-[6px] font-black tracking-[.14em]"
              style={{ background: `${s.chipColor}22`, color: s.chipColor }}
            >
              {s.chip}
            </span>
          </div>
        ))}
      </div>

      {/* Filas de "stats" del partido */}
      {ROWS.map(row => (
        <div key={row.label} className="rounded-2xl border border-white/10 bg-white/[.025] p-3">
          <div className="mb-2 flex items-center justify-between">
            <b className="text-[9px] font-black uppercase tracking-[.16em] text-white/78">{row.label}</b>
            <span className="text-[6px] font-black text-white/30">{row.good === 'low' ? 'MENOS ES MEJOR' : 'MÁS ES MEJOR'}</span>
          </div>
          <div className="space-y-1.5">
            {SYSTEMS.map((sys, idx) => {
              const value = [row.metal, row.wood, row.concrete][idx];
              return (
                <div key={sys.abbr} className="flex items-center gap-2">
                  <span className="w-7 text-[7px] font-black" style={{ color: sys.color }}>{sys.abbr}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[.07]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${value}%`, background: barColor(value, row.good) }}
                    />
                  </div>
                  <b className="w-9 text-right text-[8px] font-black" style={{ color: barColor(value, row.good) }}>
                    {value}
                  </b>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <p className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-[8px] leading-4 text-white/40">
        Estimación educativa con sismo severo de referencia para demostración visual de ventajas
        de ductilidad y reparabilidad del steel framing. El diseño real exige cálculo según Norma
        Chilena y memoria de cálculo firmada.
      </p>
    </div>
  );
}
