'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Download,
  Loader2,
  Mail,
  Plus,
  Send,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader } from '@/components/admin/ui';

type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';

interface Campaign {
  id: string;
  subject: string;
  body_md: string;
  preview_text: string | null;
  status: CampaignStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  sent_count: number;
  failed_count: number;
  total_recipients: number;
  last_error: string | null;
  created_at: string;
}

interface Subscriber {
  email: string;
  name: string | null;
  status: string;
  source: string | null;
  created_at: string;
  last_sent_at: string | null;
}

interface SubscribersCounts {
  total: number;
  confirmed: number;
  unsubscribed: number;
}

type Tab = 'campañas' | 'suscriptores' | 'nueva';

const STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: 'Borrador',
  scheduled: 'Programada',
  sending: 'Enviando…',
  sent: 'Enviada',
  failed: 'Falló',
};

const STATUS_COLOR: Record<CampaignStatus, string> = {
  draft: 'bg-neutral-800 text-neutral-300 border-neutral-700',
  scheduled: 'bg-amber-500/10 text-amber-300 border-amber-500/40',
  sending: 'bg-blue-500/10 text-blue-300 border-blue-500/40',
  sent: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40',
  failed: 'bg-red-500/10 text-red-300 border-red-500/40',
};

const PRESET_TEMPLATES: Array<{ key: string; label: string; subject: string; body: string }> = [
  {
    key: 'tip',
    label: 'Tip de construcción',
    subject: 'Tip Fabrick: cómo elegir la viga adecuada',
    body: `# Tip de la semana\n\nEn esta entrega te enseñamos a **elegir la viga adecuada** para tu proyecto.\n\n## Pasos\n1. Mide la luz (distancia entre apoyos).\n2. Calcula la carga aproximada por m².\n3. Consulta la tabla de SCL recomendados.\n\n> Consejo Fabrick: ante la duda, sobredimensiona un 15%.\n\n— El equipo de Soluciones Fabrick`,
  },
  {
    key: 'guia',
    label: 'Guía paso a paso',
    subject: 'Guía Fabrick: instalación de planchas OSB',
    body: `# Instalación de OSB\n\nUna guía rápida con los **5 pasos clave** para que las planchas queden firmes y duraderas.\n\n## Materiales\n- OSB 11.1mm\n- Tornillos autoperforantes\n- Junta de dilatación\n\n## Procedimiento\n1. Limpia la estructura.\n2. Marca los apoyos.\n3. Atornilla cada 20cm en bordes y 30cm al centro.\n4. Deja 3mm entre planchas.\n5. Sella con cinta especial.\n\n¿Dudas? Responde este correo y te ayudamos.`,
  },
  {
    key: 'novedades',
    label: 'Novedades del mes',
    subject: 'Novedades Fabrick: nuevos kits y promos',
    body: `# Novedades de este mes\n\nEsto es lo nuevo en Fabrick:\n\n- 🆕 **Kit deck terraza** con OSB pre-cortado\n- 🛠️ Servicio de **diseño 3D** desde la web\n- 🎁 10% off pintura asfáltica usando código FABRICK10\n\nGracias por leer.`,
  },
];

