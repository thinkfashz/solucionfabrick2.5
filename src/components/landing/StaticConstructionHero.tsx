import Link from 'next/link';
import { Calculator, FileText, HardHat, PenTool, ShieldCheck } from 'lucide-react';

type Props = {
  coverUrl?: string;
};

const fallbackCover = 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1800&q=85';

export default function StaticConstructionHero({ coverUrl }: Props) {
  const image = coverUrl || fallbackCover;
  return <section className="relative overflow-hidden bg-[#050505] px-3 pb-14 pt-5 text-white sm:px-6 lg:px-8">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(250,204,21,.16),transparent_28rem),radial-gradient(circle_at_80%_40%,rgba(255,255,255,.08),transparent_26rem),linear-gradient(180deg,#050505,#090806_56%,#030303)]" />
    <div className="relative mx-auto w-full max-w-[1500px]">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 shadow-[0_35px_120px_rgba(0,0,0,.58)] backdrop-blur-xl sm:rounded-[2.6rem]">
        <div className="absolute inset-0">
          <img src={image} alt="Construcción profesional Soluciones Fabrick" className="h-full w-full object-cover opacity-58 saturate-110" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.92),rgba(0,0,0,.68)_42%,rgba(0,0,0,.18)),linear-gradient(180deg,rgba(0,0,0,.2),rgba(0,0,0,.88))]" />
        </div>

        <div className="relative grid min-h-[680px] gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:p-12 xl:min-h-[720px]">
          <div className="flex min-w-0 flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-yellow-300/25 bg-black/55 px-4 py-2 text-[10px] font-black uppercase tracking-[0.26em] text-yellow-200 backdrop-blur-xl">
              Soluciones integrales para tu proyecto
            </div>
            <h1 className="mt-8 max-w-4xl text-5xl font-black leading-[.92] tracking-[-0.075em] text-white sm:text-7xl lg:text-8xl">
              Construimos <span className="text-yellow-300">confianza</span> en cada obra
            </h1>
            <div className="mt-7 h-1.5 w-16 rounded-full bg-yellow-300" />
            <p className="mt-7 max-w-2xl text-base leading-8 text-zinc-200 sm:text-xl">
              Diseño, cálculo, presupuesto digital y ejecución profesional con presentación clara para cada cliente. Tu obra en buenas manos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/presupuestos" className="inline-flex h-14 items-center gap-2 rounded-2xl bg-yellow-300 px-6 text-sm font-black text-black shadow-[0_18px_45px_rgba(250,204,21,.25)] transition hover:-translate-y-0.5 hover:bg-yellow-200">
                <FileText className="h-4 w-4" /> Ver propuestas
              </Link>
              <Link href="/contacto" className="inline-flex h-14 items-center gap-2 rounded-2xl border border-white/20 bg-black/45 px-6 text-sm font-black text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/10">
                <Calculator className="h-4 w-4" /> Cotizar mi obra
              </Link>
            </div>
          </div>

          <aside className="flex min-w-0 items-end lg:items-center">
            <div className="w-full rounded-[2rem] border border-white/15 bg-black/58 p-5 shadow-[0_28px_90px_rgba(0,0,0,.42)] backdrop-blur-2xl">
              <div className="grid gap-4">
                <Feature icon={ShieldCheck} title="Confianza real" text="Transparencia en cada etapa del proyecto." />
                <Feature icon={PenTool} title="Diseño y cálculo" text="Soluciones técnicas precisas y seguras." />
                <Feature icon={HardHat} title="Ejecución profesional" text="Obras entregadas con calidad y compromiso." />
              </div>
            </div>
          </aside>
        </div>
      </div>

      <section className="mx-auto mt-12 max-w-5xl text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-yellow-300">¿Por qué elegirnos?</p>
        <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">Más que construir, creamos valor</h2>
        <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-zinc-400">Acompañamos tu proyecto desde la idea hasta la entrega final, con soluciones integrales y un equipo comprometido.</p>
        <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat value="+150" label="Proyectos completados" />
          <MiniStat value="+100" label="Clientes satisfechos" />
          <MiniStat value="+8" label="Años de experiencia" />
          <MiniStat value="100%" label="Compromiso y calidad" />
        </div>
      </section>
    </div>
  </section>;
}

function Feature({ icon: Icon, title, text }: { icon: typeof ShieldCheck; title: string; text: string }) {
  return <div className="flex items-start gap-4 rounded-[1.45rem] border border-white/10 bg-white/[0.045] p-4">
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-yellow-300/25 bg-yellow-300/10 text-yellow-300"><Icon className="h-5 w-5" /></span>
    <span><b className="block text-white">{title}</b><span className="mt-1 block text-sm leading-6 text-zinc-400">{text}</span></span>
  </div>;
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl sm:p-6"><b className="block text-3xl font-black text-yellow-300">{value}</b><span className="mt-2 block text-sm leading-5 text-zinc-400">{label}</span></div>;
}
