import type { Metadata } from 'next';
import MercadoLibreScraper from '@/components/admin/MercadoLibreScraper';

export const metadata: Metadata = {
  title: 'Importar producto desde URL | Admin Fabrick',
};

export default function ImportarMercadoLibrePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="overflow-hidden rounded-[32px] bg-[#17170f] p-6 text-white shadow-[0_24px_70px_rgba(26,24,16,.14)] sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#f2cf5b]">
          Catálogo · Importación asistida
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
          Crea un producto desde un enlace
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
          Pega una URL de Mercado Libre, Falabella, Ripley, AliExpress, Amazon o tu propio sitio.
          Fabrick recupera nombre, precio, stock, descripción e imágenes y te permite revisarlos
          antes de incorporarlos al catálogo.
        </p>
      </header>

      <MercadoLibreScraper />

      {/* Quick-help / example panel */}
      <section className="rounded-[28px] border border-[#ded5bf] bg-[#fffaf0] p-5 text-sm text-[#6f6859] shadow-[0_18px_55px_rgba(46,40,22,.08)]">
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#8b7425]">
          Ejemplos de URL aceptadas
        </p>
        <ul className="space-y-1.5">
          <li>
            <code className="block break-all rounded-xl border border-[#ded5bf] bg-[#f5edda] p-2.5 text-xs text-[#4f4218]">
              https://meli.la/2pWqo
            </code>
          </li>
          <li>
            <code className="block break-all rounded-xl border border-[#ded5bf] bg-[#f5edda] p-2.5 text-xs text-[#4f4218]">
              https://articulo.mercadolibre.cl/MLC-123456789-producto-de-ejemplo-_JM
            </code>
          </li>
          <li>
            <code className="block break-all rounded-xl border border-[#ded5bf] bg-[#f5edda] p-2.5 text-xs text-[#4f4218]">
              https://www.falabella.com/falabella-cl/product/…
            </code>
          </li>
        </ul>
        <ul className="mt-4 list-disc space-y-1.5 pl-5 text-xs leading-5 text-[#746d5d]">
          <li>
            Los links de Mercado Libre se resuelven contra la API oficial: precio,
            stock, descripción y fotos del producto.
          </li>
          <li>
            Para otras tiendas el importer prueba 4 estrategias en cascada: fetch con
            UA de Chrome escritorio, UA de Chrome móvil, proxy Jina.ai y finalmente
            Microlink.io (Chrome en la nube). Cada una extrae Open Graph, JSON-LD y
            microdata. Si ninguna consigue el precio, el campo queda vacío para que lo
            ingreses manualmente.
          </li>
          <li>
            El precio en CLP se redondea a entero al guardar (los pesos chilenos no
            tienen decimales).
          </li>
          <li>
            Puedes añadir{' '}
            <code className="rounded bg-[#efe4c9] px-1 py-0.5 text-[#6d5916]">MICROLINK_API_KEY</code>{' '}
            en tus variables de entorno para aumentar el límite de solicitudes a Microlink.io.
          </li>
        </ul>
      </section>
    </div>
  );
}
