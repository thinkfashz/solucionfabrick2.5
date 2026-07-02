'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { ArrowRight, Calculator, Hammer, Home, PaintBucket, ShieldCheck, Wrench, Zap } from 'lucide-react';
import { DEFAULT_SERVICE_PRICES, unitLabel } from '@/lib/servicePricing';

const ICONS: Record<string, typeof Hammer> = {
  metalcon: Home,
  cimientos: Hammer,
  revestimiento: Wrench,
  pintura: PaintBucket,
  gasfiteria: Wrench,
  electricidad: Zap,
  ampliaciones: Home,
  seguridad: ShieldCheck,
};

const FEATURED = DEFAULT_SERVICE_PRICES.filter((item) =>
  ['metalcon', 'cimientos', 'gasfiteria', 'electricidad', 'pintura', 'revestimiento', 'ampliaciones', 'seguridad'].includes(item.slug),
);

const fmt = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

export function ServiciosPageContent() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <section className="px-4 pb-16 pt-32 md:px-12 md:pb-24 md:pt-40">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-yellow-300">Servicios y calculadoras</p>
            <h1 className="mt-5 text-4xl font-black leading-[0.98] tracking-tight text-white md:text-6xl">
              Calcula una referencia antes de pedir cotización
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-zinc-400">
              Elige un servicio, ingresa metros cuadrados, metros lineales, metros cúbicos o cantidad de puntos y obtén un rango aproximado. No es precio final: sirve para conversar con más claridad.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="#servicios" className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-yellow-300 px-6 py-4 text-xs font-black uppercase tracking-[0.22em] text-black transition hover:bg-white">
                Ver servicios <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/contacto" className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-4 text-xs font-black uppercase tracking-[0.22em] text-white transition hover:border-yellow-300/40 hover:text-yellow-300">
                Solicitar orientación
              </Link>
            </div>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <InfoCard title="Mide" text="Define largo, ancho, alto o metros lineales según el servicio." />
            <InfoCard title="Calcula" text="Ves subtotal, IVA, rango mercado y balance por materiales/mano de obra." />
            <InfoCard title="Confirma" text="El precio real se valida con fotos, visita técnica o revisión de alcance." />
          </div>
        </div>
      </section>

      <section id="servicios" className="border-t border-white/5 px-4 py-16 md:px-12 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.32em] text-yellow-300">Elige una calculadora</p>
              <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">Servicios organizados por unidad de medida</h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-zinc-400">
              Los precios base son editables desde el admin. La intención es orientar, no confundir con un valor cerrado.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURED.map((service) => {
              const Icon = ICONS[service.slug] ?? Calculator;
              return (
                <Link
                  key={service.slug}
                  href={`/servicios/${service.slug}`}
                  className="group rounded-[1.7rem] border border-white/10 bg-zinc-950/80 p-5 transition hover:-translate-y-1 hover:border-yellow-300/40 hover:bg-zinc-900"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-yellow-300 text-black">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-black text-white">{service.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    Calculadora por {unitLabel(service.unit)} con rango referencial y desglose visual.
                  </p>
                  <div className="mt-5 rounded-2xl border border-white/8 bg-black/45 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Base editable</p>
                    <p className="mt-1 text-xl font-black text-yellow-300">{fmt.format(service.basePrice)}</p>
                    <p className="mt-1 text-xs text-zinc-500">por {unitLabel(service.unit)}</p>
                  </div>
                  <span className="mt-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">
                    Abrir calculadora <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-zinc-950/80 p-5">
      <p className="text-xl font-black text-yellow-300">{title}</p>
      <p className="mt-2 text-sm leading-7 text-zinc-400">{text}</p>
    </div>
  );
}
