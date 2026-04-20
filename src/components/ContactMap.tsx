interface ContactMapProps {
  className?: string;
  title?: string;
  subtitle?: string;
}

const MAP_EMBED_URL =
  'https://www.openstreetmap.org/export/embed.html?bbox=-70.7089%2C-33.4709%2C-70.6289%2C-33.4269&layer=mapnik&marker=-33.4489%2C-70.6693';

const MAP_VIEW_URL = 'https://www.openstreetmap.org/?mlat=-33.4489&mlon=-70.6693#map=14/-33.4489/-70.6693';

export default function ContactMap({
  className = '',
  title = 'Oficina Central · Santiago',
  subtitle = 'Mapa interactivo actualizado con OpenStreetMap',
}: ContactMapProps) {
  return (
    <div className={`relative overflow-hidden rounded-[2rem] border border-white/5 bg-zinc-950 ${className}`}>
      <iframe
        title={title}
        src={MAP_EMBED_URL}
        className="h-full min-h-[18rem] w-full"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/55 to-transparent" />
      <div className="absolute left-4 top-4 rounded-2xl border border-white/10 bg-black/70 px-4 py-3 backdrop-blur-md">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-yellow-400">{title}</p>
        <p className="mt-1 text-xs text-zinc-300">{subtitle}</p>
      </div>
      <a
        href={MAP_VIEW_URL}
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-4 right-4 rounded-full border border-yellow-400/40 bg-black/75 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-400 transition hover:bg-yellow-400 hover:text-black"
      >
        Abrir mapa
      </a>
    </div>
  );
}
