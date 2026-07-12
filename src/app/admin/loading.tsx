import { FabrickFullLogo } from '@/components/FabrickBrandIcon';

export default function AdminLoading() {
  return (
    <main className="fixed inset-0 z-[9999] grid place-items-center bg-[#050505] text-white">
      <div className="w-[min(92vw,420px)] rounded-[2rem] border border-yellow-300/15 bg-black/70 p-8 text-center shadow-[0_30px_90px_rgba(0,0,0,.55)] backdrop-blur-xl">
        <FabrickFullLogo className="mx-auto" priority theme="light" />
        <h1 className="mt-3 text-2xl font-black tracking-tight">Cargando admin</h1>
        <div className="mx-auto mt-5 h-1.5 w-44 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-full origin-left animate-pulse rounded-full bg-yellow-300" />
        </div>
      </div>
    </main>
  );
}
