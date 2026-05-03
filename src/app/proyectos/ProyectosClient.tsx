'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SectionPageShell from '@/components/SectionPageShell';
import { getSeedProjects, type FabrickProject } from '@/lib/projects';
import { cloudinaryUrl } from '@/lib/cloudinaryLoader';
import { MapPin, Ruler, Calendar, CheckCircle2, ArrowRight, Hammer } from 'lucide-react';

export default function ProyectosClient() {
  const [projects, setProjects] = useState<FabrickProject[]>(() => getSeedProjects());
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FabrickProject | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/proyectos', { cache: 'no-store' });
        const json = (await res.json()) as { data: FabrickProject[] };
        if (!cancelled && Array.isArray(json.data) && json.data.length > 0) {
          setProjects(json.data);
        }
      } catch {
        /* keep seed */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SectionPageShell
      eyebrow="Obras reales"
      title="Proyectos que ya están habitados"
      description="Cada obra aquí mostrada fue ejecutada íntegramente por el equipo Fabrick: estructura, instalaciones, revestimientos y terminaciones. Revisa superficie, materiales y ubicación real."
      primaryAction={{ href: '/contacto', label: 'Quiero un proyecto así' }}
      secondaryAction={{ href: '/soluciones', label: 'Ver soluciones' }}
    >
      {/* Stats strip */}
      <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Proyectos entregados', value: `${projects.length}+` },
          { label: 'm² intervenidos', value: `${projects.reduce((a, p) => a + (p.area_m2 || 0), 0)}` },
          { label: 'Años de experiencia', value: '8' },
          { label: 'Garantía estructural', value: '10 años' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/5 bg-zinc-950/70 p-5 text-center"
          >
            <p className="text-2xl font-black text-yellow-400">{s.value}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-zinc-500">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-[2rem] bg-white/[0.04]" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {projects.map((project) => (
            <article
              key={project.id}
              className="group overflow-hidden rounded-[2rem] border border-white/5 bg-zinc-950/80 transition hover:border-yellow-400/30 hover:shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
            >
              <div className="relative h-64 overflow-hidden">
                <img
                  src={cloudinaryUrl(project.hero_image, { width: 800, quality: 70 })}
                  alt={project.title}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute left-5 top-5 flex gap-2">
                  <span className="rounded-full bg-yellow-400/95 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-black">
                    {project.category}
                  </span>
                  {project.featured ? (
                    <span className="rounded-full border border-yellow-400/30 bg-black/50 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-yellow-400 backdrop-blur-sm">
                      ★ Destacado
                    </span>
                  ) : null}
                </div>
                <div className="absolute bottom-5 left-5 right-5">
                  <h3 className="text-xl font-black uppercase leading-tight tracking-tight text-white md:text-2xl">
                    {project.title}
                  </h3>
                </div>
              </div>

              <div className="space-y-5 p-6 md:p-7">
                <p className="text-sm leading-relaxed text-zinc-300">{project.summary}</p>

                <div className="grid grid-cols-3 gap-3 text-[10px]">
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                    <MapPin size={14} className="mx-auto mb-1 text-yellow-400/80" />
                    <p className="font-bold uppercase tracking-wider text-white/80">
                      {project.location.split(',')[0]}
                    </p>
                    <p className="mt-0.5 truncate text-zinc-500">{project.location.split(',')[1]?.trim()}</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                    <Ruler size={14} className="mx-auto mb-1 text-yellow-400/80" />
                    <p className="font-bold uppercase tracking-wider text-white/80">{project.area_m2} m²</p>
                    <p className="mt-0.5 text-zinc-500">Superficie</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                    <Calendar size={14} className="mx-auto mb-1 text-yellow-400/80" />
                    <p className="font-bold uppercase tracking-wider text-white/80">{project.year}</p>
                    <p className="mt-0.5 text-zinc-500">Año</p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.3em] text-yellow-400/70">
                    Materiales principales
                  </p>
                  <ul className="space-y-1.5">
                    {project.materials.slice(0, 3).map((m) => (
                      <li key={m} className="flex items-start gap-2 text-xs leading-relaxed text-zinc-400">
                        <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0 text-yellow-400/70" />
                        <span>{m}</span>
                      </li>
                    ))}
                    {project.materials.length > 3 ? (
                      <li className="text-[10px] uppercase tracking-widest text-zinc-600">
                        + {project.materials.length - 3} materiales más
                      </li>
                    ) : null}
                  </ul>
                </div>

                <Link
                  href={`/proyectos/${project.id}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-yellow-400/10 border border-yellow-400/30 px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-yellow-400 transition hover:bg-yellow-400 hover:text-black"
                >
                  Ver detalles
                  <ArrowRight size={12} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected ? (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-white/10 bg-zinc-950"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/50 text-zinc-400 hover:border-white/30 hover:text-white"
              aria-label="Cerrar"
            >
              ×
            </button>
            <div className="relative h-64 w-full overflow-hidden md:h-80">
              <img src={cloudinaryUrl(selected.hero_image, { width: 1200, quality: 75 })} alt={selected.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute bottom-5 left-6 right-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400">
                  {selected.category} · {selected.location}
                </p>
                <h2 className="mt-2 text-2xl font-black uppercase leading-tight text-white md:text-4xl">
                  {selected.title}
                </h2>
              </div>
            </div>

            <div className="space-y-8 p-6 md:p-10">
              <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
                <Stat label="Superficie" value={`${selected.area_m2} m²`} />
                <Stat label="Año" value={String(selected.year)} />
                <Stat label="Categoría" value={selected.category} />
                <Stat label="Ubicación" value={selected.location.split(',')[0]} />
                <Stat label="Garantía" value="10 años" />
              </div>

              <p className="text-sm leading-relaxed text-zinc-300 md:text-base">{selected.description}</p>

              <div className="grid gap-8 md:grid-cols-2">
                <Block title="Materiales utilizados" icon={<Hammer size={14} />} items={selected.materials} />
                <Block title="Alcance ejecutado" icon={<CheckCircle2 size={14} />} items={selected.scope} />
              </div>

              {selected.highlights.length > 0 ? (
                <div>
                  <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.3em] text-yellow-400/70">Highlights</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {selected.highlights.map((h) => (
                      <div key={h} className="rounded-xl border border-yellow-400/15 bg-yellow-400/[0.03] px-4 py-3 text-sm text-white/80">
                        {h}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {selected.gallery && selected.gallery.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {selected.gallery.map((g) => (
                    <img
                      key={g}
                      src={cloudinaryUrl(g, { width: 600, quality: 70 })}
                      alt={selected.title}
                      className="aspect-[4/3] w-full rounded-2xl border border-white/5 object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ))}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-white/5 pt-6 sm:flex-row">
                <Link
                  href="/contacto"
                  className="flex-1 rounded-full bg-yellow-400 py-4 text-center text-[10px] font-black uppercase tracking-[0.3em] text-black hover:bg-yellow-300"
                >
                  Solicitar un proyecto similar
                </Link>
                <button
                  onClick={() => setSelected(null)}
                  className="flex-1 rounded-full border border-white/10 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 hover:border-white/30 hover:text-white"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </SectionPageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
      <p className="text-sm font-black text-white">{value}</p>
      <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
    </div>
  );
}

function Block({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-yellow-400/80">
        {icon}
        <p className="text-[9px] font-bold uppercase tracking-[0.3em]">{title}</p>
      </div>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-2 text-sm leading-relaxed text-zinc-300">
            <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-yellow-400" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
