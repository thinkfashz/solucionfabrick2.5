'use client';

/* eslint-disable @next/next/no-img-element */

import { CalendarClock, CheckCircle2, FileText, Instagram, Facebook, Music2 } from 'lucide-react';

export interface HistoryRow {
  id: string;
  titulo: string;
  estado?: string;
  created_at?: string;
  fecha_publicacion?: string | null;
  imagenes?: unknown;
  plataformas?: unknown;
  tag?: string | null;
  meta_post_id?: string | null;
}

function firstImage(row: HistoryRow): string | null {
  if (Array.isArray(row.imagenes) && typeof row.imagenes[0] === 'string') {
    return row.imagenes[0] as string;
  }
  return null;
}

function platformsList(row: HistoryRow): string[] {
  const p = row.plataformas;
  if (!p || typeof p !== 'object' || Array.isArray(p)) return [];
  return Object.entries(p as Record<string, unknown>)
    .filter(([, v]) => Boolean(v))
    .map(([k]) => k);
}

function EstadoPill({ estado }: { estado: string }) {
  const map: Record<string, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
    publicado: {
      label: 'Publicado',
      cls: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
      Icon: CheckCircle2,
    },
    programado: {
      label: 'Programado',
      cls: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300',
      Icon: CalendarClock,
    },
    borrador: {
      label: 'Borrador',
      cls: 'border-white/15 bg-white/[0.04] text-zinc-300',
      Icon: FileText,
    },
    error: {
      label: 'Error',
      cls: 'border-red-400/30 bg-red-400/10 text-red-300',
      Icon: FileText,
    },
  };
  const m = map[estado] ?? map.borrador;
  const Icon = m.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${m.cls}`}
    >
      <Icon className="h-3 w-3" />
      {m.label}
    </span>
  );
}

function PlatformIcons({ platforms }: { platforms: string[] }) {
  if (platforms.length === 0) {
    return <span className="text-[10px] text-zinc-600 uppercase">—</span>;
  }
  return (
    <span className="flex items-center gap-1.5 text-zinc-300">
      {platforms.includes('instagram') && <Instagram className="h-3.5 w-3.5" />}
      {platforms.includes('facebook') && <Facebook className="h-3.5 w-3.5" />}
      {platforms.includes('tiktok') && <Music2 className="h-3.5 w-3.5" />}
    </span>
  );
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryTable({
  rows,
  loading,
}: {
  rows: HistoryRow[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-10 text-center text-sm text-zinc-500">
        Cargando historial…
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-10 text-center">
        <p className="text-sm text-zinc-400">No hay publicaciones guardadas todavía.</p>
        <p className="mt-1 text-[11px] text-zinc-600">
          Crea un post y guárdalo como borrador, prográmalo o publícalo para verlo aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-zinc-500">
              <th className="px-4 py-3 text-left font-bold">Post</th>
              <th className="px-4 py-3 text-left font-bold">Estado</th>
              <th className="px-4 py-3 text-left font-bold">Plataformas</th>
              <th className="px-4 py-3 text-left font-bold">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const img = firstImage(row);
              const plats = platformsList(row);
              return (
                <tr
                  key={row.id}
                  className="border-b border-white/5 last:border-none hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
                        {img ? (
                          <img src={img} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[9px] uppercase text-zinc-600">
                            Sin img
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-zinc-100">
                          {row.titulo || 'Sin título'}
                        </p>
                        {row.tag && (
                          <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                            {row.tag}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <EstadoPill estado={row.estado ?? 'borrador'} />
                  </td>
                  <td className="px-4 py-3">
                    <PlatformIcons platforms={plats} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[12px] text-zinc-300 tabular-nums">
                      {formatDate(row.fecha_publicacion || row.created_at)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
