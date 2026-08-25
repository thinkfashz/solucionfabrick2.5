'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import SectionPageShell from '@/components/SectionPageShell';
import { getSeedProjects, type FabrickProject } from '@/lib/projects';
import { cloudinaryUrl } from '@/lib/cloudinaryLoader';
import { ArrowLeft, Calendar, CheckCircle2, Hammer, MapPin, Ruler } from 'lucide-react';

type ProjectSource = 'db' | 'seed';

export default function ProyectoDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const [project, setProject] = useState<FabrickProject | null>(() => {
    return getSeedProjects().find((p) => p.id === id) || null;
  });
  const [source, setSource] = useState<ProjectSource>('seed');
  const [notFound, setNotFound] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/proyectos', { cache: 'no-store' });
        const json = (await res.json()) as { data: FabrickProject[]; source?: ProjectSource };
        if (cancelled) return;
        if (Array.isArray(json.data)) {
          const found = json.data.find((p) => String(p.id) === String(id));
          if (found) {
            setProject(found);
            setSource(json.source === 'db' ? 'db' : 'seed');
          } else if (!project) {
            setNotFound(true);
          }
        }
      } catch {
        if (!project && !cancelled) setNotFound(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!project && notFound) {
    return (
      <SectionPageShell
        eyebrow="Proyecto"
        title="Proyecto no encontrado"
        description="Este proyecto no existe o ya no está disponible en el catálogo público."
        primaryAction={{ href: '/proyectos', label: 'Ver todos los proyectos' }}
        secondaryAction={{ href: '/contacto', label: 'Quiero evaluar una idea' }}
      >
        <div className="py-10 text-center text-sm text-zinc-400">
          Volvé al listado de proyectos e inspiraciones de Soluciones Fabrick.
        </div>
      </SectionPageShell>
    );
  }

  if (!project) {
    return (
      <SectionPageShell
        eyebrow="Cargando"
        title="Preparando la ficha del proyecto"
        description="Estamos trayendo los detalles desde nuestra base de proyectos."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="aspect-[4/3] animate-pulse rounded-3xl bg-white/[0.04]" />
          <div className="space-y-3">
            <div className="h-8 w-3/4 animate-pulse rounded-lg bg-white/[0.04]" />
            <div className="h-3 w-full animate-pulse rounded-full bg-white/[0.04]" />
            <div className="h-3 w-5/6 animate-pulse rounded-full bg-white/[0.04]" />
          </div>
        </div>
      </SectionPageShell>
    );
  }

  const verified = source === 'db';
  const gallery = [project.hero_image, ...(project.gallery || [])].filter(Boolean);
  const mainImg = gallery[activeImg] || project.hero_image;

  return (
    <SectionPageShell
      eyebrow={verified ? `${project.category} · ${project.location}` : `Referencia visual · ${project.category}`}
      title={project.title}
      description={verified
        ? project.summary
        : `Ejemplo demostrativo para explorar estilo, superficie y soluciones posibles. No corresponde a una obra verificada de Soluciones Fabrick. ${project.summary}`}
      primaryAction={{ href: '/contacto', label: verified ? 'Quiero un proyecto así' : 'Quiero evaluar una idea así' }}
      secondaryAction={{ href: '/proyectos', label: 'Ver otros proyectos' }}
    >
      <div className="space-y-10">
        {!verified ? (
          <div className="rounded-2xl border border-amber-300/25 bg-amber-300/[0.07] px-5 py-4 text-sm leading-6 text-amber-100/85">
            <strong className="font-black text-amber-200">Ficha demostrativa.</strong> Las imágenes y datos de esta ficha son referenciales y no deben interpretarse como registro de una obra ejecutada por Soluciones Fabrick.
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-white/5 bg-white/[0.02]">
            {mainImg ? (
              <img
                src={cloudinaryUrl(mainImg, { width: 1200, quality: 75 })}
                alt={verified
                  ? `${project.title} — obra documentada por Soluciones Fabrick en ${project.location}`
                  : `${project.title} — imagen referencial de proyecto`}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-6xl text-white/10">
                {project.title[0]}
              </div>
            )}
          </div>
          {gallery.length > 1 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
              {gallery.slice(0, 4).map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={() => setActiveImg(i)}
                  className={`relative aspect-[4/3] overflow-hidden rounded-2xl border transition ${
                    i === activeImg
                      ? 'border-yellow-400/70 ring-2 ring-yellow-400/30'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                  aria-label={`Ver imagen ${i + 1} de ${project.title}`}
                >
                  <img
                    src={cloudinaryUrl(src, { width: 320, quality: 70 })}
                    alt={verified ? `${project.title} — vista ${i + 1}` : `${project.title} — referencia ${i + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {verified ? (
          <div className="grid gap-4 md:grid-cols-4">
            <DataCard icon={<MapPin size={14} />} label="Ubicación" value={project.location} />
            <DataCard icon={<Calendar size={14} />} label="Año" value={String(project.year)} />
            <DataCard icon={<Ruler size={14} />} label="Superficie" value={`${project.area_m2} m²`} />
            <DataCard icon={<Hammer size={14} />} label="Categoría" value={project.category} />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            <DataCard icon={<Hammer size={14} />} label="Tipo de referencia" value={project.category} />
            <DataCard icon={<Ruler size={14} />} label="Superficie referencial" value={`${project.area_m2} m²`} />
            <DataCard icon={<CheckCircle2 size={14} />} label="Estado" value="Ejemplo demo" />
            <DataCard icon={<MapPin size={14} />} label="Uso" value="Inspiración" />
          </div>
        )}

        {project.description ? (
          <div className="rounded-[2rem] border border-white/5 bg-zinc-950/70 p-8 md:p-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">
              {verified ? 'Descripción' : 'Descripción referencial'}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300 md:text-base">{project.description}</p>
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2">
          {project.materials?.length ? (
            <Block title={verified ? 'Materiales utilizados' : 'Materiales propuestos'} items={project.materials} />
          ) : null}
          {project.scope?.length ? (
            <Block title={verified ? 'Alcance ejecutado' : 'Alcance ilustrativo'} items={project.scope} />
          ) : null}
        </div>

        {project.highlights?.length ? (
          <div className="rounded-[2rem] border border-yellow-400/15 bg-yellow-400/[0.03] p-6 md:p-8">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">
              {verified ? 'Highlights' : 'Características del ejemplo'}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {project.highlights.map((h) => (
                <div key={h} className="rounded-xl border border-yellow-400/10 bg-black/40 px-4 py-3 text-sm text-white/80">
                  {h}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="rounded-[2rem] border border-yellow-400/25 bg-[linear-gradient(135deg,rgba(255,176,0,0.08),rgba(255,176,0,0.015))] p-10 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">Tu próxima obra</p>
          <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
            {verified ? 'Quiero un proyecto así' : '¿Te interesa una solución como esta?'}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-300">
            {verified
              ? 'Coordinamos diseño, materiales, estructura y terminaciones en un solo cronograma.'
              : 'Podemos estudiar tus medidas, terreno, presupuesto y necesidades para convertir esta referencia en una propuesta real, calculada para tu caso.'}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/contacto"
              className="rounded-full bg-yellow-400 px-8 py-4 text-[11px] font-black uppercase tracking-[0.3em] text-black hover:bg-yellow-300"
            >
              Solicitar evaluación
            </Link>
            <Link
              href="/proyectos"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-8 py-4 text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-300 hover:border-yellow-400/40 hover:text-yellow-400"
            >
              <ArrowLeft size={12} /> Ver todos los proyectos
            </Link>
          </div>
        </div>
      </div>
    </SectionPageShell>
  );
}

function DataCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-zinc-950/70 p-4 text-center">
      <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full border border-yellow-400/25 text-yellow-400">
        {icon}
      </div>
      <p className="text-sm font-bold text-white">{value}</p>
      <p className="mt-1 text-[9px] uppercase tracking-[0.25em] text-zinc-500">{label}</p>
    </div>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[1.75rem] border border-white/5 bg-zinc-950/70 p-6 md:p-8">
      <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">{title}</p>
      <ul className="space-y-2.5">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-2 text-sm leading-relaxed text-zinc-300">
            <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-yellow-400/70" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
