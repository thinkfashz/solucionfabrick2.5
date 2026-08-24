import { FabrickFullLogo } from '@/components/FabrickBrandIcon';

export function AdminAccessLoader({
  title = 'Preparando panel',
  description = 'Cargando el centro de control de forma segura.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <main className="fixed inset-0 z-[9999] grid place-items-center overflow-hidden bg-[#08090A] px-5 py-10 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-12rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
        <FabrickFullLogo priority tagline="Panel administrativo" theme="light" />

        <div className="mt-9 flex items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.035] px-4 py-2.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" aria-hidden="true" />
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-200/80">Conexión segura</span>
        </div>

        <h1 className="mt-5 text-2xl font-black tracking-[-0.04em] text-white">{title}</h1>
        <p className="mt-2 max-w-xs text-sm leading-6 text-white/45">{description}</p>

        <div className="mt-7 h-1 w-28 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden="true">
          <div className="h-full w-1/2 animate-[pulse_1s_ease-in-out_infinite] rounded-full bg-amber-300" />
        </div>
      </div>
    </main>
  );
}

export default AdminAccessLoader;
