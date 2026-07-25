'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Edit3, Loader2, PauseCircle, PlayCircle, RefreshCw, Save, Search, Settings2 } from 'lucide-react';

type MetaAd = {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  created_time?: string;
  updated_time?: string;
  campaign?: { id: string; name: string; objective?: string };
  adset?: { id: string; name: string; daily_budget?: string; lifetime_budget?: string; optimization_goal?: string; billing_event?: string };
  insights?: { data?: Array<{ spend?: string; clicks?: string; impressions?: string; ctr?: string; cpc?: string; cpm?: string; reach?: string; frequency?: string }> };
};

const currency = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const fromMinor = (value?: string) => Number(value || 0) / 100;

export default function ConfigureAdsPage() {
  const [ads, setAds] = useState<MetaAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [drafts, setDrafts] = useState<Record<string, { name: string; status: string; dailyBudget: string; lifetimeBudget: string }>>({});

  const load = useCallback(async () => {
    setLoading(true); setMessage('');
    try {
      const response = await fetch('/api/meta/ads', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudieron cargar los anuncios.');
      const next = json.data || [];
      setAds(next);
      setDrafts(Object.fromEntries(next.map((ad: MetaAd) => [ad.id, {
        name: ad.name || '',
        status: ad.status || 'PAUSED',
        dailyBudget: fromMinor(ad.adset?.daily_budget).toString(),
        lifetimeBudget: fromMinor(ad.adset?.lifetime_budget).toString(),
      }])));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error cargando anuncios.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return ads.filter((ad) => !normalized || `${ad.name} ${ad.campaign?.name || ''} ${ad.adset?.name || ''} ${ad.id}`.toLowerCase().includes(normalized));
  }, [ads, query]);

  function patch(id: string, key: 'name' | 'status' | 'dailyBudget' | 'lifetimeBudget', value: string) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [key]: value } }));
  }

  async function save(ad: MetaAd) {
    const draft = drafts[ad.id];
    if (!draft) return;
    setSaving(ad.id); setMessage('');
    try {
      const response = await fetch(`/api/meta/ads/${ad.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          status: draft.status,
          adSetId: ad.adset?.id,
          dailyBudgetCLP: draft.dailyBudget ? Number(draft.dailyBudget) : undefined,
          lifetimeBudgetCLP: draft.lifetimeBudget ? Number(draft.lifetimeBudget) : undefined,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo actualizar el anuncio.');
      setMessage(`Cambios guardados en “${draft.name}”.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar.');
    } finally { setSaving(''); }
  }

  return (
    <main className="rounded-[2.2rem] bg-white p-5 shadow-[0_24px_70px_rgba(23,24,32,.08)] sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#895E3D]">Configuración individual</p><h2 className="mt-2 text-3xl font-black tracking-[-.05em]">Controla cada anuncio por separado.</h2><p className="mt-2 max-w-2xl text-sm leading-7 text-[#685D55]">Edita nombre, estado y presupuesto del conjunto asociado. Los cambios se envían directamente a Meta.</p></div>
        <div className="flex gap-2"><label className="flex min-w-[260px] items-center gap-2 rounded-2xl bg-[#F8F0E9] px-4 py-3"><Search className="h-4 w-4 text-[#895E3D]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar anuncio…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label><button type="button" onClick={() => void load()} className="grid h-12 w-12 place-items-center rounded-2xl bg-[#171820] text-[#CCB196]"><RefreshCw className="h-4 w-4" /></button></div>
      </div>

      {message ? <p className="mt-5 rounded-2xl bg-[#E6D4C3] px-4 py-3 text-sm text-[#5E5148]">{message}</p> : null}
      {loading ? <div className="grid min-h-72 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-[#895E3D]" /></div> : null}

      {!loading ? <div className="mt-6 grid gap-4 xl:grid-cols-2">{filtered.map((ad) => {
        const draft = drafts[ad.id];
        const insight = ad.insights?.data?.[0];
        return <article key={ad.id} className="rounded-[1.8rem] bg-[#F8F0E9] p-5 shadow-[0_14px_45px_rgba(23,24,32,.07)]">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.15em] text-[#895E3D]">{ad.campaign?.name || 'Campaña sin nombre'}</p><h3 className="mt-2 text-xl font-black">{ad.name}</h3><p className="mt-1 text-[10px] text-[#756B63]">ID {ad.id} · {ad.adset?.name || 'Sin conjunto'}</p></div><span className={`rounded-full px-3 py-2 text-[9px] font-black ${ad.effective_status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-[#E6D4C3] text-[#5E5148]'}`}>{ad.effective_status}</span></div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{[
            ['Gasto', currency.format(Number(insight?.spend || 0))],
            ['Clics', Number(insight?.clicks || 0).toLocaleString('es-CL')],
            ['CTR', `${Number(insight?.ctr || 0).toFixed(2)}%`],
            ['CPC', currency.format(Number(insight?.cpc || 0))],
          ].map(([label, value]) => <div key={label} className="rounded-2xl bg-white p-3"><p className="text-[8px] font-black uppercase tracking-[.13em] text-[#756B63]">{label}</p><b className="mt-1 block text-base">{value}</b></div>)}</div>
          {draft ? <div className="mt-5 grid gap-3"><label className="grid gap-2"><span className="text-[9px] font-black uppercase tracking-[.14em] text-[#756B63]">Nombre del anuncio</span><div className="flex items-center gap-2 rounded-2xl bg-white px-4"><Edit3 className="h-4 w-4 text-[#895E3D]" /><input value={draft.name} onChange={(event) => patch(ad.id, 'name', event.target.value)} className="min-h-12 min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" /></div></label>
          <div className="grid gap-3 sm:grid-cols-3"><label className="grid gap-2"><span className="text-[9px] font-black uppercase tracking-[.14em] text-[#756B63]">Estado</span><select value={draft.status} onChange={(event) => patch(ad.id, 'status', event.target.value)} className="min-h-12 rounded-2xl bg-white px-4 text-sm font-bold outline-none"><option value="ACTIVE">Activo</option><option value="PAUSED">Pausado</option><option value="ARCHIVED">Archivado</option></select></label><label className="grid gap-2"><span className="text-[9px] font-black uppercase tracking-[.14em] text-[#756B63]">Diario CLP</span><input type="number" min="0" value={draft.dailyBudget} onChange={(event) => patch(ad.id, 'dailyBudget', event.target.value)} className="min-h-12 rounded-2xl bg-white px-4 text-sm font-bold outline-none" /></label><label className="grid gap-2"><span className="text-[9px] font-black uppercase tracking-[.14em] text-[#756B63]">Total CLP</span><input type="number" min="0" value={draft.lifetimeBudget} onChange={(event) => patch(ad.id, 'lifetimeBudget', event.target.value)} className="min-h-12 rounded-2xl bg-white px-4 text-sm font-bold outline-none" /></label></div>
          <button type="button" onClick={() => void save(ad)} disabled={saving === ad.id} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#171820] px-5 text-sm font-black text-[#F8F0E9] disabled:opacity-45">{saving === ad.id ? <Loader2 className="h-4 w-4 animate-spin" /> : draft.status === 'ACTIVE' ? <PlayCircle className="h-4 w-4 text-[#CCB196]" /> : <PauseCircle className="h-4 w-4 text-[#CCB196]" />}<Save className="h-4 w-4" /> Guardar configuración</button></div> : null}
        </article>;
      })}</div> : null}
      {!loading && !filtered.length ? <div className="mt-6 grid min-h-64 place-items-center rounded-[2rem] bg-[#F8F0E9] text-center"><div><Settings2 className="mx-auto h-8 w-8 text-[#B6906C]" /><h3 className="mt-3 text-xl font-black">No hay anuncios para configurar</h3><p className="mt-2 text-sm text-[#756B63]">Conecta Meta o cambia la búsqueda.</p></div></div> : null}
    </main>
  );
}
