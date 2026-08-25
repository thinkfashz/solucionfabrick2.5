'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  ExternalLink,
  Loader2,
  PackagePlus,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { AdminPage, AdminPageHeader, AdminStat, AdminStats, AdminSurface } from '@/components/admin/AdminPage';

type Ranked = {
  name: string;
  description?: string | null;
  supplier?: string | null;
  supplierUrl?: string | null;
  supplierPrice: number;
  marketPrice?: number | null;
  stock?: number | null;
  imageUrl?: string | null;
  category?: string | null;
  specifications?: Record<string, unknown> | null;
  suggestedPrice: number;
  marginPercent: number;
  score: number;
  duplicateRisk: 'low' | 'medium' | 'high';
  reasons: string[];
};

type RankResponse = { ok?: boolean; ranked?: Ranked[]; catalogCompared?: number; received?: number; error?: string };

const SAMPLE = JSON.stringify([
  {
    name: 'Taladro inalámbrico 20V Brushless',
    description: 'Taladro atornillador inalámbrico con motor brushless y dos baterías.',
    supplier: 'Proveedor ejemplo',
    supplierUrl: 'https://proveedor.example/producto-1',
    supplierPrice: 54990,
    marketPrice: 84990,
    stock: 18,
    imageUrl: 'https://images.example/taladro.webp',
    category: 'Herramientas',
    specifications: { voltaje: '20V', motor: 'Brushless' },
  },
  {
    name: 'Nivel láser 12 líneas verde',
    description: 'Nivel láser autonivelante para obra y terminaciones.',
    supplier: 'Proveedor ejemplo',
    supplierPrice: 69990,
    marketPrice: 109990,
    stock: 7,
    category: 'Herramientas',
  },
], null, 2);

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export default function CommerceAgentPage() {
  const [raw, setRaw] = useState(SAMPLE);
  const [markup, setMarkup] = useState(30);
  const [minimumMargin, setMinimumMargin] = useState(25);
  const [ranked, setRanked] = useState<Ranked[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [catalogCompared, setCatalogCompared] = useState(0);

  const parsedCount = useMemo(() => {
    try {
      const value = JSON.parse(raw);
      return Array.isArray(value) ? value.length : 0;
    } catch {
      return 0;
    }
  }, [raw]);

  const averageScore = ranked.length
    ? Math.round(ranked.reduce((sum, item) => sum + item.score, 0) / ranked.length)
    : 0;

  async function analyze() {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const candidates = JSON.parse(raw);
      const response = await fetch('/api/admin/intelligence/commerce/rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidates, markupPercent: markup, minimumMarginPercent: minimumMargin }),
      });
      const json = await response.json() as RankResponse;
      if (!response.ok) throw new Error(json.error || 'No se pudieron analizar los candidatos.');
      setRanked(json.ranked || []);
      setCatalogCompared(json.catalogCompared || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'JSON o candidatos inválidos.');
    } finally {
      setLoading(false);
    }
  }

  async function proposal(candidate: Ranked) {
    setCreating(candidate.name);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/intelligence/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: {
            type: 'product.create',
            payload: {
              name: candidate.name,
              description: candidate.description || `Producto recomendado por Fabrick Intelligence. Proveedor: ${candidate.supplier || 'por confirmar'}.`,
              supplier: candidate.supplier || null,
              supplierUrl: candidate.supplierUrl || null,
              supplierPrice: candidate.supplierPrice,
              price: candidate.suggestedPrice,
              stock: candidate.stock || 0,
              image_url: candidate.imageUrl || null,
              specifications: {
                ...(candidate.specifications || {}),
                commerce_agent_score: candidate.score,
                commerce_agent_market_price: candidate.marketPrice || null,
                commerce_agent_category_hint: candidate.category || null,
              },
            },
          },
          context: { supplierPrice: candidate.supplierPrice },
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || json.decision?.reasons?.join(' ') || 'No se pudo guardar la propuesta.');
      setMessage(`Propuesta creada para “${candidate.name}”. Ya está en la cola de aprobación.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la propuesta.');
    } finally {
      setCreating('');
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Fabrick Intelligence · Commerce Agent"
        title="Compara antes de comprar o publicar"
        description="Analiza candidatos de proveedores o investigación, compara margen, disponibilidad, precio de mercado y riesgo de duplicados. La opción elegida siempre pasa primero por la cola de aprobación."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/intelligence" className="rounded-xl border border-black/10 bg-white/65 px-4 py-2.5 text-xs font-black text-[#514b42] transition hover:border-[#c77a00]/35 hover:text-[#9b6a12]">
              Centro Intelligence
            </Link>
            <Link href="/admin/intelligence/proposals" className="rounded-xl bg-[#171612] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#2b2924]">
              Cola de aprobación
            </Link>
          </div>
        )}
      />

      <AdminStats>
        <AdminStat label="Candidatos" value={parsedCount} note="Registros listos para analizar" icon={Search} />
        <AdminStat label="Catálogo comparado" value={catalogCompared || '—'} note="Productos usados como referencia" icon={Bot} />
        <AdminStat label="Top devuelto" value={ranked.length || '—'} note="Máximo cuatro recomendaciones" icon={Sparkles} />
        <AdminStat label="Score promedio" value={ranked.length ? `${averageScore}/100` : '—'} note={`Margen mínimo configurado: ${minimumMargin}%`} icon={ShieldCheck} />
      </AdminStats>

      <div className="grid gap-5 xl:grid-cols-[.78fr_1.22fr]">
        <AdminSurface
          title="Candidatos"
          description="Pega o edita el JSON compatible con el importador actual. El análisis no publica productos."
        >
          <textarea
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            rows={20}
            spellCheck={false}
            className="w-full rounded-[16px] border border-black/10 bg-[#171612] p-4 font-mono text-xs leading-6 text-white/80 outline-none transition focus:border-[#c77a00]/55"
          />

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Field label="Candidatos">
              <input value={parsedCount} readOnly className="fabrick-commerce-input" />
            </Field>
            <Field label="Markup %">
              <input type="number" value={markup} onChange={(event) => setMarkup(Math.max(0, Number(event.target.value) || 0))} className="fabrick-commerce-input" />
            </Field>
            <Field label="Margen mínimo %">
              <input type="number" value={minimumMargin} onChange={(event) => setMinimumMargin(Math.max(0, Number(event.target.value) || 0))} className="fabrick-commerce-input" />
            </Field>
          </div>

          <button
            type="button"
            onClick={() => void analyze()}
            disabled={loading}
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#c77a00] px-5 text-sm font-black text-white transition hover:bg-[#a96500] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Analizar y elegir las 4 mejores
          </button>

          <div className="mt-4 rounded-[16px] border border-emerald-200 bg-emerald-50 p-4 text-xs leading-6 text-emerald-800">
            <ShieldCheck className="mr-2 inline h-4 w-4" />
            Esta pantalla no publica nada. El producto seleccionado entra primero a la cola de aprobación y vuelve a validarse al ejecutar.
          </div>

          {error ? (
            <p className="mt-4 rounded-[16px] border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <TriangleAlert className="mr-2 inline h-4 w-4" />{error}
            </p>
          ) : null}

          {message ? (
            <p className="mt-4 rounded-[16px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <CheckCircle2 className="mr-2 inline h-4 w-4" />{message}
            </p>
          ) : null}
        </AdminSurface>

        <AdminSurface
          title="Top 4 recomendados"
          description={catalogCompared ? `${catalogCompared} productos del catálogo fueron usados para detectar duplicados y comparar contexto.` : 'Ejecuta el análisis para obtener el ranking comercial.'}
        >
          {ranked.length ? (
            <div className="space-y-3">
              {ranked.map((item, index) => (
                <article key={`${item.name}-${index}`} className="rounded-[18px] border border-black/10 bg-white/70 p-4 shadow-[0_14px_34px_rgba(70,55,25,.06)] sm:p-5">
                  <div className="flex gap-4">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="h-20 w-20 shrink-0 rounded-[14px] border border-black/10 bg-white object-contain p-2" />
                    ) : (
                      <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[14px] border border-[#c77a00]/20 bg-[#fff7e8] text-2xl font-black text-[#c77a00]">#{index + 1}</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#171612] px-2.5 py-1 text-[10px] font-black text-white">Score {item.score}/100</span>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${duplicateTone(item.duplicateRisk)}`}>
                          Duplicado: {item.duplicateRisk}
                        </span>
                      </div>
                      <h3 className="mt-2 text-lg font-black tracking-[-.025em] text-[#171612]">{item.name}</h3>
                      <p className="mt-1 text-xs text-[#817a6f]">{item.supplier || 'Proveedor por confirmar'} · stock {item.stock ?? 'N/D'}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Mini label="Costo" value={money.format(item.supplierPrice)} />
                    <Mini label="Venta sugerida" value={money.format(item.suggestedPrice)} />
                    <Mini label="Margen" value={`${item.marginPercent}%`} />
                  </div>

                  <div className="mt-4 space-y-1 text-xs leading-5 text-[#716b60]">
                    {item.reasons.slice(0, 4).map((reason) => <p key={reason}>• {reason}</p>)}
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    {item.supplierUrl ? (
                      <a href={item.supplierUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-xs font-black text-[#514b42] transition hover:border-[#c77a00]/35 hover:text-[#9b6a12]">
                        <ExternalLink className="h-4 w-4" /> Ver proveedor
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void proposal(item)}
                      disabled={creating === item.name}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white transition hover:bg-[#2b2924] disabled:opacity-50"
                    >
                      {creating === item.name ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
                      Convertir en propuesta
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid min-h-[420px] place-items-center rounded-[18px] border border-dashed border-black/10 bg-white/35 p-8 text-center">
              <div>
                <Search className="mx-auto h-8 w-8 text-[#c77a00]" />
                <p className="mt-4 font-black text-[#171612]">Todavía no hay candidatos clasificados.</p>
                <p className="mt-2 max-w-md text-sm leading-6 text-[#817a6f]">Carga datos del proveedor o resultados de investigación y Fabrick Intelligence devolverá las cuatro opciones más prometedoras.</p>
              </div>
            </div>
          )}
        </AdminSurface>
      </div>

      <style jsx>{`
        .fabrick-commerce-input {
          margin-top: .5rem;
          height: 2.75rem;
          width: 100%;
          border-radius: .75rem;
          border: 1px solid rgba(0,0,0,.1);
          background: rgba(255,255,255,.72);
          padding: 0 .75rem;
          font-weight: 800;
          color: #171612;
          outline: none;
        }
        .fabrick-commerce-input:focus { border-color: rgba(199,122,0,.55); }
      `}</style>
    </AdminPage>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-xs font-bold text-[#716b60]">{label}{children}</label>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/5 bg-[#f7f1e7] p-3">
      <p className="text-[9px] font-black uppercase tracking-[.12em] text-[#8f887c]">{label}</p>
      <p className="mt-1 text-sm font-black text-[#171612]">{value}</p>
    </div>
  );
}

function duplicateTone(risk: Ranked['duplicateRisk']) {
  if (risk === 'high') return 'bg-red-50 text-red-700 ring-1 ring-red-200';
  if (risk === 'medium') return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
  return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
}
