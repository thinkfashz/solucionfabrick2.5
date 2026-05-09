'use client';

import { motion } from 'framer-motion';
import { Clock, MessageCircle, ShieldCheck } from 'lucide-react';
import type { PresupuestoRow, PresupuestoItem } from '@/lib/presupuestos';

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n);

const fadeUp = {
  hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { delay: i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

export default function PresupuestoVigenteView({
  presupuesto,
  expiraLabel,
  whatsappLink,
}: {
  presupuesto: PresupuestoRow;
  expiraLabel: string;
  whatsappLink: string;
}) {
  const items: PresupuestoItem[] = Array.isArray(presupuesto.items) ? presupuesto.items : [];

  return (
    <main className="min-h-screen bg-[#070707] text-white" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <div className="mx-auto max-w-3xl px-5 py-12 md:py-20">
        <motion.header
          initial="hidden"
          animate="show"
          custom={0}
          variants={fadeUp}
          className="mb-8 flex items-center justify-between"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-amber-400">
            Soluciones Fabrick
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
            <ShieldCheck className="h-3 w-3" /> Presupuesto vigente
          </span>
        </motion.header>

        <motion.h1
          initial="hidden"
          animate="show"
          custom={1}
          variants={fadeUp}
          className="text-4xl font-black leading-tight tracking-tight md:text-5xl"
        >
          Hola{' '}
          <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
            {presupuesto.customer_name}
          </span>
          , aquí está tu presupuesto.
        </motion.h1>

        <motion.p
          initial="hidden"
          animate="show"
          custom={2}
          variants={fadeUp}
          className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-400"
        >
          Preparamos un detalle de materiales y servicios para tu proyecto. Revísalo con calma; el acceso es
          único y se autodestruye en la fecha indicada abajo.
        </motion.p>

        <motion.section
          initial="hidden"
          animate="show"
          custom={3}
          variants={fadeUp}
          className="mt-10 overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950/80 p-6 backdrop-blur"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">Total estimado</p>
          <p className="mt-1 text-5xl font-black tracking-tight text-amber-400">
            {formatCLP(Number(presupuesto.total) || 0)}
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/5 px-3 py-1 text-[11px] font-semibold text-amber-200">
            <Clock className="h-3.5 w-3.5" />
            Válido hasta {expiraLabel}
          </div>

          {items.length > 0 ? (
            <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-800">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-black/60 text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                    <th className="px-3 py-2 text-left font-semibold">Detalle</th>
                    <th className="px-3 py-2 text-right font-semibold">Cant.</th>
                    <th className="px-3 py-2 text-right font-semibold">P. unit.</th>
                    <th className="px-3 py-2 text-right font-semibold">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} className="border-t border-neutral-800/60 text-neutral-200">
                      <td className="px-3 py-2.5">{it.descripcion}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{it.cantidad}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-neutral-400">
                        {formatCLP(Number(it.precio_unitario) || 0)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-amber-200">
                        {formatCLP(Number(it.subtotal ?? (it.cantidad * it.precio_unitario)) || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {presupuesto.notas ? (
            <p className="mt-6 rounded-2xl border border-neutral-800 bg-black/40 p-4 text-sm leading-relaxed text-neutral-300">
              {presupuesto.notas}
            </p>
          ) : null}
        </motion.section>

        <motion.section
          initial="hidden"
          animate="show"
          custom={4}
          variants={fadeUp}
          className="mt-8 grid gap-3 md:grid-cols-2"
        >
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-4 text-sm font-bold text-emerald-200 transition hover:bg-emerald-500/20"
          >
            <MessageCircle className="h-4 w-4" />
            Hablar por WhatsApp
          </a>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (typeof window !== 'undefined') window.print();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-4 text-sm font-bold text-neutral-200 transition hover:border-amber-400/40 hover:text-amber-200"
          >
            Imprimir / Guardar PDF
          </a>
        </motion.section>

        <motion.footer
          initial="hidden"
          animate="show"
          custom={5}
          variants={fadeUp}
          className="mt-16 border-t border-neutral-800 pt-6 text-center text-[11px] uppercase tracking-[0.18em] text-neutral-600"
        >
          © {new Date().getFullYear()} Soluciones Fabrick · Construcción y remodelaciones
        </motion.footer>
      </div>
    </main>
  );
}
