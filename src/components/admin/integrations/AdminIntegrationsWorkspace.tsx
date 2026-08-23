'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Workflow,
  XCircle,
} from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';
import { QuotaBar, unitForProvider } from '@/components/admin/QuotaBar';
import {
  CATEGORY_LABELS,
  INTEGRATION_PROVIDERS,
  OAUTH_PROVIDERS,
  OAUTH_START_URLS,
  TESTABLE_PROVIDERS,
  type ProviderCategory,
  type ProviderDefinition,
  type ProviderKey,
} from './providerCatalog';

type FieldStatus = { set: boolean; preview: string; source?: 'db' | 'env'; envVar?: string };
type ProviderStatus = {
  credentials: Record<string, FieldStatus>;
  updated_at?: string;
  encrypted?: boolean;
  envManaged?: boolean;
};
type TestResult = { ok: boolean; error?: string; checks?: Array<{ name: string; ok: boolean; detail?: string }> };
type QuotaSnapshot = { used: number | null; limit: number | null; capturedAt: string };
type MessageState = { type: 'success' | 'error'; text: string } | null;

type IntegrationsResponse = {
  providers?: Record<string, ProviderStatus>;
  encrypted?: boolean;
  tenantId?: string;
  error?: string;
  hint?: string;
};

const inputClass = 'w-full rounded-xl border border-black/10 bg-white px-3.5 py-3 text-sm font-semibold text-[#171612] outline-none transition placeholder:text-[#aaa294] focus:border-[#c77a00]/45 focus:ring-2 focus:ring-[#ffb000]/10 disabled:cursor-not-allowed disabled:bg-[#f1ede5] disabled:text-[#8f887c]';
const secondaryButton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3.5 text-xs font-black text-[#5f594f] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50';
const primaryButton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white transition hover:bg-[#2b2924] disabled:cursor-not-allowed disabled:opacity-50';
const dangerButton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rose-600/15 bg-rose-500/8 px-3.5 text-xs font-black text-rose-800 transition hover:bg-rose-500/12 disabled:cursor-not-allowed disabled:opacity-50';

function providerConfigured(status?: ProviderStatus) {
  return Object.values(status?.credentials ?? {}).some((field) => field.set);
}

function configuredFieldCount(status?: ProviderStatus) {
  return Object.values(status?.credentials ?? {}).filter((field) => field.set).length;
}

function formatUpdated(value?: string) {
  if (!value) return 'Sin cambios registrados';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin cambios registrados';
  return date.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}

function StatusPill({ configured, test }: { configured: boolean; test?: TestResult | null }) {
  if (test) {
    return test.ok ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.13em] text-emerald-800"><CheckCircle2 className="h-3 w-3" /> Validada</span>
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.13em] text-rose-800"><XCircle className="h-3 w-3" /> Con error</span>
    );
  }
  return configured ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.13em] text-emerald-800"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Configurada</span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.13em] text-[#817a6f]"><span className="h-1.5 w-1.5 rounded-full bg-[#aaa294]" /> Pendiente</span>
  );
}

