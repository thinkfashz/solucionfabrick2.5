import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export type StoreCollection = {
  id: string;
  image: string;
  title: string;
  text: string;
  href: string;
  cta: string;
};

const COLLECTIONS: StoreCollection[] = [
  {
    id: 'cocina',
    image: '/flow/fabrick-coleccion-cocina.jpeg',
    title: 'Cocinas que se sienten premium',
    text: 'Porcelanato, grifería y detalles que cambian la cocina completa, no solo una esquina.',
    href: '/tienda/catalogo',
    cta: 'Ver productos de cocina',
  },
  {
    id: 'accesorios',
    image: '/flow/fabrick-coleccion-accesorios.jpeg',
    title: 'Detalles que elevan la casa',
    text: 'Grifería, iluminación y accesorios que se notan al entrar.',
    href: '/tienda/catalogo',
    cta: 'Ver accesorios',
  },
  {
    id: 'clima',
    image: '/flow/fabrick-coleccion-clima.jpeg',
    title: 'Confort todo el año',
    text: 'Calcula los BTU de tu espacio y elige el equipo exacto, no uno parecido.',
    href: '/herramientas/aire-acondicionado',
    cta: 'Calcular mi clima',
  },
];

const [lead, ...rest] = COLLECTIONS;

/**
 * Colecciones destacadas. Reemplaza la lógica de descuento por aspiración:
 * muestra espacios terminados y lleva al producto o a la calculadora que lo vende.
 */
export default function StoreCollections() {
  return (
    <section id="colecciones" aria-labelledby="collections-title" className="mx-auto max-w-[1540px] scroll-mt-24 px-3 pt-10 sm:px-6 sm:pt-14 lg:px-8">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F6C64A]">Colecciones destacadas</p>
          <h2 id="collections-title" className="mt-1 text-2xl font-black tracking-[-.045em] sm:text-4xl">
            Espacios terminados, productos reales.
          </h2>
        </div>
        <Link href="/tienda/catalogo" className="inline-flex items-center gap-2 self-start text-xs font-black text-[#F6C64A]">
          Ver todo el catálogo <ArrowRight size={15} aria-hidden />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <article className="group relative isolate min-h-[380px] overflow-hidden rounded-[1.8rem] border border-white/10 sm:min-h-[440px] lg:col-span-3">
          <img src={lead.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]" />
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,9,12,.24)_0%,rgba(5,9,12,.28)_38%,rgba(5,9,12,.94)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
            <h3 className="max-w-[20ch] text-[clamp(1.6rem,4vw,2.4rem)] font-black leading-[.95] tracking-[-.045em]">{lead.title}</h3>
            <p className="mt-3 max-w-[46ch] text-sm leading-6 text-white/72">{lead.text}</p>
            <Link href={lead.href} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#F6C64A] px-5 text-[11px] font-black text-black transition-colors duration-200 hover:bg-white">
              {lead.cta} <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </article>

        <div className="grid gap-4 lg:col-span-2">
          {rest.map((collection) => (
            <article key={collection.id} className="group relative isolate min-h-[260px] overflow-hidden rounded-[1.5rem] border border-white/10 sm:min-h-[280px]">
              <img src={collection.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]" />
              <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,9,12,.2)_0%,rgba(5,9,12,.3)_36%,rgba(5,9,12,.94)_100%)]" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <h3 className="max-w-[22ch] text-xl font-black leading-[1] tracking-[-.04em] sm:text-2xl">{collection.title}</h3>
                <p className="mt-2 max-w-[40ch] text-xs leading-5 text-white/65">{collection.text}</p>
                <Link href={collection.href} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/20 bg-black/40 px-4 text-[11px] font-black text-white backdrop-blur transition-colors duration-200 hover:border-[#F6C64A]/60 hover:text-[#F6C64A]">
                  {collection.cta} <ArrowRight size={13} aria-hidden />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