export default function NewsletterPage() {
  const [tab, setTab] = useState<Tab>('campañas');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [counts, setCounts] = useState<SubscribersCounts>({ total: 0, confirmed: 0, unsubscribed: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // form
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [body, setBody] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // alta manual
  const [manualEmail, setManualEmail] = useState('');
  const [manualName, setManualName] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, s] = await Promise.all([
        fetch('/api/admin/newsletter/campaigns').then((r) => r.json()),
        fetch('/api/admin/newsletter/subscribers').then((r) => r.json()),
      ]);
      if (Array.isArray(c?.campaigns)) setCampaigns(c.campaigns as Campaign[]);
      if (Array.isArray(s?.subscribers)) setSubscribers(s.subscribers as Subscriber[]);
      if (s?.counts) setCounts(s.counts as SubscribersCounts);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch('/api/admin/newsletter/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          body_md: body.trim(),
          preview_text: previewText.trim() || null,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Error');
      setInfo(scheduledAt ? 'Campaña programada.' : 'Borrador guardado.');
      setSubject('');
      setPreviewText('');
      setBody('');
      setScheduledAt('');
      await refresh();
      setTab('campañas');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendNow(id: string) {
    if (!confirm('¿Enviar ahora a todos los suscriptores confirmados?')) return;
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/admin/newsletter/campaigns/${id}`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Error');
      const r = json.result ?? {};
      setInfo(`Envío completo. Enviados: ${r.sent ?? 0} · Fallos: ${r.failed ?? 0} · Saltados: ${r.skipped ?? 0}`);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Borrar esta campaña?')) return;
    try {
      const res = await fetch(`/api/admin/newsletter/campaigns/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error ?? `HTTP ${res.status}`);
      }
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleManualAdd(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/newsletter/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: manualEmail.trim(), name: manualName.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Error');
      setInfo(json.created ? 'Suscriptor agregado.' : 'Ya estaba suscrito.');
      setManualEmail('');
      setManualName('');
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function applyTemplate(key: string) {
    const t = PRESET_TEMPLATES.find((x) => x.key === key);
    if (!t) return;
    setSubject(t.subject);
    setBody(t.body);
  }

  const recentCampaigns = useMemo(() => campaigns.slice(0, 50), [campaigns]);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Comunicación"
        title="Boletín · Soluciones Fabrick"
        description="Envía guías de construcción a tus suscriptores. Programa campañas o envíalas al instante."
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {(['campañas', 'suscriptores', 'nueva'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm border transition-colors capitalize ${
              tab === t
                ? 'bg-amber-500 border-amber-400 text-neutral-950 font-semibold'
                : 'border-neutral-800 text-neutral-300 hover:border-neutral-600'
            }`}
          >
            {t === 'nueva' ? 'Nueva campaña' : t}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void refresh()}
          className="ml-auto text-xs text-neutral-400 hover:text-neutral-200 px-3 py-1.5 rounded-full border border-neutral-800"
          disabled={loading}
        >
          {loading ? 'Cargando…' : 'Refrescar'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {info && (
        <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {info}
        </div>
      )}

      {tab === 'campañas' && (
        <AdminCard className="space-y-4">
          {recentCampaigns.length === 0 && (
            <p className="text-sm text-neutral-400">Sin campañas todavía. Ve a “Nueva campaña” para crear la primera.</p>
          )}
          {recentCampaigns.map((c) => (
            <div key={c.id} className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-neutral-100 truncate">{c.subject}</h3>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_COLOR[c.status]}`}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    Creada {new Date(c.created_at).toLocaleString('es-CL')}
                    {c.scheduled_at && c.status === 'scheduled' && (
                      <> · <CalendarClock className="inline h-3 w-3 -mt-0.5" /> Programada para {new Date(c.scheduled_at).toLocaleString('es-CL')}</>
                    )}
                    {c.sent_at && c.status === 'sent' && <> · Enviada {new Date(c.sent_at).toLocaleString('es-CL')}</>}
                  </p>
                  {c.status === 'sent' && (
                    <p className="mt-1 text-xs text-neutral-400">
                      ✅ {c.sent_count} entregados · ❌ {c.failed_count} fallidos · 👥 {c.total_recipients} contactos
                    </p>
                  )}
                  {c.last_error && <p className="mt-1 text-xs text-red-400">{c.last_error}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {c.status !== 'sent' && c.status !== 'sending' && (
                    <button
                      type="button"
                      onClick={() => void handleSendNow(c.id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-neutral-950 px-3 py-1.5 text-xs font-semibold"
                      title="Enviar ahora a todos los suscriptores confirmados"
                    >
                      <Send className="h-3.5 w-3.5" /> Enviar ahora
                    </button>
                  )}
                  {c.status !== 'sent' && c.status !== 'sending' && (
                    <button
                      type="button"
                      onClick={() => void handleDelete(c.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-700 hover:border-red-500/60 hover:text-red-300 text-neutral-400 px-3 py-1.5 text-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Borrar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </AdminCard>
      )}

      {tab === 'suscriptores' && (
        <div className="grid gap-6 md:grid-cols-3">
          <AdminCard className="md:col-span-1 space-y-3">
            <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-400" /> Estado
            </h3>
            <Stat label="Total" value={counts.total} />
            <Stat label="Confirmados" value={counts.confirmed} accent="text-emerald-300" />
            <Stat label="Dados de baja" value={counts.unsubscribed} accent="text-neutral-500" />

            <a
              href="/api/admin/newsletter/subscribers?format=csv"
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-neutral-700 hover:border-neutral-500 px-3 py-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" /> Exportar CSV
            </a>

            <form onSubmit={handleManualAdd} className="mt-4 space-y-2 border-t border-neutral-800 pt-4">
              <h4 className="text-xs font-semibold text-neutral-300 flex items-center gap-2">
                <UserPlus className="h-3.5 w-3.5" /> Alta manual
              </h4>
              <input
                type="email"
                required
                placeholder="email@ejemplo.cl"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Nombre (opcional)"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-neutral-950 px-3 py-2 text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar
              </button>
            </form>
          </AdminCard>

          <AdminCard className="md:col-span-2">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-neutral-500 border-b border-neutral-800">
                <tr>
                  <th className="text-left py-2 px-2">Email</th>
                  <th className="text-left py-2 px-2">Nombre</th>
                  <th className="text-left py-2 px-2">Estado</th>
                  <th className="text-left py-2 px-2">Origen</th>
                  <th className="text-left py-2 px-2">Alta</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-neutral-500">
                      Aún no hay suscriptores. Cuando un cliente se registre se inscribirá automáticamente.
                    </td>
                  </tr>
                )}
                {subscribers.slice(0, 200).map((s) => (
                  <tr key={s.email} className="border-b border-neutral-900/60">
                    <td className="py-2 px-2 text-neutral-200 truncate max-w-[260px]">{s.email}</td>
                    <td className="py-2 px-2 text-neutral-400">{s.name ?? '—'}</td>
                    <td className="py-2 px-2">
                      {s.status === 'confirmed' ? (
                        <span className="text-emerald-300 inline-flex items-center gap-1 text-xs"><CheckCircle2 className="h-3 w-3" /> Activo</span>
                      ) : (
                        <span className="text-neutral-500 inline-flex items-center gap-1 text-xs"><XCircle className="h-3 w-3" /> {s.status}</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-neutral-500 text-xs">{s.source ?? '—'}</td>
                    <td className="py-2 px-2 text-neutral-500 text-xs">{new Date(s.created_at).toLocaleDateString('es-CL')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminCard>
        </div>
      )}

      {tab === 'nueva' && (
        <form onSubmit={handleCreate} className="grid gap-6 md:grid-cols-3">
          <AdminCard className="md:col-span-2 space-y-4">
            <div>
              <label className="text-xs uppercase text-neutral-400 tracking-wide">Asunto *</label>
              <input
                required
                maxLength={200}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Tip de la semana: cómo elegir la viga"
                className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs uppercase text-neutral-400 tracking-wide">Texto preview (opcional)</label>
              <input
                maxLength={200}
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="Frase corta que aparece en la bandeja antes de abrir"
                className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs uppercase text-neutral-400 tracking-wide">Cuerpo (Markdown) *</label>
              <textarea
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={14}
                placeholder="# Título\n\nPárrafo con **negrita** y [enlaces](https://...).\n\n- Lista\n- De\n- Tips"
                className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-sm"
              />
              <p className="mt-1 text-xs text-neutral-500">Soporta encabezados, listas, **negrita**, *cursiva*, `código`, &gt; citas y enlaces.</p>
            </div>
            <div>
              <label className="text-xs uppercase text-neutral-400 tracking-wide">Programar envío (opcional)</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Si dejas vacío se guarda como borrador. El cron `/api/cron/newsletter` corre 1 vez al día (10:00 CL) y envía las
                programadas que ya pasaron. Puedes forzar el envío manual desde el botón "Enviar ahora".
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
              <p className="text-xs text-neutral-500">{counts.confirmed} suscriptores activos recibirán este boletín.</p>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-amber-500 hover:bg-amber-400 text-neutral-950 px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {scheduledAt ? 'Programar' : 'Guardar borrador'}
              </button>
            </div>
          </AdminCard>

          <AdminCard>
            <h3 className="text-sm font-semibold text-neutral-200 mb-3">Plantillas rápidas</h3>
            <div className="space-y-2">
              {PRESET_TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => applyTemplate(t.key)}
                  className="w-full text-left rounded-xl border border-neutral-800 hover:border-amber-500/40 bg-neutral-950/60 px-3 py-2.5 transition-colors"
                >
                  <p className="text-sm font-medium text-neutral-200">{t.label}</p>
                  <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{t.subject}</p>
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-neutral-500">
              Cargar una plantilla sobreescribe asunto y cuerpo del editor.
            </p>
          </AdminCard>
        </form>
      )}
    </AdminPage>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="flex items-baseline justify-between rounded-lg border border-neutral-800 px-3 py-2">
      <span className="text-xs uppercase tracking-wide text-neutral-500">{label}</span>
      <span className={`text-2xl font-bold tabular-nums ${accent ?? 'text-neutral-100'}`}>{value}</span>
    </div>
  );
}
