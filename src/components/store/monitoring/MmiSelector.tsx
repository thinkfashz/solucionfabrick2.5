'use client';
import { MMI_COLORS, MMI_LEVELS } from './mmiScale';

type Props = { value: number; onChange: (mmi: number) => void; expertMode: boolean; setExpertMode: (v: boolean) => void };

export default function MmiSelector({ value, onChange, expertMode, setExpertMode }: Props) {
  return (
    <div data-testid="mmi-selector">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[8px] uppercase text-white/38">Nivel de sismo (MMI)</span>
        <button
          onClick={() => setExpertMode(!expertMode)}
          className={`rounded-full px-2 py-1 text-[7px] font-black transition-colors ${expertMode ? 'bg-[#FFE600] text-black' : 'bg-white/10 text-white/55 hover:bg-white/15'}`}
        >
          {expertMode ? 'Experto ON' : 'Modo experto'}
        </button>
      </div>
      <div className="mt-1.5 grid grid-cols-6 gap-1">
        {MMI_LEVELS.map((l) => {
          const active = l.mmi === value;
          return (
            <button
              key={l.mmi}
              onClick={() => { setExpertMode(false); onChange(l.mmi); }}
              title={l.label}
              className={`rounded-lg py-1.5 text-[8px] font-black transition-colors ${active ? 'text-black' : 'bg-white/[.06] text-white/55 hover:bg-white/10'}`}
              style={active ? { background: MMI_COLORS[l.mmi - 1] } : undefined}
            >
              {l.roman}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-[8px] text-white/45">
        <b className="text-[#FFE600]">{MMI_LEVELS[value - 1]?.label ?? MMI_LEVELS[6].label}</b>
        {' · '}{expertMode ? 'ajuste manual libre' : 'parámetros derivados automáticamente'}
      </p>
    </div>
  );
}
