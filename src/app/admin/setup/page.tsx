'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

type TableStatus = {
  name: string;
  exists: boolean;
  error?: string;
};

type SetupResponse = {
  connected: boolean;
  missingEnv?: string[];
  tables: TableStatus[];
  sql: string | null;
  dashboardUrl: string | null;
};

type StepResult = { ok: boolean; error?: string };

type SetupTablesResponse = {
  ok: boolean;
  summary?: { total: number; ok: number; failed: number };
  results?: Record<string, StepResult>;
  error?: string;
  code?: string;
  missing?: string[];
  hint?: string;
  keySource?: 'admin';
};

type SessionState = 'checking' | 'ok' | 'unauthenticated' | 'forbidden' | 'error';

export default function AdminSetupPage() {
  const [sessionState, setSessionState] = useState<SessionState>('checking');
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [setup, setSetup] = useState<SetupResponse | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creationArmed, setCreationArmed] = useState(false);
  const [createReport, setCreateReport] = useState<SetupTablesResponse | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const checkSession = useCallback(async () => {
    setSessionState('checking');
    try {
      const response = await fetch('/api/admin/me', { cache: 'no-store' });
      if (response.status === 401) {
        setSessionState('unauthenticated');
        return;
      }
      if (!response.ok) {
        setSessionState('error');
        return;
      }
      const data = await response.json();
      setSessionEmail(typeof data?.email === 'string' ? data.email : null);
      setSessionState(data?.rol === 'superadmin' ? 'ok' : 'forbidden');
    } catch {
      setSessionState('error');
    }
  }, []);

  const checkTables = useCallback(async () => {
    setLoading(true);
    setSetupError(null);
    try {
      const response = await fetch('/api/admin/setup', { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSetup(null);
        setSetupError(typeof body?.error === 'string' ? body.error : `HTTP ${response.status}`);
        return;
      }
      setSetup(body as SetupResponse);
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : 'Error de red.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkSession();
    void checkTables();
  }, [checkSession, checkTables]);

  const tables = setup?.tables ?? [];
  const readyCount = tables.filter((table) => table.exists).length;
  const missingCount = Math.max(0, tables.length - readyCount);
  const progress = tables.length ? Math.round((readyCount / tables.length) * 100) : 0;
  const allReady = tables.length > 0 && readyCount === tables.length;
  const missingEnv = useMemo(() => setup?.missingEnv ?? [], [setup]);

  async function verify() {
    await Promise.all([checkSession(), checkTables()]);
  }

  async function createTables() {
    if (!creationArmed || creating) return;
    setCreating(true);
    setCreateError(null);
    setCreateReport(null);
    try {
      const response = await fetch('/api/admin/setup-tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const body = await response.json().catch(() => ({})) as SetupTablesResponse;
      if (!response.ok) {
        const missing = Array.isArray(body.missing) && body.missing.length ? ` Faltan: ${body.missing.join(', ')}.` : '';
        setCreateError(`${body.error ?? `HTTP ${response.status}`}${missing}`);
        if (body.hint) setCreateError((current) => `${current ?? ''} ${body.hint}`.trim());
      } else {
        setCreateReport(body);
        if (body.ok) setCreationArmed(false);
      }
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Error de red.');
    } finally {
      setCreating(false);
      await checkTables();
    }
  }

  async function copySql() {
    if (!setup?.sql) return;
    try {
      await navigator.clipboard.writeText(setup.sql);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Sistema · Bootstrap"
        title="Configuración inicial"
        description="Verifica la conexión de InsForge y el esquema requerido por Fabrick. Las operaciones de bootstrap están reservadas a Root/superadmin."
        icon={Wrench}
        actions={
          <button
            type="button"
            onClick={() => void verify()}
            disabled={loading || sessionState === 'checking'}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white transition hover:bg-[#2a2823] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Verificando…' : 'Verificar entorno'}
          </button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Sesión" value={sessionState === 'ok' ? 'Root' : sessionState === 'checking' ? '…' : 'Bloqueada'} icon={ShieldCheck} accent={sessionState === 'ok' ? 'emerald' : sessionState === 'checking' ? undefined : 'rose'} />
        <AdminStat label="Tablas" value={tables.length ? `${readyCount}/${tables.length}` : '—'} icon={Database} />
        <AdminStat label="Progreso" value={`${progress}%`} icon={Sparkles} accent={allReady ? 'emerald' : undefined} />
        <AdminStat label="Pendientes" value={tables.length ? missingCount : '—'} icon={AlertTriangle} accent={missingCount > 0 ? 'rose' : 'emerald'} />
      </section>

      {sessionState !== 'ok' && sessionState !== 'checking' ? (
        <div className="rounded-xl border border-rose-600/15 bg-rose-500/8 p-4 text-sm text-rose-900">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <strong className="font-black">Acceso restringido.</strong>
              <p className="mt-1">Esta pantalla solo está disponible para Root/superadmin.</p>
            </div>
          </div>
        </div>
      ) : null}

      {setupError ? <div className="rounded-xl border border-rose-600/15 bg-rose-500/8 px-4 py-3 text-sm text-rose-900">{setupError}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[.85fr_1.15fr]">
        <AdminCard>
          <div className="flex items-start justify-between gap-3 border-b border-black/8 pb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Conexión</p>
              <h2 className="mt-1 text-lg font-black tracking-[-.025em] text-[#171612]">InsForge</h2>
              <p className="mt-1 text-xs leading-5 text-[#817a6f]">Sesión administrativa y configuración del backend.</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${setup?.connected ? 'bg-emerald-500/10 text-emerald-800' : 'bg-rose-500/10 text-rose-800'}`}>
              {setup?.connected ? 'Conectado' : 'Sin conexión'}
            </span>
          </div>

          <div className="divide-y divide-black/8 text-sm">
            <InfoRow label="Usuario" value={sessionEmail ?? '—'} />
            <InfoRow label="Rol requerido" value="Root / superadmin" />
            <InfoRow label="Service key" value={missingEnv.includes('INSFORGE_API_KEY') ? 'Falta' : 'Configurada'} warning={missingEnv.includes('INSFORGE_API_KEY')} />
          </div>

          {missingEnv.length ? (
            <div className="mt-4 rounded-xl border border-amber-600/15 bg-amber-500/8 p-3 text-xs leading-5 text-amber-900">
              <strong className="font-black">Variables faltantes:</strong> {missingEnv.join(', ')}. Las operaciones unrestricted no usan anon key.
            </div>
          ) : null}
        </AdminCard>

        <AdminCard className="p-0 sm:p-0">
          <div className="flex items-end justify-between gap-3 border-b border-black/8 p-4 sm:p-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Esquema requerido</p>
              <h2 className="mt-1 text-lg font-black tracking-[-.025em] text-[#171612]">Tablas del administrador</h2>
              <p className="mt-1 text-xs leading-5 text-[#817a6f]">{allReady ? 'Todas las tablas principales están disponibles.' : 'Revisa los elementos pendientes antes de operar módulos críticos.'}</p>
            </div>
            <span className="text-sm font-black text-[#171612]">{readyCount}/{tables.length || 0}</span>
          </div>

          <div className="h-1 bg-black/5"><div className="h-full bg-[#ffb000] transition-all" style={{ width: `${progress}%` }} /></div>

          <div className="divide-y divide-black/8 px-4 sm:px-5">
            {loading && tables.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-14 text-sm text-[#817a6f]"><Loader2 className="h-4 w-4 animate-spin" /> Consultando esquema…</div>
            ) : tables.length ? tables.map((table) => (
              <div key={table.name} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <code className="font-mono text-xs font-bold text-[#27241f]">{table.name}</code>
                  {table.error ? <p className="mt-1 text-[11px] leading-5 text-rose-700">{table.error}</p> : null}
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black ${table.exists ? 'bg-emerald-500/10 text-emerald-800' : 'bg-rose-500/10 text-rose-800'}`}>
                  {table.exists ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  {table.exists ? 'OK' : 'Falta'}
                </span>
              </div>
            )) : (
              <div className="py-12 text-center text-sm text-[#817a6f]">Sin información de tablas todavía.</div>
            )}
          </div>
        </AdminCard>
      </div>

      <AdminCard className="p-0 sm:p-0">
        <div className="flex flex-col gap-4 border-b border-black/8 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Acción Root</p>
            <h2 className="mt-1 text-lg font-black tracking-[-.025em] text-[#171612]">Crear o alinear tablas</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#817a6f]">Ejecuta los scripts versionados del proyecto usando únicamente la clave de servicio del servidor.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowSqlModal(true)} disabled={!setup?.sql} className="rounded-xl border border-black/10 bg-white/60 px-4 py-2 text-xs font-bold text-[#625b50] disabled:opacity-40">Ver SQL</button>
            {setup?.dashboardUrl ? (
              <a href={setup.dashboardUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/60 px-4 py-2 text-xs font-bold text-[#625b50]"><ExternalLink className="h-3.5 w-3.5" /> InsForge</a>
            ) : null}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="rounded-xl border border-amber-600/15 bg-amber-500/8 p-4 text-sm text-amber-900">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <strong className="font-black">Operación de esquema.</strong>
                <p className="mt-1 text-xs leading-5">Antes de ejecutar, revisa el estado del sistema y confirma que estás trabajando en el entorno correcto.</p>
              </div>
            </div>
          </div>

          <label className="mt-4 flex items-start gap-3 text-sm text-[#514b42]">
            <input type="checkbox" checked={creationArmed} onChange={(event) => setCreationArmed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#171612]" />
            <span>Confirmo que quiero habilitar temporalmente la creación/alineación de tablas.</span>
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void createTables()}
              disabled={!creationArmed || creating || sessionState !== 'ok'}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white disabled:opacity-40"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {creating ? 'Aplicando…' : 'Crear / alinear tablas'}
            </button>
            <Link href="/admin/sql" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/10 bg-white/55 px-4 text-xs font-bold text-[#625b50]"><Terminal className="h-4 w-4" /> Abrir terminal SQL</Link>
          </div>

          {createError ? <div className="mt-4 rounded-xl border border-rose-600/15 bg-rose-500/8 p-3 text-sm text-rose-900">{createError}</div> : null}

          {createReport ? (
            <div className={`mt-4 rounded-xl border p-4 ${createReport.ok ? 'border-emerald-600/15 bg-emerald-500/8 text-emerald-900' : 'border-amber-600/15 bg-amber-500/8 text-amber-900'}`}>
              <div className="flex items-center gap-2 font-black">
                {createReport.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {createReport.summary ? `${createReport.summary.ok}/${createReport.summary.total} bloques aplicados` : createReport.ok ? 'Bootstrap completado' : 'Bootstrap parcial'}
              </div>
              {createReport.hint ? <p className="mt-2 text-xs leading-5">{createReport.hint}</p> : null}
              {createReport.results ? (
                <div className="mt-3 max-h-64 overflow-auto divide-y divide-black/8 text-[11px]">
                  {Object.entries(createReport.results).map(([name, step]) => (
                    <div key={name} className="flex items-start justify-between gap-3 py-2">
                      <code className="font-mono">{name}</code>
                      <span className={`inline-flex max-w-[65%] items-start gap-1 text-right ${step.ok ? 'text-emerald-800' : 'text-rose-800'}`}>
                        {step.ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                        {step.ok ? 'OK' : step.error ?? 'Falló'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </AdminCard>

      {showSqlModal ? (
        <div className="fixed inset-0 z-[80] grid place-items-center p-4">
          <button type="button" aria-label="Cerrar" onClick={() => setShowSqlModal(false)} className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
          <div className="relative z-10 flex max-h-[82vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-black/10 bg-[#f8f3e9] shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3 sm:px-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Solo lectura</p>
                <h2 className="mt-1 text-lg font-black text-[#171612]">SQL versionado</h2>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => void copySql()} className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-xs font-bold text-[#625b50]">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copiado' : 'Copiar'}</button>
                <button type="button" onClick={() => setShowSqlModal(false)} className="grid h-9 w-9 place-items-center rounded-xl border border-black/10 bg-white/70 text-[#625b50]"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <pre className="m-4 overflow-auto rounded-2xl bg-[#171612] p-4 font-mono text-[11px] leading-5 text-[#eee7dc] sm:m-5">{setup?.sql ?? 'SQL no disponible.'}</pre>
          </div>
        </div>
      ) : null}
    </AdminPage>
  );
}

function InfoRow({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <span className="text-xs text-[#817a6f]">{label}</span>
      <span className={`text-right text-xs font-black ${warning ? 'text-rose-700' : 'text-[#27241f]'}`}>{value}</span>
    </div>
  );
}
