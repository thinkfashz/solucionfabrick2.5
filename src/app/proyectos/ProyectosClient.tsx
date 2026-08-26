'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import FabrickLogo from '@/components/FabrickLogo';
import { getSeedProjects, type FabrickProject } from '@/lib/projects';
import { cloudinaryUrl } from '@/lib/cloudinaryLoader';
import { ArrowRight, CheckCircle2, Hammer, MapPin, Ruler, Search } from 'lucide-react';

type ProjectSource = 'db' | 'seed';

export default function ProyectosClient() {
  const [projects, setProjects] = useState<FabrickProject[]>(() => getSeedProjects());
  const [source, setSource] = useState<ProjectSource>('seed');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/proyectos', { cache: 'no-store' });
        const json = (await res.json()) as { data?: FabrickProject[]; source?: ProjectSource };
        if (!cancelled && Array.isArray(json.data) && json.data.length > 0) {
          setProjects(json.data);
          setSource(json.source === 'db' ? 'db' : 'seed');
        }
      } catch {
        // Keep the curated fallback.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const verified = source === 'db';
  const categories = useMemo(() => ['Todos', ...Array.from(new Set(projects.map((project) => project.category).filter(Boolean)))], [projects]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((project) => {
      const categoryMatch = category === 'Todos' || project.category === category;
      const text = `${project.title} ${project.summary} ${project.description} ${project.location} ${project.category}`.toLowerCase();
      return categoryMatch && (!q || text.includes(q));
    });
  }, [projects, query, category]);

  const totalArea = projects.reduce((total, project) => total + Number(project.area_m2 || 0), 0);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#090909] text-white">
      <Navbar />
      <main className="pb-24 pt-24 md:pt-28">
        <section className="relative overflow-hidden border-b border-white/8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,176,0,.14),transparent_32rem)]" />
          <div className="relative mx-auto grid max-w-[1380px] gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.15fr_.85fr] lg:px-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.26em] text-[#FFB000]">Soluciones Fabrick · Portafolio</p>
              <h1 className="mt-4 max-w-[11ch] text-[clamp(3rem,7vw,6.5rem)] font-black leading-[.88] tracking-[-.07em]">
                Proyectos que se entienden de un vistazo.
              </h1>
              <p className="mt-6 max-w-2xl text-sm leading-7 text-white/52 sm:text-base sm:leading-8">
                Revisa superficies, soluciones, materiales y alcance sin navegar entre cajas innecesarias. Cada ficha prioriza la obra, la imagen y la información que realmente ayuda a decidir.
              </p>
              <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/10 pt-5 text-sm">
                <Metric value={String(projects.length)} label={verified ? 'proyectos publicados' : 'referencias disponibles'} />
                <Metric value={`${totalArea.toLocaleString('es-CL')} m²`} label={verified ? 'documentados' : 'de referencia'} />
                <Metric value={verified ? 'Verificado' : 'Referencial'} label="tipo de portafolio" />
              </div>
            </div>
            <div className="flex items-end lg:justify-end">
              <div className="max-w-md border-l border-[#FFB000]/35 pl-5 sm:pl-7">
                <p className="text-xs font-black uppercase tracking-[.2em] text-[#FFB000]">Cómo leer esta sección</p>
                <p className="mt-3 text-sm leading-7 text-white/55">
                  {verified
                    ? 'Las fichas provienen de la base pública de proyectos y muestran información documentada por el equipo.'
                    : 'Las fichas actuales son referencias de inspiración y se identifican como tales para no confundirlas con obras verificadas.'}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/contacto" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#FFB000] px-5 text-xs font-black text-black">Evaluar mi proyecto <ArrowRight className="h-4 w-4" /></Link>
                  <Link href="/soluciones" className="inline-flex min-h-12 items-center rounded-full border border-white/12 px-5 text-xs font-black text-white/75">Ver servicios</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1380px] px-4 pt-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 border-b border-white/8 pb-6 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex min-h-12 w-full items-center gap-3 border-b border-white/15 lg:max-w-md">
              <Search className="h-4 w-4 text-[#FFB000]" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar proyecto, material, ubicación…" className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/25" />
              <span className="text-[10px] font-black text-white/30">{filtered.length}</span>
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((item) => (
                <button key={item} onClick={() => setCategory(item)} className={`shrink-0 border-b-2 px-1 py-2 text-[10px] font-black uppercase tracking-[.16em] transition ${category === item ? 'border-[#FFB000] text-[#FFB000]' : 'border-transparent text-white/35 hover:text-white/70'}`}>
                  {item}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid gap-px bg-white/8 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-[430px] animate-pulse bg-white/[.035]" />)}
            </div>
          ) : filtered.length ? (
            <div className="divide-y divide-white/8">
              {filtered.map((project, index) => (
                <ProjectRow key={project.id} project={project} verified={verified} reverse={index % 2 === 1} />
              ))}
            </div>
          ) : (
            <div className="py-24 text-center">
              <Search className="mx-auto h-8 w-8 text-white/15" />
              <h2 className="mt-4 text-2xl font-black">No encontramos coincidencias.</h2>
              <button onClick={() => { setQuery(''); setCategory('Todos'); }} className="mt-4 text-xs font-black text-[#FFB000]">Limpiar filtros</button>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-white/8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1380px] flex-col items-start justify-between gap-5 md:flex-row md:items-center">
          <FabrickLogo className="pointer-events-none" />
          <p className="text-[10px] uppercase tracking-[.2em] text-white/28">Construcción · Remodelación · Soluciones</p>
        </div>
      </footer>
    </div>
  );
}

