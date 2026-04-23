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

/* ──────────────────────────────────────────────────────────
 * shadcn-style primitives (locales)
 * Implementaciones ligeras inspiradas en shadcn/ui que usan
 * los tokens CSS añadidos en globals.css (--card, --primary…).
 * ─────────────────────────────────────────────────────────*/

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-zinc-950/80 backdrop-blur-sm shadow-lg ${className}`}
    >
      {children}
    </div>
  );
}

function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 border-b border-white/5 ${className}`}>{children}</div>;
}

function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-xl font-semibold text-white ${className}`}>{children}</h2>;
}

function CardDescription({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={`mt-1 text-sm text-zinc-400 ${className}`}>{children}</p>;
}

function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

type BadgeVariant = 'success' | 'destructive' | 'warning' | 'muted';

function Badge({
  children,
  variant = 'muted',
  className = '',
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  const styles: Record<BadgeVariant, string> = {
    success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    destructive: 'bg-red-500/15 text-red-300 border-red-500/30',
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    muted: 'bg-white/5 text-zinc-300 border-white/10',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';

function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
  className = '',
  asChild = false,
  href,
  target,
  rel,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
  asChild?: boolean;
  href?: string;
  target?: string;
  rel?: string;
  ariaLabel?: string;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/60';
  const styles: Record<ButtonVariant, string> = {
    primary: 'bg-yellow-400 text-black hover:bg-yellow-300',
    secondary: 'bg-white/10 text-white hover:bg-white/15',
    ghost: 'bg-transparent text-zinc-300 hover:bg-white/5',
    outline: 'border border-white/15 text-white hover:bg-white/5',
  };
  const cls = `${base} ${styles[variant]} ${className}`;

  if (asChild && href) {
    return (
      <a href={href} target={target} rel={rel} className={cls} aria-label={ariaLabel}>
        {children}
      </a>
    );
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cls}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

function Progress({ value, className = '' }: { value: number; className?: string }) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`relative h-2 w-full overflow-hidden rounded-full bg-white/10 ${className}`}
    >
      <div
        className="h-full rounded-full bg-yellow-400 transition-all duration-500"
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}

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
  const missingEnv = useMemo(() => setup?.missingEnv ?? [], [setup?.missingEnv]);

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
          <Button onClick={handleVerify} disabled={loading} variant="primary">
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
        <Card>
          <CardHeader>
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
        <Card>
          <CardHeader>
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
        <Card>
          <CardHeader>
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
                variant="primary"
              >
                Ver instrucciones SQL
              </Button>
              <Button
                asChild
                href={dashboardUrl ?? '#'}
                target={dashboardUrl ? '_blank' : undefined}
                rel={dashboardUrl ? 'noopener noreferrer' : undefined}
                variant="outline"
                disabled={!dashboardUrl}
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
                  ariaLabel="Cerrar"
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
    <Badge variant="muted">
      <Loader2 className="w-3.5 h-3.5 animate-spin" />
      Comprobando…
    </Badge>
  );
}
