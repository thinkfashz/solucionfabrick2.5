'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  KeyRound,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Wrench,
} from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

type McpConnection = {
  keyId: string;
  tokenPrefix: string;
  scopes: string[];
  label: string;
  createdAt: string;
  updatedAt: string | null;
  legacy?: boolean;
};

type McpStatus = {
  configured: boolean;
  endpoint: string;
  secretEndpointTemplate: string;
  connections: McpConnection[];
  availableScopes: Array<{ id: string; label: string }>;
};

type CreatedAccess = {
  token: string;
  keyId: string;
  tokenPrefix: string;
  secretEndpoint: string;
  endpoint: string;
  scopes: string[];
  label: string;
};

type QuickTest = {
  ok: boolean;
  endpoint?: string;
  oauthReady?: boolean;
  error?: string;
  connection?: { label: string; keyId: string; tokenPrefix: string; scopes: string[] };
  checks?: Array<{ id: string; label: string; ok: boolean; detail?: string }>;
};

const EMPTY_STATUS: McpStatus = {
  configured: false,
  endpoint: '',
  secretEndpointTemplate: '',
  connections: [],
  availableScopes: [
    { id: 'products:read', label: 'Leer catálogo y buscar oportunidades' },
    { id: 'products:write', label: 'Crear y editar borradores' },
    { id: 'products:publish', label: 'Publicar o despublicar' },
    { id: 'inventory:write', label: 'Modificar inventario' },
  ],
};

