'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
  CircleDot, Copy, CreditCard, Database, ExternalLink, Globe,
  Loader2, Lock, Mail, Megaphone, Package, RefreshCw, Rocket,
  Server, ShieldCheck, Truck, XCircle, Zap,
  type LucideIcon,
} from 'lucide-react';
import { AdminPage, AdminPageHeader } from '@/components/admin/ui';

// ── Types (mirror API) ────────────────────────────────────────────────────────
interface EnvVar { key: string; set: boolean; preview?: string }
interface ServiceGroup {
  id: string; name: string; description: string;
  required: EnvVar[]; optional: EnvVar[];
  status: 'ok' | 'partial' | 'missing' | 'unconfigured';
  score: number;
}
interface StatusResponse {
  groups: ServiceGroup[];
  totalVars: number; setVars: number;
  okGroups: number; totalGroups: number;
}
interface TestResult { ok: boolean; message: string }

// ── Config ────────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, LucideIcon> = {
  db: Database,
  admin: Lock,
  mercadopago: CreditCard,
  email: Mail,
  saas: Rocket,
  facturacion: Package,
  envios: Truck,
  publicidad: Megaphone,
};

const TESTABLE = new Set(['db', 'mercadopago', 'email', 'admin', 'saas']);

const VERCEL_LINKS: Record<string, string> = {
  db: 'https://vercel.com/dashboard/environment-variables',
  admin: 'https://vercel.com/dashboard/environment-variables',
  mercadopago: 'https://www.mercadopago.cl/settings/account/credentials',
  email: 'https://resend.com/api-keys',
  saas: 'https://vercel.com/dashboard/environment-variables',
  facturacion: 'https://vercel.com/dashboard/environment-variables',
  envios: 'https://vercel.com/dashboard/environment-variables',
  publicidad: 'https://vercel.com/dashboard/environment-variables',
};

