import { ArrowUpRight, Landmark, Youtube } from 'lucide-react';

const AUTHORITIES = [
  { name: 'MINVU', text: 'Vivienda, subsidios y normativa habitacional oficial.', href: 'https://www.minvu.cl/' },
  { name: 'CChC', text: 'Cámara Chilena de la Construcción: gremio, estudios y permisos.', href: 'https://www.cchc.cl/' },
  { name: 'CDT', text: 'Corporación de Desarrollo Tecnológico: manuales y buenas prácticas.', href: 'https://www.cdt.cl/' },
  { name: 'LeyChile (BCN)', text: 'OGUC, RIDAA y normas vigentes en texto oficial.', href: 'https://www.bcn.cl/leychile/' },
] as const;

const VIDEO_SEARCHES = [
  { label: 'Radieres paso a paso', query: 'como hacer radier casa chile' },
  { label: 'Metalcon estructural', query: 'tabique metalcon estructural chile' },
  { label: 'Construcción sismorresistente', query: 'construccion sismorresistente chile' },
] as const;

/**
 * Autoridades y referencias. Enlaces oficiales estables (no se inventan videos
 * específicos: los IDs cambian y un embed roto es peor que un buen enlace).
 */
export default function BlogAuthorities() {
  return (
    <section aria-labelledby="autoridades-title" className="mx-auto max-w-[1200px] px-4 pb-12 sm:px-6 sm:pb-16">
      <p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F6C64A]">Fuentes que usamos</p>
      <h2 id="autoridades-title" className="mt-1 text-2xl font-black tracking-[-.04em] sm:text-3xl">Autoridades, no opiniones.</h2>
      <p className="mt-2 max-w-2xl text-xs leading-5 text-white/50 sm:text-sm sm:leading-6">
        Todo lo técnico del blog se contrasta con estas fuentes. Si un dato no está aquí ni en un manual de fabricante, va marcado como [verificar].
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {AUTHORITIES.map((item) => (
          <a
            key={item.name}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-[1.4rem] border border-white/10 bg-white/[.02] p-4 transition hover:border-white/25 sm:p-5"
          >
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-white/40">
              <Landmark size={13} aria-hidden className="text-[#F6C64A]" /> Oficial
            </p>
            <b className="mt-1.5 block text-base font-black tracking-[-.02em] group-hover:text-[#F6C64A]">{item.name}</b>
            <small className="mt-1 block text-[11px] leading-5 text-white/50">{item.text}</small>
            <span className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-black text-white/40 transition group-hover:text-[#F6C64A]">
              Visitar sitio <ArrowUpRight size={12} aria-hidden />
            </span>
          </a>
        ))}
      </div>
      <div className="mt-3 rounded-[1.4rem] border border-white/10 bg-white/[.02] p-4 sm:p-5">
        <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-white/40">
          <Youtube size={14} aria-hidden className="text-[#F6C64A]" /> Videos de autoridades y maestros
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {VIDEO_SEARCHES.map((video) => (
            <a
              key={video.label}
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(video.query)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center rounded-full border border-white/12 px-4 text-[11px] font-black text-white/70 transition hover:border-[#F6C64A]/50 hover:text-[#F6C64A]"
            >
              {video.label}
            </a>
          ))}
        </div>
        <p className="mt-2.5 text-[10px] leading-4 text-white/30">
          Búsquedas curadas en YouTube (MINVU, CChC, CDT y maestros). Enlazamos búsquedas, no videos sueltos: los IDs cambian y un reproductor roto no ayuda a nadie.
        </p>
      </div>
    </section>
  );
}