function CopyButton({ value, label = 'Copiar' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }
  return (
    <button
      type="button"
      onClick={() => void copy()}
      disabled={!value}
      className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-black/10 bg-white/75 px-3 text-[10px] font-black uppercase tracking-[.11em] text-[#514b42] transition hover:bg-white disabled:opacity-40"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Clipboard className="h-3.5 w-3.5" />}
      {copied ? 'Copiado' : label}
    </button>
  );
}

function Step({ number, title, text, children, done = false }: { number: number; title: string; text: string; children?: React.ReactNode; done?: boolean }) {
  return (
    <article className="grid gap-3 border-t border-black/10 py-5 sm:grid-cols-[42px_minmax(0,1fr)]">
      <span className={`grid h-9 w-9 place-items-center rounded-xl text-xs font-black ${done ? 'bg-emerald-500/10 text-emerald-800' : 'bg-[#171612] text-white'}`}>
        {done ? <CheckCircle2 className="h-4 w-4" /> : number}
      </span>
      <div className="min-w-0">
        <h3 className="text-base font-black tracking-[-.02em] text-[#171612]">{title}</h3>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-[#716b60]">{text}</p>
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </article>
  );
}

export default function McpAdminPage() {
  const [status, setStatus] = useState<McpStatus>(EMPTY_STATUS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [created, setCreated] = useState<CreatedAccess | null>(null);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['products:read']);
  const [test, setTest] = useState<QuickTest | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/mcp/access', { cache: 'no-store' });
      const data = await response.json() as McpStatus & { error?: string };
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar MCP.');
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar MCP.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function toggleScope(scope: string) {
    setSelectedScopes((current) => {
      if (current.includes(scope)) {
        const next = current.filter((item) => item !== scope);
        return next.length ? next : ['products:read'];
      }
      return [...current, scope];
    });
  }

  async function createChatGptAccess() {
    setBusy('create');
    setError('');
    setNotice('');
    setTest(null);
    try {
      const response = await fetch('/api/admin/mcp/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'ChatGPT', scopes: selectedScopes }),
      });
      const data = await response.json() as CreatedAccess & { error?: string };
      if (!response.ok) throw new Error(data.error || 'No se pudo crear la credencial.');
      setCreated(data);
      setNotice('Credencial creada. Copia la URL privada antes de salir de esta pantalla.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la credencial.');
    } finally {
      setBusy('');
    }
  }

  async function runQuickTest(keyId?: string) {
    const target = keyId || created?.keyId || status.connections[0]?.keyId || '';
    setBusy(`test:${target}`);
    setError('');
    setTest(null);
    try {
      const response = await fetch('/api/admin/mcp/quick-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId: target }),
      });
      const data = await response.json() as QuickTest;
      setTest(data);
      if (!response.ok || !data.ok) throw new Error(data.error || 'El test encontró una configuración pendiente.');
      setNotice('Fabrick está listo para recibir el escaneo de herramientas desde ChatGPT.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo ejecutar el test.');
    } finally {
      setBusy('');
    }
  }

  async function revoke(keyId: string) {
    setBusy(`revoke:${keyId}`);
    setError('');
    try {
      const response = await fetch(`/api/admin/mcp/access?keyId=${encodeURIComponent(keyId)}`, { method: 'DELETE' });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'No se pudo revocar.');
      if (created?.keyId === keyId) setCreated(null);
      setTest(null);
      setNotice('Credencial revocada.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo revocar.');
    } finally {
      setBusy('');
    }
  }

  const connectionUrl = created?.secretEndpoint || '';
  const readyConnection = created || status.connections[0];
  const readOnly = selectedScopes.length === 1 && selectedScopes[0] === 'products:read';
  const chatGptInstructions = useMemo(() => [
    'Abre ChatGPT en la web y entra a Settings → Apps → Create.',
    'Pega la URL privada de Fabrick como endpoint MCP y elige conexión sin OAuth para esta prueba inicial.',
    'Pulsa Scan Tools. Cuando ChatGPT termine el escaneo, crea/habilita la app y selecciónala en un chat.',
  ], []);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="IA & análisis · conexión"
        title="ChatGPT & MCP"
        description="Conecta Fabrick a ChatGPT con una ruta corta y verificable. Empieza solo con lectura; luego puedes habilitar escrituras, OAuth y aprobaciones cuando la conexión básica ya funcione."
        icon={Bot}
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void runQuickTest()} disabled={Boolean(busy) || !readyConnection} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/10 bg-white/75 px-4 text-xs font-black text-[#514b42] transition hover:bg-white disabled:opacity-40">
              {busy.startsWith('test:') ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Test rápido
            </button>
            <Link href="/admin/mcp/harness" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white">
              <Bot className="h-4 w-4" /> AI Harness
            </Link>
          </div>
        }
        meta={
          <>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[.13em] ${status.configured ? 'bg-emerald-500/10 text-emerald-800' : 'bg-amber-500/10 text-amber-800'}`}>
              {loading ? 'Comprobando…' : status.configured ? `${status.connections.length} credencial(es) activas` : 'Sin conexión todavía'}
            </span>
            <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.13em] text-[#716b60]">Streamable HTTP</span>
          </>
        }
      />

      {(error || notice) ? (
        <AdminMotion>
          <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${error ? 'border-rose-500/20 bg-rose-500/8 text-rose-800' : 'border-emerald-500/20 bg-emerald-500/8 text-emerald-800'}`}>
            {error || notice}
          </div>
        </AdminMotion>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Endpoint" value={status.endpoint ? 'Online' : '…'} icon={Link2} accent="emerald" hint={status.endpoint || 'Cargando endpoint'} />
        <AdminStat label="Credenciales" value={loading ? '…' : status.connections.length} icon={KeyRound} />
        <AdminStat label="Modo inicial" value="Lectura" icon={ShieldCheck} accent="cyan" hint="Recomendado para validar ChatGPT primero." />
        <AdminStat label="OAuth" value={test?.oauthReady ? 'Listo' : 'Opcional'} icon={Wrench} hint="Puedes activarlo después del primer test." />
      </section>

      <AdminCard glow>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9b6a12]">Ruta recomendada</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-.04em] text-[#171612]">Conectar en 3 pasos</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#716b60]">No necesitas entender Auth0, JWKS ni callbacks para comprobar primero que ChatGPT puede descubrir las herramientas de Fabrick.</p>
          </div>
          <span className="rounded-full bg-[#ffb000]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-[#9b6a12]">Primero lectura</span>
        </div>

        <Step number={1} title="Crear la credencial ChatGPT" text="Selecciona qué podrá hacer. Para la primera prueba deja solo Leer catálogo; es la configuración más fácil de auditar." done={Boolean(created)}>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {status.availableScopes.map((scope) => {
              const selected = selectedScopes.includes(scope.id);
              return (
                <button key={scope.id} type="button" onClick={() => toggleScope(scope.id)} className={`rounded-xl border p-3 text-left transition ${selected ? 'border-[#c77a00]/25 bg-[#ffb000]/10' : 'border-black/10 bg-white/55 hover:bg-white'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${selected ? 'bg-[#F5871F]' : 'bg-black/15'}`} />
                    <span className="text-xs font-black text-[#171612]">{scope.id}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-[#8f887c]">{scope.label}</p>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void createChatGptAccess()} disabled={Boolean(busy)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white disabled:opacity-50">
              {busy === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Crear credencial ChatGPT
            </button>
            <span className={`text-xs font-semibold ${readOnly ? 'text-emerald-700' : 'text-amber-800'}`}>{readOnly ? '✓ Solo lectura' : 'Incluye acciones de escritura'}</span>
          </div>
        </Step>

        <Step number={2} title="Copiar la URL privada" text="Esta URL incluye la credencial solo para simplificar la primera conexión. Se muestra únicamente en esta sesión; no la publiques ni la compartas." done={Boolean(connectionUrl)}>
          {created ? (
            <div className="rounded-2xl border border-[#c77a00]/15 bg-[#fff7e7] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Endpoint privado para la prueba</p>
                  <code className="mt-2 block overflow-x-auto whitespace-nowrap rounded-xl border border-black/8 bg-white/75 px-3 py-2 text-xs text-[#514b42]">{created.secretEndpoint}</code>
                </div>
                <div className="flex gap-2"><CopyButton value={created.secretEndpoint} label="Copiar URL" /><CopyButton value={created.token} label="Copiar token" /></div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-black/10 bg-white/35 px-4 py-4 text-sm text-[#8f887c]">Crea la credencial del paso 1 para mostrar la URL privada.</div>
          )}
        </Step>

        <Step number={3} title="Añadir Fabrick en ChatGPT" text="La autorización final siempre ocurre dentro de ChatGPT por seguridad; una web externa no puede instalarse a sí misma en tu cuenta.">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <ol className="grid gap-2">
              {chatGptInstructions.map((instruction, index) => (
                <li key={instruction} className="flex gap-3 text-sm leading-6 text-[#625c52]"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-black/5 text-[9px] font-black text-[#514b42]">{index + 1}</span><span>{instruction}</span></li>
              ))}
            </ol>
            <a href="https://chatgpt.com/" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-[#171612] px-4 text-xs font-black text-white">
              Abrir ChatGPT <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <div className="mt-4 rounded-xl border border-amber-500/15 bg-amber-500/8 px-4 py-3 text-xs leading-5 text-amber-900">
            La opción <b>Crear app / MCP personalizado</b> depende del plan y del espacio de trabajo de ChatGPT. Si no aparece, Fabrick puede quedar listo igual; el bloqueo está del lado de disponibilidad de ChatGPT, no del servidor MCP.
          </div>
        </Step>
      </AdminCard>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <AdminCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#8f887c]">Verificación interna</p><h2 className="mt-1 text-lg font-black text-[#171612]">Test de 15 segundos</h2><p className="mt-1 text-sm leading-6 text-[#716b60]">Comprueba endpoint, credencial registrada, tenant y permisos antes de abrir ChatGPT.</p></div>
            <button type="button" onClick={() => void runQuickTest()} disabled={Boolean(busy) || !readyConnection} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white disabled:opacity-40">
              {busy.startsWith('test:') ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Ejecutar test
            </button>
          </div>
          <div className="mt-4 grid gap-2">
            {(test?.checks || []).map((check) => (
              <div key={check.id} className="flex items-start gap-3 rounded-xl border border-black/8 bg-white/45 px-3 py-3">
                <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${check.ok ? 'bg-emerald-500/10 text-emerald-700' : 'bg-rose-500/10 text-rose-700'}`}>{check.ok ? <Check className="h-3.5 w-3.5" /> : '!'}</span>
                <div><p className="text-xs font-black text-[#171612]">{check.label}</p>{check.detail ? <p className="mt-0.5 break-all text-[11px] leading-5 text-[#8f887c]">{check.detail}</p> : null}</div>
              </div>
            ))}
            {!test ? <div className="rounded-xl border border-dashed border-black/10 px-4 py-5 text-sm text-[#8f887c]">Aún no se ha ejecutado el test.</div> : null}
          </div>
        </AdminCard>

        <AdminCard>
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#8f887c]">Siguiente nivel</p>
          <h2 className="mt-1 text-lg font-black text-[#171612]">Cuando la conexión básica funcione</h2>
          <div className="mt-4 grid gap-2">
            <Link href="/admin/mcp/oauth" className="flex items-center justify-between rounded-xl border border-black/10 bg-white/50 px-4 py-3 text-sm font-black text-[#514b42] hover:bg-white"><span>Activar OAuth 2.1</span><ArrowRight className="h-4 w-4" /></Link>
            <Link href="/admin/mcp/gobernanza" className="flex items-center justify-between rounded-xl border border-black/10 bg-white/50 px-4 py-3 text-sm font-black text-[#514b42] hover:bg-white"><span>Aprobaciones y auditoría</span><ArrowRight className="h-4 w-4" /></Link>
            <Link href="/admin/mcp/harness" className="flex items-center justify-between rounded-xl border border-black/10 bg-white/50 px-4 py-3 text-sm font-black text-[#514b42] hover:bg-white"><span>Probar Ollama en AI Harness</span><ArrowRight className="h-4 w-4" /></Link>
          </div>
        </AdminCard>
      </div>

      <AdminCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#8f887c]">Credenciales activas</p><h2 className="mt-1 text-lg font-black text-[#171612]">Clientes MCP autorizados</h2></div>
          <span className="rounded-full bg-black/5 px-3 py-1 text-[10px] font-black uppercase tracking-[.12em] text-[#716b60]">{status.connections.length} activas</span>
        </div>
        <div className="mt-4 divide-y divide-black/10">
          {status.connections.length === 0 ? <p className="py-5 text-sm text-[#8f887c]">Todavía no hay credenciales.</p> : status.connections.map((connection) => (
            <div key={`${connection.keyId}-${connection.tokenPrefix}`} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-black text-[#171612]">{connection.label || 'Cliente MCP'}</p>{connection.legacy ? <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase text-amber-800">legacy</span> : null}</div><p className="mt-1 font-mono text-xs text-[#8f887c]">{connection.tokenPrefix}••••</p><p className="mt-1 text-[11px] text-[#aaa397]">{connection.scopes.join(' · ')}</p></div>
              <div className="flex gap-2"><button type="button" onClick={() => void runQuickTest(connection.keyId)} disabled={Boolean(busy)} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-[10px] font-black uppercase tracking-[.1em] text-[#514b42]"><RefreshCw className="h-3.5 w-3.5" /> Test</button>{!connection.legacy ? <button type="button" onClick={() => void revoke(connection.keyId)} disabled={Boolean(busy)} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-rose-500/15 bg-rose-500/5 px-3 text-[10px] font-black uppercase tracking-[.1em] text-rose-800">{busy === `revoke:${connection.keyId}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Revocar</button> : null}</div>
            </div>
          ))}
        </div>
      </AdminCard>
    </AdminPage>
  );
}