function ProjectRow({ project, verified, reverse }: { project: FabrickProject; verified: boolean; reverse: boolean }) {
  return (
    <article className="group grid gap-0 py-8 md:grid-cols-2 md:py-12">
      <Link href={`/proyectos/${project.id}`} className={`relative block min-h-[320px] overflow-hidden bg-zinc-900 sm:min-h-[420px] ${reverse ? 'md:order-2' : ''}`}>
        <img src={cloudinaryUrl(project.hero_image, { width: 1100, quality: 76 })} alt={verified ? project.title : `${project.title} — referencia visual`} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]" loading="lazy" decoding="async" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-4 left-4 flex gap-2">
          <span className="bg-[#FFB000] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.16em] text-black">{project.category}</span>
          {!verified ? <span className="border border-white/15 bg-black/60 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.16em] text-white/70 backdrop-blur">Referencial</span> : null}
        </div>
      </Link>

      <div className={`flex flex-col justify-center py-7 md:px-10 lg:px-14 ${reverse ? 'md:pr-12 md:pl-0' : 'md:pl-12'}`}>
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#FFB000]">{verified ? project.location : 'Idea de proyecto'}</p>
        <h2 className="mt-3 max-w-[13ch] text-3xl font-black leading-[.95] tracking-[-.05em] sm:text-4xl lg:text-5xl">{project.title}</h2>
        <p className="mt-5 max-w-xl text-sm leading-7 text-white/50">{project.summary}</p>

        <div className="mt-6 flex flex-wrap gap-x-7 gap-y-3 border-y border-white/8 py-4 text-xs text-white/58">
          <InlineDatum icon={<Ruler className="h-4 w-4" />} value={`${project.area_m2} m²`} />
          <InlineDatum icon={verified ? <MapPin className="h-4 w-4" /> : <Hammer className="h-4 w-4" />} value={verified ? project.location.split(',')[0] : project.category} />
          <InlineDatum icon={<CheckCircle2 className="h-4 w-4" />} value={verified ? String(project.year) : 'Referencia'} />
        </div>

        <div className="mt-6">
          <p className="text-[9px] font-black uppercase tracking-[.2em] text-white/28">{verified ? 'Materiales principales' : 'Materiales sugeridos'}</p>
          <p className="mt-2 line-clamp-2 text-xs leading-6 text-white/42">{project.materials.slice(0, 4).join(' · ')}</p>
        </div>

        <Link href={`/proyectos/${project.id}`} className="mt-7 inline-flex w-fit items-center gap-2 border-b border-[#FFB000] pb-1 text-[10px] font-black uppercase tracking-[.18em] text-[#FFB000]">
          {verified ? 'Ver proyecto completo' : 'Ver referencia completa'} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div><strong className="block text-xl font-black text-white sm:text-2xl">{value}</strong><span className="mt-1 block text-[9px] uppercase tracking-[.16em] text-white/28">{label}</span></div>;
}

function InlineDatum({ icon, value }: { icon: React.ReactNode; value: string }) {
  return <span className="inline-flex items-center gap-2"><span className="text-[#FFB000]">{icon}</span>{value}</span>;
}
