import Link from 'next/link';
import { AlertTriangle, BookOpen, Check, Layers3, ShieldCheck } from 'lucide-react';
import {
  METALCON_APPLICATIONS,
  METALCON_CAPACITY_NOTE,
  METALCON_SOURCES,
  METALCON_SPACING,
  METALCON_WALL_LAYERS,
} from '@/lib/metalconSpecs';

const PANEL = 'rounded-[1.6rem] border border-white/10 bg-[#0A0F13]';
const TH = 'px-3 py-2.5 text-left text-[9px] font-black uppercase tracking-[.14em] text-[#FFE600]';
const TD = 'px-3 py-3 align-top text-xs leading-5 text-white/60';
const HEAD = 'text-[10px] font-black uppercase tracking-[.24em] text-[#FFE600]';

/**
 * Ficha técnica de referencia del sistema Metalcon.
 * Las familias, perfiles y medidas comerciales viven en la guía (MetalconGuideSections);
 * aquí queda lo que exige lectura técnica: aplicaciones, capacidad, armado y fuentes.
 * Todo el contenido sale de `@/lib/metalconSpecs`, que cita al fabricante.
 */
export default function MetalconSpecSheet() {
  return (
    <section className="mx-auto max-w-[1500px] space-y-4 px-3 py-14 sm:px-6">
      {/* 01 — Aplicaciones */}
      <article className={`${PANEL} p-5 sm:p-8`}>
        <h2 className="text-2xl font-black tracking-[-.03em] sm:text-3xl">01 · Qué se construye con Metalcon y qué no</h2>
        <p className="mt-3 max-w-3xl text-xs leading-6 text-white/45 sm:text-sm">
          Metalcon es acero galvanizado de espesor delgado (cold formed). Eso define su terreno: vivienda, tabiquería, cielos y ampliaciones livianas. Una nave industrial no pertenece a este sistema.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <caption className="sr-only">Aplicaciones del sistema Metalcon por escala</caption>
            <thead><tr className="border-b border-white/10"><th className={TH}>Aplicación</th><th className={TH}>Perfil orientativo</th><th className={TH}>Espesor</th><th className={TH}>Largos</th><th className={TH}>Condición</th></tr></thead>
            <tbody className="divide-y divide-white/6">
              {METALCON_APPLICATIONS.map((item) => (
                <tr key={item.id} className={item.id === 'industrial' ? 'bg-white/[.02]' : undefined}>
                  <td className={TD}>
                    <b className="block text-xs font-black text-white/85">{item.scope}</b>
                    <span className="mt-1 block text-[10px] leading-4 text-white/40">{item.note}</span>
                  </td>
                  <td className={`${TD} ${item.id === 'industrial' ? 'text-white/35' : 'text-white/70'}`}>{item.profile}</td>
                  <td className={`${TD} tabular-nums`}>{item.thickness}</td>
                  <td className={`${TD} tabular-nums`}>{item.lengths}</td>
                  <td className={TD}>
                    <span className={`inline-block rounded-full px-2.5 py-1 text-[9px] font-black ${item.id === 'industrial' ? 'bg-white/8 text-white/45' : 'bg-[#FFE600]/12 text-[#FFE600]'}`}>{item.condition}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 flex gap-2 rounded-xl border border-white/10 bg-white/[.03] p-3 text-[10px] leading-5 text-white/50">
          <AlertTriangle size={13} className="mt-0.5 shrink-0 text-[#FFE600]" aria-hidden />
          El fabricante declara viviendas de hasta tres niveles, y ese ya es el techo residencial del sistema. Comercio de baja altura se resuelve con revisión profesional; industrial exige acero laminado estructural.
        </p>
      </article>

      {/* 02 — Capacidad */}
      <article className={`${PANEL} p-5 sm:p-8`}>
        <h2 className="text-2xl font-black tracking-[-.03em] sm:text-3xl">02 · {METALCON_CAPACITY_NOTE.title}</h2>
        <p className="mt-3 max-w-4xl text-xs leading-6 text-white/50 sm:text-sm">{METALCON_CAPACITY_NOTE.body}</p>
        <ul className="mt-5 grid gap-2 lg:grid-cols-2">
          {METALCON_CAPACITY_NOTE.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-2 rounded-xl border border-white/8 bg-white/[.025] px-3 py-2.5 text-[11px] leading-5 text-white/55">
              <ShieldCheck size={13} className="mt-0.5 shrink-0 text-[#FFE600]" aria-hidden />{bullet}
            </li>
          ))}
        </ul>
        <Link href={METALCON_CAPACITY_NOTE.link.href} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#FFE600] px-5 text-[11px] font-black text-black transition hover:bg-white">
          <BookOpen size={14} aria-hidden />{METALCON_CAPACITY_NOTE.link.label}
        </Link>
      </article>

      {/* 03 — Modulación + capas */}
      <article className={`${PANEL} p-5 sm:p-8`}>
        <h2 className="text-2xl font-black tracking-[-.03em] sm:text-3xl">03 · Modulación y orden de armado</h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,.78fr)_minmax(0,1.22fr)]">
          <div className="space-y-3">
            <p className={HEAD}>Separación entre montantes</p>
            {METALCON_SPACING.map((item) => (
              <div key={item.value} className="rounded-2xl border border-white/8 bg-white/[.025] p-4">
                <b className="block text-lg font-black text-[#FFE600]">{item.value}</b>
                <small className="mt-0.5 block text-[10px] font-black uppercase tracking-[.12em] text-white/45">{item.use}</small>
                <p className="mt-2 text-[11px] leading-5 text-white/50">{item.detail}</p>
              </div>
            ))}
            <p className="rounded-2xl border border-white/8 bg-white/[.025] p-4 text-[11px] leading-5 text-white/45">
              Los 40 cm son la separación reforzada: al repartir los montantes más cerca, el revestimiento apoya sobre más puntos y el panel queda más rígido. Los 60 cm usan menos perfil y dependen de que el cálculo lo admita.
            </p>
          </div>
          <div>
            <p className={HEAD}>Cómo se arma el muro, capa por capa</p>
            <ol className="mt-3 space-y-2">
              {METALCON_WALL_LAYERS.map((layer, index) => (
                <li key={layer.id} className="flex gap-3 rounded-2xl border border-white/8 bg-white/[.025] p-3.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#FFE600] text-[11px] font-black text-black tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <b className="block text-xs font-black text-white/85">{layer.label}</b>
                    <small className="text-[10px] font-bold text-[#FFE600]/70">{layer.layer}</small>
                    <p className="mt-1 text-[11px] leading-5 text-white/50">{layer.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-3 flex gap-2 text-[10px] leading-5 text-white/40">
              <Layers3 size={13} className="mt-0.5 shrink-0 text-[#FFE600]" aria-hidden />
              Puedes reproducir este orden en el visor: el botón <b className="text-white/60">4D montaje</b> arma la estructura y el modo <b className="text-white/60">Capas</b> cierra el muro de afuera hacia adentro.
            </p>
          </div>
        </div>
      </article>

      {/* 04 — Fuentes */}
      <article className={`${PANEL} p-5 sm:p-8`}>
        <h2 className="text-2xl font-black tracking-[-.03em] sm:text-3xl">04 · Fuentes</h2>
        <ul className="mt-5 grid gap-2 lg:grid-cols-2">
          {METALCON_SOURCES.map((source) => (
            <li key={source.href}>
              <a href={source.href} target="_blank" rel="noopener noreferrer" className="block rounded-2xl border border-white/8 bg-white/[.025] p-4 transition hover:border-[#FFE600]/35">
                <b className="block text-xs font-black text-white/85">{source.label}</b>
                <p className="mt-1.5 text-[11px] leading-5 text-white/45">{source.note}</p>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-5 flex gap-2 text-[10px] leading-5 text-white/35">
          <Check size={13} className="mt-0.5 shrink-0 text-[#FFE600]" aria-hidden />
          Esta ficha resume documentación pública del fabricante con fines educativos. No reemplaza el manual vigente, la normativa aplicable ni la memoria de cálculo de tu proyecto.
        </p>
      </article>
    </section>
  );
}
