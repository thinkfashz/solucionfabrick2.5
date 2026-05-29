'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Globe,
  Inbox,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  Shield,
  Zap,
} from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader } from '@/components/admin/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'resumen' | 'bandeja' | 'envio' | 'config';

interface EmailRow {
  id: string;
  resend_id: string | null;
  presupuesto_id: string | null;
  destinatario: string;
  asunto: string;
  estado: string;
  enviado_at: string;
}

interface StatsResponse {
  ok: boolean;
  totals: { enviado: number; entregado: number; abierto: number; rebotado: number; spam: number };
  recent: EmailRow[];
  deliveryRate: number;
  openRate: number;
  bounceRate: number;
  key_configured: boolean;
  error?: string;
}

interface DomainRow {
  id: string;
  name: string;
  status: string;
  region: string;
  created_at: string;
}

interface DomainsResponse {
  ok: boolean;
  domains: DomainRow[];
  error?: string;
}

interface SendResponse {
  ok: boolean;
  id?: string | null;
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ESTADO_STYLES: Record<string, string> = {
  enviado: 'border-zinc-600 text-zinc-300 bg-zinc-900/60',
  entregado: 'border-emerald-600/50 text-emerald-300 bg-emerald-900/20',
  abierto: 'border-blue-600/50 text-blue-300 bg-blue-900/20',
  rebotado: 'border-red-600/50 text-red-300 bg-red-900/20',
  spam: 'border-orange-600/50 text-orange-300 bg-orange-900/20',
};

function estadoBadge(estado: string) {
  const cls = ESTADO_STYLES[estado] ?? 'border-zinc-700 text-zinc-400 bg-zinc-900/40';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cls}`}>
      {estado}
    </span>
  );
}

function fmtDate(iso: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function RateBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="font-semibold text-white">{value.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/5">
        <div className={`h-1.5 rounded-full ${color} transition-all duration-700`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

// ─── Tab: Resumen ─────────────────────────────────────────────────────────────

function TabResumen({ stats }: { stats: StatsResponse }) {
  const { totals } = stats;
  const statCards = [
    { label: 'Enviados', value: totals.enviado + totals.entregado + totals.abierto + totals.rebotado + totals.spam, icon: Send, color: 'text-zinc-400' },
    { label: 'Entregados', value: totals.entregado + totals.abierto, icon: CheckCircle2, color: 'text-emerald-400' },
    { label: 'Abiertos', value: totals.abierto, icon: Mail, color: 'text-blue-400' },
    { label: 'Rebotados', value: totals.rebotado, icon: AlertCircle, color: 'text-red-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <AdminCard key={label} className="p-4 text-center">
            <Icon className={`mx-auto mb-2 h-5 w-5 ${color}`} />
            <div className="text-2xl font-black tabular-nums text-white">{value.toLocaleString('es-CL')}</div>
            <div className="mt-0.5 text-[11px] text-zinc-500">{label}</div>
          </AdminCard>
        ))}
      </div>

      {/* Rate bars */}
      <AdminCard className="p-5 space-y-4">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600 mb-3">Tasas de rendimiento</p>
        <RateBar label="Tasa de entrega" value={stats.deliveryRate} color="bg-emerald-500" />
        <RateBar label="Tasa de apertura" value={stats.openRate} color="bg-blue-500" />
        <RateBar label="Tasa de rebote" value={stats.bounceRate} color="bg-red-500" />
      </AdminCard>

      {/* Recent table */}
      <AdminCard className="p-0 overflow-hidden">
        <div className="border-b border-white/8 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600">Últimos correos</p>
        </div>
        {stats.recent.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-zinc-600">
            <Inbox className="h-8 w-8" />
            <p className="text-sm">Sin correos registrados aún</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-zinc-600">
                  <th className="px-4 py-2.5 text-left font-semibold">Destinatario</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Asunto</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Estado</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.slice(0, 20).map((row) => (
                  <tr key={row.id} className="border-b border-white/4 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-2.5 text-zinc-300 font-mono text-xs">{row.destinatario || '—'}</td>
                    <td className="px-4 py-2.5 text-zinc-400 max-w-[200px] truncate">{row.asunto || '—'}</td>
                    <td className="px-4 py-2.5">{estadoBadge(row.estado)}</td>
                    <td className="px-4 py-2.5 text-zinc-500 text-xs whitespace-nowrap">{fmtDate(row.enviado_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}

// ─── Tab: Bandeja ─────────────────────────────────────────────────────────────

type DateRange = '7d' | '30d' | '90d' | 'all';

function TabBandeja({ emails }: { emails: EmailRow[] }) {
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const PER_PAGE = 20;

  const cutoff = (() => {
    const now = Date.now();
    if (dateRange === '7d') return now - 7 * 86_400_000;
    if (dateRange === '30d') return now - 30 * 86_400_000;
    if (dateRange === '90d') return now - 90 * 86_400_000;
    return 0;
  })();

  const filtered = emails.filter((r) => {
    if (estadoFilter !== 'todos' && r.estado !== estadoFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.destinatario.toLowerCase().includes(q) && !r.asunto.toLowerCase().includes(q)) return false;
    }
    if (cutoff && r.enviado_at) {
      const ts = new Date(r.enviado_at).getTime();
      if (ts < cutoff) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageRows = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  const statusPills = ['todos', 'enviado', 'entregado', 'abierto', 'rebotado', 'spam'];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <AdminCard className="p-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Buscar destinatario o asunto…"
            className="flex-1 rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/20 focus:bg-white/6"
          />
          <select
            value={dateRange}
            onChange={(e) => { setDateRange(e.target.value as DateRange); setPage(0); }}
            className="rounded-lg border border-white/8 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 outline-none"
          >
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
            <option value="all">Todo el historial</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {statusPills.map((s) => (
            <button
              key={s}
              onClick={() => { setEstadoFilter(s); setPage(0); }}
              className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                estadoFilter === s
                  ? 'border-amber-500 bg-amber-500 text-black'
                  : 'border-white/10 text-zinc-400 hover:border-white/20'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </AdminCard>

      {/* Table */}
      <AdminCard className="p-0 overflow-hidden">
        {pageRows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-zinc-600">
            <Inbox className="h-8 w-8" />
            <p className="text-sm">Sin resultados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-zinc-600">
                  <th className="px-4 py-2.5 text-left font-semibold">Destinatario</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Asunto</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Estado</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Fecha</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <Fragment key={row.id}>
                    <tr
                      className="border-b border-white/4 hover:bg-white/3 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                    >
                      <td className="px-4 py-2.5 text-zinc-300 font-mono text-xs">{row.destinatario || '—'}</td>
                      <td className="px-4 py-2.5 text-zinc-400 max-w-[200px] truncate">{row.asunto || '—'}</td>
                      <td className="px-4 py-2.5">{estadoBadge(row.estado)}</td>
                      <td className="px-4 py-2.5 text-zinc-500 text-xs whitespace-nowrap">{fmtDate(row.enviado_at)}</td>
                      <td className="px-4 py-2.5 text-zinc-600">
                        {expandedId === row.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </td>
                    </tr>
                    {expandedId === row.id && (
                      <tr className="bg-white/2 border-b border-white/4">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                            <div>
                              <span className="text-zinc-600">ID interno</span>
                              <p className="font-mono text-zinc-400 break-all">{row.id}</p>
                            </div>
                            {row.resend_id && (
                              <div>
                                <span className="text-zinc-600">Resend ID</span>
                                <p className="font-mono text-zinc-400 break-all">{row.resend_id}</p>
                              </div>
                            )}
                            {row.presupuesto_id && (
                              <div>
                                <span className="text-zinc-600">Presupuesto</span>
                                <a
                                  href={`/admin/presupuestos?id=${row.presupuesto_id}`}
                                  className="font-mono text-amber-400 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {row.presupuesto_id} →
                                </a>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/8 px-4 py-3">
            <span className="text-xs text-zinc-600">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} · pág. {page + 1} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded border border-white/8 px-3 py-1 text-xs text-zinc-400 hover:border-white/20 disabled:opacity-30"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded border border-white/8 px-3 py-1 text-xs text-zinc-400 hover:border-white/20 disabled:opacity-30"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </AdminCard>
    </div>
  );
}

// ─── Tab: Envío rápido ────────────────────────────────────────────────────────

function TabEnvio() {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [from, setFrom] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; id?: string | null; error?: string } | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/correo/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, html: htmlBody, from: from || undefined }),
      });
      const data = (await res.json()) as SendResponse;
      setResult(data);
    } catch (err) {
      setResult({ ok: false, error: (err as Error).message });
    } finally {
      setSending(false);
    }
  }

  const inputCls = 'w-full rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/20 focus:bg-white/6 transition-colors';

  return (
    <AdminCard className="p-5">
      <p className="mb-4 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600">Enviar correo único</p>
      <form onSubmit={handleSend} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wide text-zinc-500">Destinatario *</label>
            <input type="email" required value={to} onChange={(e) => setTo(e.target.value)} placeholder="cliente@empresa.com" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wide text-zinc-500">Remitente (opcional)</label>
            <input type="text" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Nombre <email@dominio.com>" className={inputCls} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wide text-zinc-500">Asunto *</label>
          <input type="text" required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Asunto del correo…" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] uppercase tracking-wide text-zinc-500">Cuerpo HTML *</label>
            <button
              type="button"
              onClick={() => setPreview((p) => !p)}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 underline transition-colors"
            >
              {preview ? 'Editar HTML' : 'Vista previa'}
            </button>
          </div>
          {preview ? (
            <iframe
              srcDoc={htmlBody || '<p style="font-family:sans-serif;color:#888;text-align:center;padding:40px">Vista previa vacía</p>'}
              sandbox=""
              className="h-64 w-full rounded-lg border border-white/8 bg-white"
              title="Email preview"
            />
          ) : (
            <textarea
              required
              value={htmlBody}
              onChange={(e) => setHtmlBody(e.target.value)}
              rows={10}
              placeholder="<p>Escribe el cuerpo del email en HTML...</p>"
              className={`${inputCls} font-mono text-xs resize-y`}
            />
          )}
        </div>

        {result && (
          <div className={`rounded-lg border px-4 py-3 text-sm ${result.ok ? 'border-emerald-500/30 bg-emerald-900/20 text-emerald-300' : 'border-red-500/30 bg-red-900/20 text-red-300'}`}>
            {result.ok ? (
              <span>✓ Enviado correctamente{result.id ? ` · ID: ${result.id}` : ''}</span>
            ) : (
              <span>✗ {result.error}</span>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={sending}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50 transition-colors"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {sending ? 'Enviando…' : 'Enviar correo'}
        </button>
      </form>
    </AdminCard>
  );
}

// ─── Tab: Config & Dominio ────────────────────────────────────────────────────

function TabConfig({ keyConfigured }: { keyConfigured: boolean }) {
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState('');

  const loadDomains = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/correo/domains');
      const data = (await res.json()) as DomainsResponse;
      if (data.ok) setDomains(data.domains);
      else setError(data.error ?? 'Error al cargar dominios');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDomains(); }, [loadDomains]);

  async function handleTestSend() {
    setTestSending(true);
    setTestResult('');
    try {
      const res = await fetch('/api/admin/integrations/test-resend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = (await res.json()) as { ok: boolean; error?: string };
      setTestResult(data.ok ? '✓ Email de prueba enviado a tu correo' : `✗ ${data.error ?? 'Error'}`);
    } catch (err) {
      setTestResult(`✗ ${(err as Error).message}`);
    } finally {
      setTestSending(false);
    }
  }

  const domainStatusStyle: Record<string, string> = {
    verified: 'border-emerald-600/50 text-emerald-300 bg-emerald-900/20',
    pending: 'border-yellow-600/50 text-yellow-300 bg-yellow-900/20',
    failed: 'border-red-600/50 text-red-300 bg-red-900/20',
  };

  return (
    <div className="space-y-5">
      {/* Credential status */}
      <AdminCard className="p-5">
        <p className="mb-4 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600">Credenciales Resend</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {keyConfigured ? (
              <Shield className="h-5 w-5 text-emerald-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-400" />
            )}
            <div>
              <p className="text-sm font-semibold text-white">
                {keyConfigured ? 'API Key configurada' : 'API Key no configurada'}
              </p>
              <p className="text-xs text-zinc-500">
                {keyConfigured
                  ? 'Las credenciales están activas en Integraciones'
                  : 'Ve a Integraciones para añadir tu API Key de Resend'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href="/admin/integraciones"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:border-white/20 hover:text-white transition-colors"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Gestionar credenciales
              <ExternalLink className="h-3 w-3" />
            </a>
            <button
              onClick={handleTestSend}
              disabled={testSending || !keyConfigured}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-300 hover:bg-amber-500/20 disabled:opacity-40 transition-colors"
            >
              {testSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              Enviar prueba
            </button>
          </div>
        </div>
        {testResult && (
          <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${testResult.startsWith('✓') ? 'border-emerald-500/30 bg-emerald-900/20 text-emerald-300' : 'border-red-500/30 bg-red-900/20 text-red-300'}`}>
            {testResult}
          </div>
        )}
      </AdminCard>

      {/* Domains */}
      <AdminCard className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600">Dominios verificados</p>
          <button
            onClick={loadDomains}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Actualizar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-zinc-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Cargando dominios…</span>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-500/20 bg-red-900/10 px-4 py-3 text-sm text-red-400">{error}</div>
        ) : domains.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-zinc-600">
            <Globe className="h-7 w-7" />
            <p className="text-sm">Sin dominios configurados</p>
            <a href="https://resend.com/domains" target="_blank" rel="noreferrer" className="text-xs text-amber-400 hover:underline">
              Añadir dominio en Resend →
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {domains.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-white/6 bg-white/2 px-4 py-3">
                <div>
                  <p className="font-mono text-sm text-white">{d.name}</p>
                  <p className="text-xs text-zinc-600">{d.region || 'us-east-1'} · {fmtDate(d.created_at)}</p>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${domainStatusStyle[d.status] ?? 'border-zinc-600 text-zinc-400'}`}>
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </AdminCard>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CorreoPage() {
  const [tab, setTab] = useState<Tab>('resumen');
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState('');

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setStatsError('');
    try {
      const res = await fetch('/api/admin/correo/stats');
      const data = (await res.json()) as StatsResponse;
      if (data.ok) setStats(data);
      else setStatsError(data.error ?? 'Error al cargar estadísticas');
    } catch (err) {
      setStatsError((err as Error).message);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => { void loadStats(); }, [loadStats]);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'bandeja', label: 'Bandeja' },
    { id: 'envio', label: 'Envío rápido' },
    { id: 'config', label: 'Dominio & Config' },
  ];

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Comunicaciones"
        title="Correo · Resend"
        description="Bandeja de salida, estadísticas y configuración del proveedor Resend"
        icon={Mail}
        actions={
          <button
            onClick={loadStats}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-400 hover:border-white/20 hover:text-zinc-200 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingStats ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${
              tab === id
                ? 'border-amber-500 bg-amber-500 text-black font-semibold'
                : 'border-white/10 text-zinc-300 hover:border-white/20'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loadingStats && tab !== 'envio' && tab !== 'config' ? (
        <div className="flex items-center justify-center py-20 text-zinc-600">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : statsError && tab !== 'envio' && tab !== 'config' ? (
        <AdminCard className="p-5">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{statsError}</p>
          </div>
        </AdminCard>
      ) : (
        <>
          {tab === 'resumen' && stats && <TabResumen stats={stats} />}
          {tab === 'bandeja' && stats && <TabBandeja emails={stats.recent} />}
          {tab === 'envio' && <TabEnvio />}
          {tab === 'config' && <TabConfig keyConfigured={stats?.key_configured ?? false} />}
        </>
      )}
    </AdminPage>
  );
}
