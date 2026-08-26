import { Braces, ShieldCheck } from 'lucide-react';

export default function SeismicStructureShowcase() {
  return (
    <section className="relative overflow-hidden bg-[#08090A] px-3 pt-10 text-[#FFF9EE] sm:px-6 md:px-12 lg:pt-14" aria-label="Estructura Metalcon sismorresistente">
      <div className="mx-auto grid max-w-[1280px] overflow-hidden rounded-[2.2rem] border border-[#FFB000]/20 bg-[#0D0E10] shadow-[0_30px_100px_rgba(0,0,0,.35)] lg:grid-cols-[.62fr_1.38fr] lg:items-center">
        <div className="p-5 sm:p-7 lg:p-8">
          <p className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[.22em] text-[#FFB000]"><Braces className="h-4 w-4" /> Estructura visible</p>
          <h3 className="mt-3 text-3xl font-black leading-[.98] tracking-[-.05em]">La seguridad empieza antes de cerrar los muros.</h3>
          <p className="mt-4 text-sm leading-6 text-white/62">Perfiles, encuentros, arriostramientos y apoyos deben trabajar como un sistema coordinado. Esta vista permite entender lo que normalmente queda oculto.</p>
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#FFB000]/18 bg-[#FFB000]/8 p-3.5"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#FFB000]" /><p className="text-xs leading-5 text-white/72">La imagen es referencial; cada vivienda se confirma con proyecto, cálculo y condiciones reales del terreno.</p></div>
        </div>
        <div className="relative flex min-h-[300px] items-center justify-center overflow-hidden bg-black sm:min-h-[420px] lg:min-h-[500px]">
          <img src="/images/landing/fabrick-seismic-structure.webp" alt="Estructura de vivienda en perfiles de acero galvanizado tipo Metalcon" loading="lazy" decoding="async" className="max-h-[520px] w-full object-contain p-2 sm:p-4" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_45%,rgba(255,176,0,.06),transparent_42%)]" />
        </div>
      </div>
    </section>
  );
}
