import type { Metadata } from 'next';
import MercadoLibreScraper from '@/components/admin/MercadoLibreScraper';

export const metadata: Metadata = {
  title: 'Importar producto desde URL | Admin Fabrick',
};

export default function ImportarMercadoLibrePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-yellow-400">
          Productos · Importar
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
          Importar producto desde URL
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Pega un link de cualquier tienda — Mercado Libre (incluye los nuevos{' '}
          <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-yellow-400">meli.la/…</code>),
          Falabella, Ripley, AliExpress, Amazon o tu propio sitio — y crea el producto
          automáticamente en tu catálogo. Cada producto importado guarda el link de origen
          para que puedas comprar y enviar al cliente desde el detalle del pedido.
        </p>
      </header>

      <MercadoLibreScraper />

      {/* Quick-help / example panel */}
      <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5 text-sm text-zinc-400">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500">
          Ejemplos de URL aceptadas
        </p>
        <ul className="space-y-1.5">
          <li>
            <code className="block break-all rounded-lg border border-zinc-800 bg-black/60 p-2 text-xs text-yellow-300">
              https://meli.la/2pWqo
            </code>
          </li>
          <li>
            <code className="block break-all rounded-lg border border-zinc-800 bg-black/60 p-2 text-xs text-yellow-300">
              https://articulo.mercadolibre.cl/MLC-123456789-producto-de-ejemplo-_JM
            </code>
          </li>
          <li>
            <code className="block break-all rounded-lg border border-zinc-800 bg-black/60 p-2 text-xs text-yellow-300">
              https://www.falabella.com/falabella-cl/product/…
            </code>
          </li>
        </ul>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-zinc-500">
          <li>
            Los links de Mercado Libre se resuelven contra la API oficial: precio,
            stock, descripción y fotos del producto.
          </li>
          <li>
            Para otras tiendas se extraen los metadatos Open Graph y JSON-LD de la
            página (título, precio, imagen, descripción). Si la tienda no expone esos
            datos, podrás completarlos manualmente desde la ficha del producto.
          </li>
          <li>
            El precio en CLP se redondea a entero al guardar (los pesos chilenos no
            tienen decimales).
          </li>
        </ul>
      </section>
    </div>
  );
}

