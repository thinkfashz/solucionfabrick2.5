import type { Metadata } from 'next';
import SectionPageShell from '@/components/SectionPageShell';

const FEATURED_PROJECT = {
  type: 'Remodelación integral',
  name: 'Casa Familia Morales',
  location: 'Las Condes, Santiago',
  year: '2024',
  sqm: '180 m²',
  duration: '3 meses',
  description:
    'Remodelación completa de vivienda de dos pisos: actualización de instalaciones eléctricas y sanitarias, construcción de terraza cubierta, nueva cocina abierta y remodelación de tres baños. Entregado en plazo y bajo presupuesto.',
  rating: 5,
  client: 'Familia Morales-Herrera',
};

const PROJECTS = [
  {
    type: 'Ampliación residencial',
    name: 'Segundo piso + terraza',
    location: 'Providencia',
    year: '2024',
    sqm: '95 m²',
    description: 'Construcción de segundo piso en estructura Metalcon, con terraza panorámica y domo de policarbonato.',
    rating: 5,
    client: 'Pedro A.',
  },
  {
    type: 'Cocina + baños',
    name: 'Renovación completa',
    location: 'Ñuñoa',
    year: '2023',
    sqm: '42 m²',
    description: 'Demolición y reconfiguración total de cocina abierta y dos baños con revestimiento de porcelanto 90×90.',
    rating: 5,
    client: 'Claudia V.',
  },
  {
    type: 'Seguridad domótica',
    name: 'Smart Home completo',
    location: 'Vitacura',
    year: '2024',
    sqm: '220 m²',
    description: 'Instalación de sistema de 12 cámaras IP 4K, cerraduras digitales, automatización de persianas y control por app.',
    rating: 5,
    client: 'Familia Torres',
  },
  {
    type: 'Construcción nueva',
    name: 'Casa prefabricada premium',
    location: 'Maipú',
    year: '2023',
    sqm: '120 m²',
    description: 'Edificación completa desde cimientos: estructura Metalcon, aislación total, instalaciones y terminaciones de primer nivel.',
    rating: 5,
    client: 'Jorge M.',
  },
  {
    type: 'Oficina comercial',
    name: 'Habilitación corporativa',
    location: 'Santiago Centro',
    year: '2023',
    sqm: '65 m²',
    description: 'Habilitación de oficina de 65 m²: tabiques, eléctrico, climatización, revestimientos y mobiliario coordinado.',
    rating: 5,
    client: 'Consultora Andes',
  },
  {
    type: 'Paisajismo exterior',
    name: 'Jardín y piscina',
    location: 'Lo Barnechea',
    year: '2022',
    sqm: '80 m²',
    description: 'Diseño y ejecución de jardín trasero con piscina plunge, terraza en deck de madera y sistema de riego automatizado.',
    rating: 5,
    client: 'Rodrigo F.',
  },
  {
    type: 'Gasfitería + eléctrico',
    name: 'Actualización completa',
    location: 'La Florida',
    year: '2022',
    sqm: '90 m²',
    description: 'Renovación de red de gasfitería, tablero eléctrico trifásico y circuitos. Certificación SEC completa.',
    rating: 5,
    client: 'Ana L.',
  },
  {
    type: 'Remodelación baños',
    name: '3 baños de lujo',
    location: 'San Miguel',
    year: '2024',
    sqm: '28 m²',
    description: 'Renovación de tres baños con cerámicas importadas, duchas de obra, vanitorios flotantes y grifería premium.',
    rating: 5,
    client: 'Familia Bravo',
  },
];

const STATS = [
  { value: '18.500 m²', label: 'Metros construidos' },
  { value: '2,8 meses', label: 'Tiempo promedio por proyecto' },
  { value: '100%', label: 'Satisfacción de clientes' },
  { value: '500+', label: 'Proyectos entregados' },
];

export const metadata: Metadata = {
  title: 'Proyectos | Fabrick',
  description: 'Casos y testimonios de proyectos desarrollados por Soluciones Fabrick. 500+ proyectos completados.',
};

export default function ProyectosPage() {
  return (
    <SectionPageShell
      eyebrow="Resultados"
      title="Confianza ganada en obra"
      description="Cada proyecto deja una huella concreta: orden, calidad y una experiencia mucho más tranquila para la familia que nos contrata."
      primaryAction={{ href: '/contacto', label: 'Quiero un proyecto así' }}
      secondaryAction={{ href: '/servicios', label: 'Ver servicios' }}
    >
      {/* Stats */}
      <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        {STATS.map(({ value, label }) => (
          <div key={label} className="rounded-[1.5rem] border border-yellow-400/20 bg-black/60 p-6 text-center">
            <p className="text-2xl font-black text-yellow-400 md:text-3xl">{value}</p>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Featured project */}
      <div className="mb-8 rounded-[2rem] border border-yellow-400/25 bg-gradient-to-br from-yellow-400/5 via-zinc-950 to-black p-8 md:p-12">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">Proyecto destacado · {FEATURED_PROJECT.year}</p>
        <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-white md:text-3xl">{FEATURED_PROJECT.name}</h2>
        <p className="mt-1 text-sm uppercase tracking-[0.2em] text-zinc-500">{FEATURED_PROJECT.type} · {FEATURED_PROJECT.location}</p>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-zinc-300">{FEATURED_PROJECT.description}</p>
        <div className="mt-8 flex flex-wrap gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">Superficie</span>
            <span className="mt-1 text-lg font-black text-white">{FEATURED_PROJECT.sqm}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">Duración</span>
            <span className="mt-1 text-lg font-black text-white">{FEATURED_PROJECT.duration}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">Cliente</span>
            <span className="mt-1 text-lg font-black text-white">{FEATURED_PROJECT.client}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">Calificación</span>
            <span className="mt-1 text-yellow-400">{'★'.repeat(FEATURED_PROJECT.rating)}</span>
          </div>
        </div>
      </div>

      {/* Project grid */}
      <div className="columns-1 gap-5 md:columns-2 xl:columns-3 [&>article]:mb-5">
        {PROJECTS.map((project) => (
          <article key={project.name} className="break-inside-avoid rounded-[2rem] border border-white/5 bg-zinc-950/85 p-7 transition hover:border-yellow-400/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-yellow-400">{project.type}</p>
                <h3 className="mt-1 text-sm font-bold uppercase tracking-[0.15em] text-white">{project.name}</h3>
              </div>
              <span className="shrink-0 text-[10px] font-bold text-zinc-500">{project.year}</span>
            </div>
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-zinc-600">{project.location} · {project.sqm}</p>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">{project.description}</p>
            <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">
              <span className="text-[11px] text-yellow-400">{'★'.repeat(project.rating)}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{project.client}</span>
            </div>
          </article>
        ))}
      </div>
    </SectionPageShell>
  );
}
