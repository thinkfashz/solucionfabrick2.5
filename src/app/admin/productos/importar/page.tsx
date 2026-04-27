import type { Metadata } from 'next';
import MercadoLibreScraper from '@/components/admin/MercadoLibreScraper';

export const metadata: Metadata = {
  title: 'Importar desde Mercado Libre | Admin Fabrick',
};

export default function ImportarMercadoLibrePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-yellow-400">
          Productos · Importar
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
          Importar desde Mercado Libre
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Pega la URL de una publicación de{' '}
          <span className="text-zinc-200">Mercado Libre Chile</span> (debe contener un
          identificador <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-yellow-400">MLC…</code>) y
          obtén una vista previa con título, precio en CLP, estado, stock y la cantidad
          de preguntas antes de guardarlo en tu catálogo.
        </p>
      </header>

      <MercadoLibreScraper />

      {/* Quick-help / example panel */}
      <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5 text-sm text-zinc-400">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500">
          Ejemplo de URL válida
        </p>
        <code className="block break-all rounded-lg border border-zinc-800 bg-black/60 p-3 text-xs text-yellow-300">
          https://articulo.mercadolibre.cl/MLC-123456789-producto-de-ejemplo-_JM
        </code>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-zinc-500">
          <li>Se acepta cualquier URL que contenga el patrón <code className="text-yellow-400">MLC</code> seguido de números.</li>
          <li>El botón <span className="text-zinc-200">Importar a mi Tienda</span> imprime la data en consola (pendiente de wiring).</li>
        </ul>
      </section>
    </div>
  );
}
