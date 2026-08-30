'use client';

import { useMemo, useState } from 'react';
import {
  Check,
  Clipboard,
  ExternalLink,
  Eye,
  QrCode,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  DEFAULT_FOUNDER_PUBLIC_PROFILE,
  PUBLIC_FOUNDER_URL,
  type FounderPublicProfile,
} from '@/lib/founderProfile';
import { AdminCard } from '@/components/admin/ui';

type Props = {
  value: FounderPublicProfile;
  displayName: string;
  avatarUrl: string | null;
  onChange: (next: FounderPublicProfile) => void;
};

const fieldClass = 'w-full rounded-xl border border-black/10 bg-white/78 px-3.5 py-3 text-sm font-semibold text-[#171612] outline-none transition focus:border-[#c77a00]/45 focus:bg-white';
const labelClass = 'mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-[#8f887c]';

function toLines(values: string[]) {
  return values.join('\n');
}

function fromLines(value: string) {
  return value.split(/\n+/).map((item) => item.trim()).filter(Boolean).slice(0, 30);
}

export default function FounderPublicProfileEditor({ value, displayName, avatarUrl, onChange }: Props) {
  const [copied, setCopied] = useState(false);
  const qrUrl = useMemo(
    () => `https://quickchart.io/qr?size=280&margin=1&ecLevel=H&text=${encodeURIComponent(PUBLIC_FOUNDER_URL)}`,
    [],
  );

  function patch<Key extends keyof FounderPublicProfile>(key: Key, next: FounderPublicProfile[Key]) {
    onChange({ ...value, [key]: next });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(PUBLIC_FOUNDER_URL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <AdminCard className="overflow-hidden p-0 sm:p-0">
      <div className="grid xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="p-4 sm:p-5 lg:p-6">
          <div className="flex flex-col gap-4 border-b border-black/8 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#ffb000]/12 text-[#a56600]"><Sparkles className="h-4 w-4" /></span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Micrositio público independiente</p>
                  <h2 className="mt-1 text-xl font-black tracking-[-.035em] text-[#171612]">Biografía, historia y visión del fundador</h2>
                </div>
              </div>
              <p className="mt-3 max-w-3xl text-xs leading-5 text-[#817a6f]">Este contenido vive únicamente en el enlace público del fundador. No se agrega a la Home, la Tienda ni los menús públicos. Tú decides cuándo compartirlo mediante el link o el QR.</p>
            </div>
            <label className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-black/10 bg-white/65 px-3 text-xs font-black text-[#4f493f]">
              <input type="checkbox" checked={value.enabled} onChange={(event) => patch('enabled', event.target.checked)} className="h-4 w-4 accent-[#c77a00]" />
              Perfil público activo
            </label>
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-700/10 bg-emerald-500/[.06] p-4 text-xs leading-6 text-emerald-950/75">
            <strong className="font-black">Acceso controlado por ti.</strong> Al activarlo, cualquier persona con el enlace puede verlo. Al desactivarlo y guardar, `/fundador` deja de estar disponible públicamente. El perfil no se enlaza desde la navegación comercial.
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <TextField label="Rol / presentación" value={value.role} onChange={(next) => patch('role', next)} />
            <TextField label="Frase principal" value={value.headline} onChange={(next) => patch('headline', next)} />
            <div className="sm:col-span-2"><TextField label="Resumen corto" value={value.summary} onChange={(next) => patch('summary', next)} textarea rows={4} /></div>
            <div className="sm:col-span-2"><TextField label="Biografía" value={value.biography} onChange={(next) => patch('biography', next)} textarea rows={7} /></div>
            <div className="sm:col-span-2"><TextField label="Cómo nació Soluciones Fabrick" value={value.origin} onChange={(next) => patch('origin', next)} textarea rows={5} /></div>
            <TextField label="Misión" value={value.mission} onChange={(next) => patch('mission', next)} textarea rows={5} />
            <TextField label="Visión" value={value.vision} onChange={(next) => patch('vision', next)} textarea rows={5} />
            <div className="sm:col-span-2"><TextField label="Proyección" value={value.projection} onChange={(next) => patch('projection', next)} textarea rows={5} /></div>
            <ListField label="Stack tecnológico — uno por línea" value={toLines(value.stack)} onChange={(next) => patch('stack', fromLines(next))} />
            <ListField label="Servicios — uno por línea" value={toLines(value.services)} onChange={(next) => patch('services', fromLines(next))} />
            <div className="sm:col-span-2"><ListField label="Principios — uno por línea" value={toLines(value.values)} onChange={(next) => patch('values', fromLines(next))} rows={5} /></div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-black/8 pt-5">
            <button type="button" onClick={() => onChange(DEFAULT_FOUNDER_PUBLIC_PROFILE)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3 text-xs font-black text-[#625b50] transition hover:bg-white">
              <RotateCcw className="h-4 w-4" /> Restaurar biografía recomendada
            </button>
            <a href={PUBLIC_FOUNDER_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-3.5 text-xs font-black text-white transition hover:bg-[#2a2823]">
              <Eye className="h-4 w-4" /> Abrir micrositio público <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <aside className="border-t border-black/8 bg-[#171612] p-5 text-white xl:border-l xl:border-t-0">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#ffb000]/12 text-[#ffbf33]"><QrCode className="h-5 w-5" /></span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ffbf33]">Compartir</p>
              <h3 className="mt-1 text-base font-black tracking-[-.02em]">QR y enlace del fundador</h3>
            </div>
          </div>

          <div className="mt-5 rounded-[22px] bg-white p-4 shadow-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt={`QR para abrir el perfil público de ${displayName}`} className="mx-auto aspect-square w-full max-w-[245px] object-contain" />
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.045] p-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-xs font-black text-[#ffbf33]">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : 'SF'}
            </span>
            <div className="min-w-0">
              <strong className="block truncate text-sm font-black">{displayName}</strong>
              <span className="mt-1 block truncate text-[10px] text-white/42">{value.role}</span>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/[.04] p-3">
            <p className="break-all text-[10px] leading-5 text-white/48">{PUBLIC_FOUNDER_URL}</p>
          </div>
          <button type="button" onClick={() => void copyLink()} className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.06] px-3 text-xs font-black text-white transition hover:bg-white/[.10]">
            {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Clipboard className="h-4 w-4" />}
            {copied ? 'Link copiado' : 'Copiar link público'}
          </button>
          <p className="mt-4 text-[10px] leading-5 text-white/35">Este enlace funciona como una tarjeta personal pública separada de la tienda y de la navegación principal. Puedes mostrar el QR directamente desde el teléfono o copiar el link para compartirlo.</p>
        </aside>
      </div>
    </AdminCard>
  );
}

function TextField({ label, value, onChange, textarea = false, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; textarea?: boolean; rows?: number }) {
  return (
    <label className="block min-w-0">
      <span className={labelClass}>{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className={`${fieldClass} resize-y leading-6`} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass} />
      )}
    </label>
  );
}

function ListField({ label, value, onChange, rows = 7 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return (
    <label className="block min-w-0">
      <span className={labelClass}>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className={`${fieldClass} resize-y font-mono text-[12px] leading-6`} />
    </label>
  );
}