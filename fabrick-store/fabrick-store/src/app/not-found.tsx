import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-xl text-center space-y-6">
        <p className="text-yellow-400 text-xs tracking-[0.35em] uppercase">404</p>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight">Pagina no encontrada</h1>
        <p className="text-white/65 text-sm md:text-base">
          La ruta que buscas no existe o fue movida. Vuelve al inicio para seguir navegando en Fabrick.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border border-yellow-400/50 bg-yellow-400 px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-black transition-colors hover:bg-yellow-300"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}