export default function AdminIntegrationsWorkspace() {
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState<Record<string, ProviderStatus>>({});
  const [inputs, setInputs] = useState<Record<string, Record<string, string>>>({});
  const [tests, setTests] = useState<Record<string, TestResult | null>>({});
  const [messages, setMessages] = useState<Record<string, MessageState>>({});
  const [quota, setQuota] = useState<Record<string, QuotaSnapshot>>({});
  const [role, setRole] = useState('viewer');
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [encrypted, setEncrypted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<ProviderKey | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | ProviderCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'connected' | 'pending'>('all');
  const [globalError, setGlobalError] = useState<string | null>(null);

  const canManage = role === 'superadmin';

  async function load() {
    setLoading(true);
    setGlobalError(null);
    try {
      const [integrationRes, quotaRes, meRes] = await Promise.all([
        fetch('/api/admin/integrations', { cache: 'no-store' }),
        fetch('/api/admin/integrations/quota', { cache: 'no-store' }),
        fetch('/api/admin/me', { cache: 'no-store' }),
      ]);

      const integrationJson = (await integrationRes.json().catch(() => ({}))) as IntegrationsResponse;
      if (!integrationRes.ok) {
        setGlobalError(integrationJson.hint ?? integrationJson.error ?? `HTTP ${integrationRes.status}`);
      } else {
        setIntegrations(integrationJson.providers ?? {});
        setEncrypted(Boolean(integrationJson.encrypted));
        setTenantId(integrationJson.tenantId ?? null);
      }

      if (quotaRes.ok) {
        const quotaJson = (await quotaRes.json().catch(() => ({}))) as { snapshots?: Array<{ provider: string; used: number | null; limit: number | null; captured_at: string }> };
        const map: Record<string, QuotaSnapshot> = {};
        for (const snapshot of quotaJson.snapshots ?? []) {
          map[snapshot.provider] = { used: snapshot.used, limit: snapshot.limit, capturedAt: snapshot.captured_at };
        }
        setQuota(map);
      }

      if (meRes.ok) {
        const me = (await meRes.json().catch(() => ({}))) as { rol?: string };
        setRole(me.rol ?? 'viewer');
      }
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'No se pudieron cargar las integraciones.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const connectedCount = useMemo(
    () => INTEGRATION_PROVIDERS.filter((provider) => providerConfigured(integrations[provider.id])).length,
    [integrations],
  );

  const oauthConnectedCount = useMemo(
    () => INTEGRATION_PROVIDERS.filter((provider) => OAUTH_PROVIDERS.has(provider.id) && providerConfigured(integrations[provider.id])).length,
    [integrations],
  );

  const visibleProviders = useMemo(() => {
    const term = query.trim().toLowerCase();
    return INTEGRATION_PROVIDERS.filter((provider) => {
      if (category !== 'all' && provider.category !== category) return false;
      const configured = providerConfigured(integrations[provider.id]);
      if (statusFilter === 'connected' && !configured) return false;
      if (statusFilter === 'pending' && configured) return false;
      if (!term) return true;
      return [provider.label, provider.description, provider.category, ...provider.uses]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [category, integrations, query, statusFilter]);

  const callbackProvider = searchParams?.get('connected');
  const callbackError = searchParams?.get('ml_error') ?? searchParams?.get('google_error') ?? searchParams?.get('meta_error') ?? searchParams?.get('tiktok_error');
  const callbackAccount = searchParams?.get('account') ?? searchParams?.get('seller');
  const pendingReview = searchParams?.get('pending_review');

  function updateInput(provider: ProviderKey, field: string, value: string) {
    setInputs((current) => ({ ...current, [provider]: { ...(current[provider] ?? {}), [field]: value } }));
  }

  function setMessage(provider: ProviderKey, message: MessageState) {
    setMessages((current) => ({ ...current, [provider]: message }));
  }

  async function saveProvider(provider: ProviderDefinition) {
    if (!canManage) return;
    const submitted = Object.fromEntries(
      Object.entries(inputs[provider.id] ?? {}).filter(([, value]) => value.trim().length > 0),
    );
    if (Object.keys(submitted).length === 0) {
      setMessage(provider.id, { type: 'error', text: 'Ingresa al menos un valor nuevo antes de guardar.' });
      return;
    }
    setWorking(`save:${provider.id}`);
    setMessage(provider.id, null);
    try {
      const res = await fetch('/api/admin/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: provider.id, credentials: submitted }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setInputs((current) => ({ ...current, [provider.id]: {} }));
      setMessage(provider.id, { type: 'success', text: 'Credenciales actualizadas y cifradas.' });
      await load();
    } catch (error) {
      setMessage(provider.id, { type: 'error', text: error instanceof Error ? error.message : 'No se pudo guardar.' });
    } finally {
      setWorking(null);
    }
  }

  async function testProvider(provider: ProviderDefinition) {
    setWorking(`test:${provider.id}`);
    setTests((current) => ({ ...current, [provider.id]: null }));
    try {
      const res = await fetch(`/api/admin/integrations/test?provider=${encodeURIComponent(provider.id)}`, { cache: 'no-store' });
      const json = (await res.json().catch(() => ({}))) as TestResult;
      setTests((current) => ({ ...current, [provider.id]: { ok: Boolean(json.ok), error: json.error, checks: json.checks ?? [] } }));
    } catch (error) {
      setTests((current) => ({ ...current, [provider.id]: { ok: false, error: error instanceof Error ? error.message : 'Error de red.', checks: [] } }));
    } finally {
      setWorking(null);
    }
  }

  async function deleteProvider(provider: ProviderDefinition) {
    if (!canManage || !confirm(`¿Eliminar las credenciales guardadas de ${provider.label}?`)) return;
    setWorking(`delete:${provider.id}`);
    try {
      const res = await fetch(`/api/admin/integrations?provider=${encodeURIComponent(provider.id)}`, { method: 'DELETE' });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setTests((current) => ({ ...current, [provider.id]: null }));
      setMessage(provider.id, { type: 'success', text: 'Credenciales eliminadas para esta empresa.' });
      await load();
    } catch (error) {
      setMessage(provider.id, { type: 'error', text: error instanceof Error ? error.message : 'No se pudo eliminar.' });
    } finally {
      setWorking(null);
    }
  }

  async function revokeOAuth(provider: ProviderDefinition) {
    if (!canManage || !confirm(`¿Desconectar ${provider.label} de esta empresa?`)) return;
    setWorking(`revoke:${provider.id}`);
    try {
      const res = await fetch('/api/admin/integrations/oauth/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: provider.id }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; providerDetail?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setMessage(provider.id, { type: 'success', text: json.providerDetail ?? 'OAuth desconectado.' });
      await load();
    } catch (error) {
      setMessage(provider.id, { type: 'error', text: error instanceof Error ? error.message : 'No se pudo desconectar.' });
    } finally {
      setWorking(null);
    }
  }

  async function rotateResend() {
    if (!canManage || !confirm('¿Rotar la API key de Resend ahora? La key anterior dejará de utilizarse.')) return;
    setWorking('rotate:resend');
    try {
      const res = await fetch('/api/admin/integrations/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'resend' }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; deleteWarning?: string | null };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setMessage('resend', { type: 'success', text: `API key rotada.${json.deleteWarning ? ` Revisa la key anterior: ${json.deleteWarning}` : ''}` });
      await load();
    } catch (error) {
      setMessage('resend', { type: 'error', text: error instanceof Error ? error.message : 'No se pudo rotar.' });
    } finally {
      setWorking(null);
    }
  }

  function startOAuth(provider: ProviderDefinition) {
    if (!canManage) return;
    const url = OAUTH_START_URLS[provider.id];
    if (url) window.location.assign(url);
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Sistema · Conexiones"
        title="Centro de integraciones"
        description="Una sola fuente de verdad para credenciales, OAuth, pruebas y cuotas. Los secretos permanecen enmascarados y el panel ya no ofrece revelado en texto plano."
        icon={Workflow}
        meta={
          <>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.14em] text-emerald-800">{connectedCount} configuradas</span>
            <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.14em] text-[#817a6f]">{INTEGRATION_PROVIDERS.length - connectedCount} pendientes</span>
            <span className="rounded-full bg-[#ffb000]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.14em] text-[#9b6a12]">{canManage ? 'Root · gestión' : 'Solo lectura'}</span>
          </>
        }
        actions={
          <button type="button" onClick={() => void load()} disabled={loading} className={secondaryButton}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
          </button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Configuradas" value={loading ? '…' : connectedCount} icon={CheckCircle2} accent="emerald" hint={`${INTEGRATION_PROVIDERS.length} proveedores disponibles`} />
        <AdminStat label="OAuth" value={loading ? '…' : `${oauthConnectedCount}/4`} icon={KeyRound} accent="cyan" hint="Meta, Google, TikTok y Mercado Libre" />
        <AdminStat label="Cifrado" value={encrypted ? 'Activo' : 'Revisar'} icon={ShieldCheck} accent={encrypted ? 'emerald' : 'rose'} hint="Cifrado de credenciales en servidor" />
        <AdminStat label="Cuotas" value={Object.keys(quota).length} icon={Workflow} accent="yellow" hint={tenantId ? `Tenant ${tenantId.slice(0, 8)}…` : 'Contexto tenant'} />
      </section>

      {callbackProvider ? (
        <div className="rounded-xl border border-emerald-600/15 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-900">
          <strong>{callbackProvider}</strong> conectado correctamente{callbackAccount ? ` como ${callbackAccount}` : ''}.{pendingReview ? ' Algunos permisos siguen pendientes de revisión del proveedor.' : ''}
        </div>
      ) : null}
      {callbackError ? <div className="rounded-xl border border-rose-600/15 bg-rose-500/8 px-4 py-3 text-sm text-rose-900">OAuth: {callbackError}</div> : null}
      {globalError ? <div className="rounded-xl border border-rose-600/15 bg-rose-500/8 px-4 py-3 text-sm text-rose-900">{globalError}</div> : null}

      <AdminCard className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Directorio</p>
            <h2 className="mt-1 text-xl font-black tracking-[-.025em] text-[#171612]">Proveedores y credenciales</h2>
            <p className="mt-1 text-xs leading-5 text-[#817a6f]">Filtra por área o estado. Las pruebas son manuales para evitar pings permanentes que ralenticen el admin.</p>
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b9488]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar proveedor o uso…" className={`${inputClass} pl-10`} />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(Object.keys(CATEGORY_LABELS) as Array<'all' | ProviderCategory>).map((key) => (
            <button key={key} type="button" onClick={() => setCategory(key)} className={`shrink-0 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[.13em] transition ${category === key ? 'bg-[#171612] text-white' : 'border border-black/10 bg-white/55 text-[#716b60] hover:bg-white'}`}>
              {CATEGORY_LABELS[key]}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'connected', 'pending'] as const).map((key) => (
            <button key={key} type="button" onClick={() => setStatusFilter(key)} className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold transition ${statusFilter === key ? 'bg-[#ffb000]/12 text-[#8e5c00]' : 'bg-black/4 text-[#817a6f]'}`}>
              {key === 'all' ? 'Todos' : key === 'connected' ? 'Configurados' : 'Pendientes'}
            </button>
          ))}
        </div>
      </AdminCard>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-[#817a6f]"><Loader2 className="h-4 w-4 animate-spin" /> Cargando integraciones…</div>
      ) : visibleProviders.length === 0 ? (
        <AdminCard className="py-14 text-center"><p className="font-black text-[#171612]">No hay integraciones para este filtro.</p><p className="mt-2 text-sm text-[#817a6f]">Cambia la categoría, estado o búsqueda.</p></AdminCard>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleProviders.map((provider) => {
            const status = integrations[provider.id];
            const configured = providerConfigured(status);
            const fieldCount = configuredFieldCount(status);
            const test = tests[provider.id];
            const message = messages[provider.id];
            const isOpen = expanded === provider.id;
            const isWorking = working?.endsWith(`:${provider.id}`) ?? false;
            const snapshot = quota[provider.id];
            const Icon = provider.icon;

            return (
              <AdminCard key={provider.id} as="article" className="p-0 sm:p-0">
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ffb000]/10 text-[#a56600]"><Icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-[#171612]">{provider.label}</h3>
                        <StatusPill configured={configured} test={test} />
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[#817a6f]">{provider.description}</p>
                      <p className="mt-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#aaa294]">{CATEGORY_LABELS[provider.category]} · {fieldCount}/{provider.fields.length} campos · {formatUpdated(status?.updated_at)}</p>
                    </div>
                    <button type="button" onClick={() => setExpanded(isOpen ? null : provider.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-black/10 bg-white/60 text-[#716b60]" aria-label={isOpen ? 'Cerrar' : 'Abrir'}>
                      <ChevronDown className={`h-4 w-4 transition ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {snapshot ? <div className="mt-4"><QuotaBar provider={provider.id} used={snapshot.used} limit={snapshot.limit} capturedAt={snapshot.capturedAt} unit={unitForProvider(provider.id)} /></div> : null}
                </div>

                {isOpen ? (
                  <div className="border-t border-black/8 px-4 py-4 sm:px-5 sm:py-5">
                    <div className="flex flex-wrap gap-1.5">
                      {provider.uses.map((use) => <span key={use} className="rounded-full bg-black/4 px-2.5 py-1 text-[10px] font-semibold text-[#716b60]">{use}</span>)}
                    </div>

                    {test ? (
                      <div className={`mt-4 rounded-xl border px-3.5 py-3 text-xs ${test.ok ? 'border-emerald-600/15 bg-emerald-500/7 text-emerald-900' : 'border-rose-600/15 bg-rose-500/7 text-rose-900'}`}>
                        <p className="font-black">{test.ok ? 'Prueba correcta' : 'Prueba con observaciones'}</p>
                        {test.error ? <p className="mt-1">{test.error}</p> : null}
                        {test.checks?.length ? <div className="mt-2 space-y-1">{test.checks.map((check) => <p key={`${check.name}-${check.detail}`} className="flex gap-2"><span>{check.ok ? '✓' : '×'}</span><span><strong>{check.name}</strong>{check.detail ? ` · ${check.detail}` : ''}</span></p>)}</div> : null}
                      </div>
                    ) : null}

                    {message ? <div className={`mt-4 rounded-xl border px-3.5 py-3 text-xs font-medium ${message.type === 'success' ? 'border-emerald-600/15 bg-emerald-500/7 text-emerald-900' : 'border-rose-600/15 bg-rose-500/7 text-rose-900'}`}>{message.text}</div> : null}

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {provider.fields.map((field) => {
                        const saved = status?.credentials?.[field.key];
                        return (
                          <label key={field.key} className="block min-w-0">
                            <span className="mb-2 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[.14em] text-[#8f887c]">
                              <span>{field.label}</span>
                              {saved?.set ? <span className="normal-case tracking-normal text-emerald-700">{saved.preview || 'Configurado'}</span> : null}
                            </span>
                            {canManage ? (
                              <input type={field.type ?? 'text'} autoComplete="off" value={inputs[provider.id]?.[field.key] ?? ''} onChange={(event) => updateInput(provider.id, field.key, event.target.value)} placeholder={saved?.set ? 'Deja vacío para conservar el valor actual' : field.placeholder} className={inputClass} />
                            ) : (
                              <div className="rounded-xl border border-black/8 bg-black/3 px-3.5 py-3 text-sm font-mono text-[#716b60]">{saved?.set ? saved.preview || '••••' : 'No configurado'}</div>
                            )}
                            {field.hint ? <span className="mt-1 block text-[11px] leading-5 text-[#9a9388]">{field.hint}</span> : null}
                          </label>
                        );
                      })}
                    </div>

                    {!canManage ? <p className="mt-4 rounded-xl bg-[#ffb000]/8 px-3.5 py-3 text-xs leading-5 text-[#7b5a1d]">Tu rol puede revisar el estado y ejecutar pruebas, pero solo Root puede modificar credenciales.</p> : null}

                    <div className="mt-5 flex flex-wrap gap-2">
                      {TESTABLE_PROVIDERS.has(provider.id) ? (
                        <button type="button" onClick={() => void testProvider(provider)} disabled={working !== null || !configured} className={secondaryButton}>
                          {working === `test:${provider.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Probar
                        </button>
                      ) : null}

                      {provider.portalUrl ? <a href={provider.portalUrl} target="_blank" rel="noreferrer" className={secondaryButton}><ExternalLink className="h-3.5 w-3.5" /> Portal</a> : null}

                      {OAUTH_PROVIDERS.has(provider.id) && canManage ? (
                        <button type="button" onClick={() => startOAuth(provider)} disabled={working !== null} className={primaryButton}><KeyRound className="h-3.5 w-3.5" /> {configured ? 'Reconectar OAuth' : 'Conectar OAuth'}</button>
                      ) : null}

                      {canManage ? (
                        <button type="button" onClick={() => void saveProvider(provider)} disabled={working !== null} className={primaryButton}>
                          {working === `save:${provider.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Guardar cambios
                        </button>
                      ) : null}

                      {provider.id === 'resend' && configured && canManage ? <button type="button" onClick={() => void rotateResend()} disabled={working !== null} className={secondaryButton}>Rotar key</button> : null}

                      {configured && OAUTH_PROVIDERS.has(provider.id) && canManage ? <button type="button" onClick={() => void revokeOAuth(provider)} disabled={working !== null} className={dangerButton}>Desconectar OAuth</button> : null}
                      {configured && !OAUTH_PROVIDERS.has(provider.id) && canManage ? <button type="button" onClick={() => void deleteProvider(provider)} disabled={working !== null} className={dangerButton}><Trash2 className="h-3.5 w-3.5" /> Eliminar</button> : null}
                    </div>
                  </div>
                ) : null}
              </AdminCard>
            );
          })}
        </div>
      )}
    </AdminPage>
  );
}
