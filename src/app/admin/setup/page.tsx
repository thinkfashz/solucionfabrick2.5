'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

        {/* 3-4. Acciones */}
        <Card className="backdrop-blur-sm">
          <CardHeader className="border-b border-white/5">
            <CardTitle>3. Crear las tablas</CardTitle>
            <CardDescription>
              Copia el SQL y ejecútalo en el editor SQL del dashboard de InsForge.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setShowSqlModal(true)}
                disabled={!setup?.sql}
                variant="default"
              >
                Ver instrucciones SQL
              </Button>
              <Button
                variant="outline"
                disabled={!dashboardUrl}
                onClick={() => {
                  if (dashboardUrl) window.open(dashboardUrl, '_blank', 'noopener,noreferrer');
                }}
              >
                <ExternalLink className="w-4 h-4" />
                Abrir dashboard InsForge
              </Button>
            </div>
            {!setup?.sql && (
              <p className="mt-3 text-xs text-zinc-500">
                No se pudo cargar <code>scripts/create-tables.sql</code>.
              </p>
            )}
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
