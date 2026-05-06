'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, MessageCircle, RefreshCw } from 'lucide-react';

export default function PresupuestoExpiradoView({
  customerName,
  whatsappLink,
}: {
  customerName: string;
  whatsappLink: string;
}) {
  return (
    <main
      className="min-h-screen bg-[#070707] text-white"
      style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
    >
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-5 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950/90 p-8 backdrop-blur md:p-12"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(245,158,11,0.18),transparent_60%)]"
          />

          <div className="relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/40 bg-amber-400/10"
            >
              <AlertTriangle className="h-8 w-8 text-amber-400" strokeWidth={1.5} />
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="mt-6 text-[11px] font-bold uppercase tracking-[0.32em] text-amber-400"
            >
              Acceso denegado
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-3 text-3xl font-black tracking-tight md:text-4xl"
            >
              Presupuesto expirado
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-neutral-400"
            >
              {customerName ? `Hola ${customerName}, ` : ''}por la rotación de precios de materiales de
              construcción, este presupuesto solo es válido durante <strong className="text-white">5 días</strong>.
              El plazo ya se cumplió, así que el enlace dejó de estar disponible.
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-neutral-500"
            >
              No te preocupes: podemos generarte un presupuesto actualizado en minutos con los precios vigentes
              de materiales y mano de obra.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-bold uppercase tracking-[0.14em] text-neutral-950 transition hover:bg-amber-300"
              >
                <MessageCircle className="h-4 w-4" />
                Solicitar renovación
              </a>
              <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                <RefreshCw className="h-3 w-3" />
                Te enviamos un nuevo link en el día
              </span>
            </motion.div>
          </div>
        </motion.div>

        <p className="mt-10 text-[11px] uppercase tracking-[0.22em] text-neutral-600">
          Soluciones Fabrick · Construcción y remodelaciones
        </p>
      </div>
    </main>
  );
}