const STATUS_CONFIG = {
  ok: { label: 'Activo', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400', icon: CheckCircle2 },
  partial: { label: 'Parcial', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', dot: 'bg-yellow-400', icon: AlertTriangle },
  missing: { label: 'Falta clave', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', dot: 'bg-red-400', icon: XCircle },
  unconfigured: { label: 'Opcional', color: 'text-zinc-400', bg: 'bg-zinc-800/40 border-zinc-700/30', dot: 'bg-zinc-500', icon: CircleDot },
};

// Key-level hints shown below certain env vars
const KEY_HINTS: Record<string, string> = {
  ADMIN_SESSION_SECRET: 'Genera con: openssl rand -base64 48',
  PLATFORM_ADMIN_SECRET: 'Genera con: openssl rand -base64 32',
  CRON_SECRET: 'Genera con: openssl rand -hex 24',
  PLATFORM_MP_WEBHOOK_SECRET: 'Debe coincidir con lo registrado en MercadoPago',
  RESEND_API_KEY: 'Obtén tu clave en resend.com → API Keys',
  VERCEL_API_TOKEN: 'Cuenta Vercel → Settings → Tokens',
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function ActivarPage() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/plataforma/status', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json() as StatusResponse);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchStatus(); }, [fetchStatus]);

  async function handleTest(serviceId: string) {
    setTesting(serviceId);
    setTestResults((prev) => ({ ...prev, [serviceId]: { ok: false, message: 'Probando…' } }));
    try {
      const res = await fetch('/api/admin/plataforma/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceId }),
      });
      const json = await res.json() as TestResult;
      setTestResults((prev) => ({ ...prev, [serviceId]: json }));
    } catch (e) {
      setTestResults((prev) => ({ ...prev, [serviceId]: { ok: false, message: (e as Error).message } }));
    } finally {
      setTesting(null);
    }
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const overallPct = data ? Math.round((data.setVars / Math.max(data.totalVars, 1)) * 100) : 0;
  const healthColor = overallPct >= 80 ? 'text-emerald-400' : overallPct >= 50 ? 'text-yellow-400' : 'text-red-400';
  const barColor = overallPct >= 80 ? 'bg-emerald-500' : overallPct >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <AdminPage>
      <AdminPageHeader
        title="Activación de plataforma"
        description="Configura y verifica cada servicio desde aquí. Las claves viven en las variables de entorno de Vercel."
        actions={
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Actualizar
          </button>
        }
      />

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          <XCircle className="h-5 w-5 flex-shrink-0" />
          Error al cargar estado: {error}
        </div>
      )}

      {/* ── Health Overview ── */}
      {data && (
        <div className="mb-8 rounded-2xl border border-zinc-700/50 bg-zinc-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800">
                <Activity className="h-5 w-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200">Estado general de la plataforma</p>
                <p className="text-xs text-zinc-500">{data.setVars} de {data.totalVars} variables configuradas</p>
              </div>
            </div>
            <span className={`text-3xl font-bold tabular-nums ${healthColor}`}>{overallPct}%</span>
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${overallPct}%` }}
            />
          </div>

          {/* Quick stats */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Activos', value: data.groups.filter(g => g.status === 'ok').length, color: 'text-emerald-400' },
              { label: 'Parciales', value: data.groups.filter(g => g.status === 'partial').length, color: 'text-yellow-400' },
              { label: 'Sin clave', value: data.groups.filter(g => g.status === 'missing').length, color: 'text-red-400' },
              { label: 'Opcionales', value: data.groups.filter(g => g.status === 'unconfigured').length, color: 'text-zinc-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-800/40 px-4 py-3 text-center">
                <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
                <p className="text-xs text-zinc-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Service Cards ── */}
      {loading && !data && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      )}

      {data && (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.groups.map((group) => {
            const Icon = ICON_MAP[group.id] ?? Server;
            const cfg = STATUS_CONFIG[group.status];
            const StatusIcon = cfg.icon;
            const isExpanded = expanded === group.id;
            const testResult = testResults[group.id];
            const isTesting = testing === group.id;
            const isTestable = TESTABLE.has(group.id);
            const allVars = [...group.required, ...group.optional];

            return (
              <div
                key={group.id}
                className="overflow-hidden rounded-2xl border border-zinc-700/50 bg-zinc-900 transition-all"
              >
                {/* Card header */}
                <div className="flex items-start justify-between p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-800">
                      <Icon className="h-5 w-5 text-zinc-300" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-zinc-100">{group.name}</h3>
                        <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">{group.description}</p>
                      {/* Mini progress */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className={`h-full rounded-full ${group.score >= 70 ? 'bg-emerald-500' : group.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${group.score}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-500">{group.score}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle expand */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : group.id)}
                    className="flex-shrink-0 rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>

                {/* Test result banner */}
                {testResult && (
                  <div className={`mx-5 mb-4 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
                    isTesting
                      ? 'border-zinc-700 bg-zinc-800/60 text-zinc-400'
                      : testResult.ok
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                      : 'border-red-500/20 bg-red-500/10 text-red-300'
                  }`}>
                    {isTesting
                      ? <Loader2 className="mt-0.5 h-4 w-4 flex-shrink-0 animate-spin" />
                      : testResult.ok
                      ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      : <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />}
                    <span>{testResult.message}</span>
                  </div>
                )}

                {/* Action row */}
                <div className="flex flex-wrap items-center gap-2 px-5 pb-4">
                  {isTestable && (
                    <button
                      onClick={() => void handleTest(group.id)}
                      disabled={isTesting}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
                    >
                      {isTesting
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Zap className="h-3.5 w-3.5" />}
                      Probar conexión
                    </button>
                  )}
                  {VERCEL_LINKS[group.id] && (
                    <a
                      href={VERCEL_LINKS[group.id]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Configurar
                    </a>
                  )}
                </div>

                {/* Expanded: var list */}
                {isExpanded && (
                  <div className="border-t border-zinc-800 px-5 py-4">
                    {group.required.length > 0 && (
                      <div className="mb-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Requeridas</p>
                        <div className="space-y-2">
                          {group.required.map((v) => (
                            <VarRow key={v.key} v={v} hint={KEY_HINTS[v.key]} onCopy={copyKey} copied={copied} />
                          ))}
                        </div>
                      </div>
                    )}
                    {group.optional.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Opcionales</p>
                        <div className="space-y-2">
                          {group.optional.map((v) => (
                            <VarRow key={v.key} v={v} hint={KEY_HINTS[v.key]} onCopy={copyKey} copied={copied} />
                          ))}
                        </div>
                      </div>
                    )}
                    {allVars.length === 0 && (
                      <p className="text-xs text-zinc-500">Sin variables de entorno para este servicio.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Quick-actions bottom bar ── */}
      <div className="mt-8 rounded-2xl border border-zinc-700/50 bg-zinc-900 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800">
            <ShieldCheck className="h-4 w-4 text-zinc-400" />
          </div>
          <h3 className="font-semibold text-zinc-200">Acciones rápidas</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Ejecutar migración SQL', href: '/admin/sql', icon: Database, color: 'bg-violet-600 hover:bg-violet-500' },
            { label: 'Gestionar integraciones', href: '/admin/integraciones', icon: Globe, color: 'bg-zinc-700 hover:bg-zinc-600' },
            { label: 'Ver clientes SaaS', href: '/admin/saas', icon: Rocket, color: 'bg-zinc-700 hover:bg-zinc-600' },
            { label: 'Estado de servicios', href: '/admin/estado', icon: Activity, color: 'bg-zinc-700 hover:bg-zinc-600' },
          ].map(({ label, href, icon: Icon, color }) => (
            <a
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-white transition ${color}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* ── Vercel env vars guide ── */}
      <div className="mt-4 rounded-2xl border border-zinc-700/50 bg-zinc-900/50 p-6">
        <div className="mb-3 flex items-center gap-3">
          <Server className="h-4 w-4 text-zinc-500" />
          <h3 className="text-sm font-semibold text-zinc-300">Cómo agregar variables de entorno en Vercel</h3>
        </div>
        <ol className="space-y-2 text-sm text-zinc-400">
          {[
            'Ve a vercel.com → tu proyecto → Settings → Environment Variables',
            'Haz clic en "Add New" e ingresa el nombre y valor de la variable',
            'Selecciona los entornos donde aplica: Production, Preview, Development',
            'Guarda y luego haz redeploy del proyecto para que los cambios tengan efecto',
            'Regresa aquí y presiona "Actualizar" para ver el nuevo estado',
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-500">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </AdminPage>
  );
}

// ── Sub-component: one env var row ────────────────────────────────────────────
function VarRow({
  v, hint, onCopy, copied,
}: {
  v: EnvVar;
  hint?: string;
  onCopy: (k: string) => void;
  copied: string | null;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-800/40 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {v.set
            ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
            : <XCircle className="h-3.5 w-3.5 flex-shrink-0 text-red-400" />}
          <span className="truncate font-mono text-xs text-zinc-300">{v.key}</span>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {v.set && v.preview && (
            <span className="rounded bg-zinc-700/60 px-1.5 py-0.5 font-mono text-xs text-zinc-400">
              {v.preview}
            </span>
          )}
          {!v.set && (
            <button
              onClick={() => onCopy(v.key)}
              title="Copiar nombre de la variable"
              className="rounded p-1 text-zinc-600 transition hover:text-zinc-300"
            >
              {copied === v.key ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>
      {hint && !v.set && (
        <p className="mt-1.5 pl-5 text-xs text-zinc-500">{hint}</p>
      )}
    </div>
  );
}
