import Link from 'next/link';
import FabrickLogo from '@/components/FabrickLogo';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white">
      <header className="border-b border-white/5 bg-black/80 backdrop-blur-xl px-4 py-3 md:px-10 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <FabrickLogo />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400/70 hidden sm:block">
            Panel Admin
          </span>
        </div>
        <nav className="flex items-center gap-6">
          <Link
            href="/admin/publicidad"
            className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-yellow-400 transition-colors"
          >
            Publicidad
          </Link>
          <Link
            href="/"
            className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
          >
            Volver al sitio
          </Link>
        </nav>
      </header>
      <main className="px-4 py-10 md:px-10">{children}</main>
    </div>
  );
}
