import { FabrickFullLogo } from '@/components/FabrickBrandIcon';

export default function AdminLoading() {
  return (
    <main className="fixed inset-0 z-[9999] grid place-items-center overflow-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(255, 176, 0,.35),transparent_28rem),linear-gradient(145deg,#fff9ec,#dfcfad)] p-4 text-[#111214]">
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-yellow-300/25 blur-3xl" />
      <div className="relative w-[min(94vw,520px)] overflow-hidden rounded-[2.3rem] bg-[#F2DFBB]/92 p-6 shadow-[0_35px_110px_rgba(58,45,19,.20)] backdrop-blur-2xl sm:p-8">
        <div className="rounded-[1.6rem] bg-[#111214] px-5 py-4"><FabrickFullLogo className="mx-auto" priority theme="light" /></div>
        <p className="mt-6 text-[10px] font-black uppercase tracking-[.24em] text-[#C97700]">Preparando centro de control</p>
        <h1 className="mt-2 text-3xl font-black leading-none tracking-[-.05em]">Tus datos están cargando.</h1>
        <p className="mt-3 text-sm leading-6 text-black/48">Conectando ventas, visitas, pagos y operación.</p>
        <div className="mt-6 grid grid-cols-3 gap-2">{['Ventas', 'Visitas', 'Pagos'].map((label, index) => <div key={label} className="rounded-2xl bg-black/[0.055] p-3"><span className="block h-2 animate-pulse rounded-full bg-black/10" style={{ animationDelay: `${index * 140}ms` }} /><b className="mt-3 block text-[9px] uppercase tracking-widest text-black/45">{label}</b></div>)}</div>
        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-black/[0.07]"><div className="h-full w-2/3 animate-[pulse_1.1s_ease-in-out_infinite] rounded-full bg-yellow-400" /></div>
      </div>
    </main>
  );
}
