'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const PATH_LABELS: Record<string, string> = {
  '/admin': 'centro-de-control',
  '/admin/presupuestos': 'presupuestos',
  '/admin/productos': 'productos',
  '/admin/correo': 'correo-resend',
  '/admin/agente': 'agente-playwright',
  '/admin/ai-developer': 'fabrick-ai-dev',
  '/admin/scrapegraph': 'scrapegraph-ia',
  '/admin/integraciones': 'integraciones',
  '/admin/ia-config': 'ia-config',
  '/admin/video-engine': 'video-engine',
  '/admin/clientes': 'clientes',
  '/admin/pagos': 'pagos',
  '/admin/inventario': 'inventario',
};

function getRouteLabel(path: string): string {
  if (PATH_LABELS[path]) return PATH_LABELS[path];
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? 'admin';
}

function buildCodeLines(label: string): string[] {
  return [
    `$ fabrick route:load ${label}`,
    `  ↳ validating session tokens…`,
    `  ↳ resolving permissions…`,
    `  ↳ syncing module state [${label}]`,
    `  ↳ hydrating components…`,
    `  ✓ ready`,
  ];
}

export function AdminRouteTransition() {
  const pathname = usePathname();
  const prevRef = useRef(pathname);
  const [visible, setVisible] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [label, setLabel] = useState('');
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (prevRef.current === pathname) return;
    prevRef.current = pathname;

    // Clear any previous timers
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    const routeLabel = getRouteLabel(pathname ?? '/admin');
    const codeLines = buildCodeLines(routeLabel);
    setLabel(routeLabel);
    setLines([]);
    setVisible(true);

    // Stagger code line reveals
    codeLines.forEach((line, i) => {
      const t = setTimeout(() => {
        setLines((prev) => [...prev, line]);
      }, i * 48);
      timersRef.current.push(t);
    });

    // Dismiss slightly after last line
    const dismiss = setTimeout(() => setVisible(false), codeLines.length * 48 + 160);
    timersRef.current.push(dismiss);

    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, [pathname]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="route-transition"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          data-route-transition=""
          className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/88 backdrop-blur-sm"
        >
          {/* Terminal window */}
          <motion.div
            initial={{ y: 12, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-[0_32px_80px_rgba(0,0,0,0.9)]"
          >
            {/* macOS-style title bar */}
            <div className="flex items-center gap-2 border-b border-white/8 bg-zinc-900/80 px-4 py-2.5">
              <span className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
              </span>
              <span className="mx-auto font-mono text-[10px] tracking-wider text-zinc-500">
                fabrick-admin — {label}
              </span>
            </div>

            {/* Code output area */}
            <div className="min-h-[110px] space-y-1 px-4 py-3 font-mono text-[11px]">
              <AnimatePresence>
                {lines.map((line, i) => {
                  const isCmd   = line.startsWith('$');
                  const isOk    = line.includes('✓');
                  const isArrow = line.includes('↳');
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.14, ease: 'easeOut' }}
                      className={`flex items-start gap-1 leading-relaxed ${
                        isCmd   ? 'text-amber-400'   :
                        isOk    ? 'text-emerald-400' :
                        isArrow ? 'text-zinc-500'    :
                                  'text-zinc-600'
                      }`}
                    >
                      {line}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Blinking cursor */}
              {visible && (
                <span className="inline-block h-[13px] w-[7px] animate-pulse rounded-[1px] bg-amber-400/70" />
              )}
            </div>

            {/* Bottom progress strip */}
            <div className="h-0.5 w-full bg-zinc-900">
              <motion.div
                className="h-full rounded-full bg-amber-400"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: (lines.length * 48 + 100) / 1000, ease: 'linear' }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
