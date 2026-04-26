'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Database,
  X,
  AlertTriangle,
  Terminal,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

/* ──────────────────────────────────────────────────────────
 * Tipos / utilidades
 * ─────────────────────────────────────────────────────────*/

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
  keySource?: 'admin' | 'anon';
};

type ConnectionState = 'unknown' | 'ok' | 'unauthenticated' | 'error';

/* ──────────────────────────────────────────────────────────
 * Página
 * ─────────────────────────────────────────────────────────*/

export default function AdminSetupPage() {
  const [meState, setMeState] = useState<ConnectionState>('unknown');
  const [meEmail, setMeEmail] = useState<string | null>(null);
  const [setup, setSetup] = useState<SetupResponse | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── State for one-click table creation ───────────────────────────────
  const [creating, setCreating] = useState(false);
  const [createReport, setCreateReport] = useState<SetupTablesResponse | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/me', { cache: 'no-store' });
      if (res.status === 401) {
        setMeState('unauthenticated');
        setMeEmail(null);
        return;
      }
      if (!res.ok) {
        setMeState('error');
        return;
      }
      const data = await res.json();
      setMeEmail(typeof data?.email === 'string' ? data.email : null);
      setMeState('ok');
    } catch {
      setMeState('error');
    }
  }, []);

  const checkTables = useCallback(async () => {
    setLoading(true);
    setSetupError(null);
    try {
      const res = await fetch('/api/admin/setup', { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message =
          typeof body?.error === 'string' ? body.error : `Error HTTP ${res.status}`;
        setSetupError(message);
        return;
      }
      const data = (await res.json()) as SetupResponse;
      setSetup(data);
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : 'Error de red');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkConnection();
    void checkTables();
  }, [checkConnection, checkTables]);

  const handleVerify = useCallback(() => {
    void checkConnection();
    void checkTables();
  }, [checkConnection, checkTables]);

  const handleCopySql = useCallback(async () => {
    if (!setup?.sql) return;
    try {
      await navigator.clipboard.writeText(setup.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [setup?.sql]);

  const handleCreateTables = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    setCreateError(null);
    setCreateReport(null);
    try {
      const res = await fetch('/api/admin/setup-tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const body = (await res.json().catch(() => ({}))) as SetupTablesResponse;
      if (!res.ok) {
        const missing = Array.isArray(body?.missing) && body.missing.length > 0
          ? ` Faltan: ${body.missing.join(', ')}.`
          : '';
        setCreateError(`${body?.error ?? `Error HTTP ${res.status}`}${missing}`);
      } else {
        setCreateReport(body);
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Error de red');
    } finally {
      setCreating(false);
      // Always re-verify table presence after attempting creation, even if some
      // blocks failed — partial success is still progress for the user.
      void checkTables();
    }
  }, [creating, checkTables]);

  const tables = setup?.tables ?? [];
  const total = tables.length;
  const okCount = tables.filter((t) => t.exists).length;
  const progress = total === 0 ? 0 : (okCount / total) * 100;
  const allReady = total > 0 && okCount === total;

  const dashboardUrl = setup?.dashboardUrl ?? null;
  const missingEnv = useMemo(() => setup?.missingEnv ?? [], [setup]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Configuración inicial
            </h1>
            <p className="mt-2 text-zinc-400 max-w-2xl">
              Verifica el estado de la conexión con InsForge y crea las tablas
              requeridas por el panel admin.
            </p>
          </div>
          <Button onClick={handleVerify} disabled={loading} variant="default">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verificando…
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Verificar tablas
              </>
            )}
          </Button>
        </header>

        {/* 1. Estado de conexión */}
        <Card className="backdrop-blur-sm">
          <CardHeader className="border-b border-white/5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>1. Conexión con InsForge</CardTitle>
                <CardDescription>
                  Sesión admin (cookie <code className="text-yellow-400">admin_session</code>) y
                  variables de entorno del backend.
                </CardDescription>
              </div>
              <ConnectionBadge state={meState} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Sesión admin</span>
              <span className="text-white">
                {meState === 'ok' && meEmail ? meEmail : meState === 'ok' ? '—' : 'No autenticado'}
              </span>
            </div>
            {missingEnv.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Variables de entorno faltantes</p>
                  <p className="text-xs mt-0.5">
                    Configura en el servidor:{' '}
                    <code className="font-mono">{missingEnv.join(', ')}</code>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Tablas requeridas */}
        <Card className="backdrop-blur-sm">
          <CardHeader className="border-b border-white/5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>2. Tablas requeridas</CardTitle>
                <CardDescription>
                  {total === 0
                    ? 'Sin información — verifica la conexión.'
                    : allReady
                      ? 'Todas las tablas están listas.'
                      : `${okCount} de ${total} tablas detectadas.`}
                </CardDescription>
              </div>
              <Badge variant={allReady ? 'success' : okCount > 0 ? 'warning' : 'destructive'}>
                {okCount}/{total}
              </Badge>
            </div>
            <div className="mt-4">
              <Progress value={progress} />
            </div>
          </CardHeader>
          <CardContent>
            {setupError && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-200 text-sm">
                <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{setupError}</span>
              </div>
            )}
            {tables.length === 0 && !loading && !setupError && (
              <p className="text-sm text-zinc-500">
                Pulsa <strong>Verificar tablas</strong> para consultar el backend.
              </p>
            )}
            <ul className="divide-y divide-white/5">
              {tables.map((t) => (
                <li
                  key={t.name}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-zinc-500" />
                    <code className="font-mono text-zinc-200">{t.name}</code>
                    {t.error && (
                      <span className="text-xs text-zinc-500">· {t.error}</span>
                    )}
                  </div>
                  {t.exists ? (
                    <Badge variant="success">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      OK
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="w-3.5 h-3.5" />
                      Falta
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* 3. Crear las tablas — automático */}
        <Card className="backdrop-blur-sm">
          <CardHeader className="border-b border-white/5">
            <CardTitle>3. Crear las tablas</CardTitle>
            <CardDescription>
              Ejecuta automáticamente <code className="text-yellow-400">scripts/create-tables.sql</code>{' '}
              contra InsForge desde aquí. No necesitas salir del panel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleCreateTables}
                disabled={creating}
                variant="default"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creando tablas…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Crear tablas ahora
                  </>
                )}
              </Button>
              <Button
                onClick={() => setShowSqlModal(true)}
                disabled={!setup?.sql}
                variant="outline"
              >
                Ver SQL
              </Button>
              <Button
                variant="outline"
                disabled={!dashboardUrl}
                onClick={() => {
                  if (dashboardUrl) window.open(dashboardUrl, '_blank', 'noopener,noreferrer');
                }}
              >
                <ExternalLink className="w-4 h-4" />
                Dashboard InsForge
              </Button>
            </div>

            {!setup?.sql && (
              <p className="text-xs text-zinc-500">
                No se pudo cargar <code>scripts/create-tables.sql</code>.
              </p>
            )}

            {createError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-200 text-sm">
                <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="break-words">{createError}</span>
              </div>
            )}

            {createReport && (
              <div
                className={`rounded-lg border p-3 ${
                  createReport.ok
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : 'border-amber-500/30 bg-amber-500/10'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                  {createReport.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-300" />
                  )}
                  <span className={createReport.ok ? 'text-emerald-200' : 'text-amber-200'}>
                    {createReport.summary
                      ? `${createReport.summary.ok} de ${createReport.summary.total} bloques aplicados`
                      : createReport.ok
                        ? 'Tablas creadas'
                        : 'Algunos bloques fallaron'}
                  </span>
                </div>
                {createReport.hint && (
                  <div className="mb-2 rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-200">
                    <div className="font-semibold mb-1">Acción requerida</div>
                    <p className="break-words leading-relaxed">{createReport.hint}</p>
                  </div>
                )}
                {createReport.results && (
                  <ul className="divide-y divide-white/5 text-xs">
                    {Object.entries(createReport.results).map(([name, r]) => (
                      <li key={name} className="flex items-start justify-between gap-3 py-1.5">
                        <code className="font-mono text-zinc-200 break-all">{name}</code>
                        {r.ok ? (
                          <span className="flex items-center gap-1 text-emerald-300 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            OK
                          </span>
                        ) : (
                          <span className="flex items-start gap-1 text-red-300 max-w-[60%] text-right break-words">
                            <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>{r.error ?? 'Falló'}</span>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Terminal SQL embebido en el admin */}
        <Card className="backdrop-blur-sm">
          <CardHeader className="border-b border-white/5">
            <CardTitle>4. Terminal SQL</CardTitle>
            <CardDescription>
              ¿Necesitas crear, modificar o consultar tablas extra? Abre la
              terminal SQL conectada a InsForge — sin salir del admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/sql" prefetch={false} className="inline-flex">
                <Button variant="default">
                  <Terminal className="w-4 h-4" />
                  Abrir Terminal SQL
                </Button>
              </Link>
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              La terminal usa la sesión <code>admin_session</code>. Toda la SQL
              se ejecuta contra el endpoint <code>/api/admin/sql</code>.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Modal SQL */}
      {showSqlModal && setup?.sql && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="setup-sql-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowSqlModal(false)}
        >
          <div
            className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div>
                <h3 id="setup-sql-title" className="text-lg font-semibold text-white">
                  Instrucciones SQL
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  scripts/create-tables.sql · ejecuta en el editor SQL de InsForge
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleCopySql} variant="secondary">
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar SQL
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setShowSqlModal(false)}
                  variant="ghost"
                  className="!px-2"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5" />
                  <span className="sr-only">Cerrar</span>
                </Button>
              </div>
            </div>
            <div className="overflow-auto p-5">
              <pre className="text-xs leading-relaxed text-zinc-200 bg-black/60 border border-white/5 rounded-xl p-4 overflow-auto whitespace-pre">
                <code>{setup.sql}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConnectionBadge({ state }: { state: ConnectionState }) {
  if (state === 'ok') {
    return (
      <Badge variant="success">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Conectado
      </Badge>
    );
  }
  if (state === 'unauthenticated') {
    return (
      <Badge variant="warning">
        <AlertTriangle className="w-3.5 h-3.5" />
        Sin sesión
      </Badge>
    );
  }
  if (state === 'error') {
    return (
      <Badge variant="destructive">
        <XCircle className="w-3.5 h-3.5" />
        Error
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <Loader2 className="w-3.5 h-3.5 animate-spin" />
      Comprobando…
    </Badge>
  );
}
