import Image from 'next/image';
import { Grid3X3, Ruler, Sparkles } from 'lucide-react';

export default function CalculatorPlanShowcase() {
  return (
    <div className="relative overflow-hidden bg-[#FFF9EE] px-4 pt-12 text-[#08090A] sm:px-6 lg:px-8 lg:pt-16">
      <div className="mx-auto grid max-w-[1260px] overflow-hidden rounded-[2rem] bg-[#111214] text-[#FFF9EE] shadow-[0_28px_90px_rgba(70,48,22,.16)] lg:grid-cols-[.72fr_1.28fr] lg:items-stretch">
        <div className="flex flex-col justify-center p-5 sm:p-7 lg:p-9">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-[#FFB000]/20 bg-[#FFB000]/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.2em] text-[#FFB000]">
            <Grid3X3 className="h-3.5 w-3.5" /> Plano de referencia
          </p>
          <h3 className="mt-4 text-3xl font-black leading-[.98] tracking-[-.05em] sm:text-4xl">Visualiza la distribución antes de medir.</h3>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/65">El plano te ayuda a separar recintos, superficies y partidas antes de ingresar las medidas reales en el estimador.</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <span className="flex items-center gap-2 rounded-xl bg-white/[.055] p-3 text-xs text-white/75"><Ruler className="h-4 w-4 text-[#FFB000]" /> Medidas por recinto</span>
            <span className="flex items-center gap-2 rounded-xl bg-white/[.055] p-3 text-xs text-white/75"><Sparkles className="h-4 w-4 text-[#F5871F]" /> Presupuesto más ordenado</span>
          </div>
        </div>
        <div className="relative min-h-[320px] bg-black sm:min-h-[440px] lg:min-h-[500px]">
          <Image
            src="/images/landing/fabrick-house-plan.webp"
            alt="Plano tridimensional de vivienda utilizado como referencia para el estimador de obra"
            fill
            className="object-contain p-2 sm:p-4"
            sizes="(max-width: 1024px) 100vw, 65vw"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(17,18,20,.12),transparent_22%),linear-gradient(180deg,transparent_72%,rgba(0,0,0,.22))]" />
        </div>
      </div>
    </div>
  );
}
