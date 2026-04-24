'use client';

import { useEffect, useState } from 'react';
import { insforge } from '@/lib/insforge';
import { Save, Eye, EyeOff, Check, Info, UserCog, KeyRound, Trash2, CheckCircle2 } from 'lucide-react';

/* ── Integraciones de APIs externas ── */
type ProviderKey = 'meta' | 'google' | 'google_ads' | 'tiktok';

interface ProviderField {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'password';
}

interface ProviderDefinition {
  id: ProviderKey;
  label: string;
  description: string;
  fields: ProviderField[];
}

const PROVIDERS: ProviderDefinition[] = [
  {
    id: 'meta',
    label: 'Meta · Facebook / Instagram Ads',
    description: 'Token de acceso y IDs de página/cuenta publicitaria para publicar y leer datos de Meta (Facebook + Instagram) en tiempo real.',
    fields: [
      { key: 'access_token', label: 'Access token', type: 'password', placeholder: 'EAAG...' },
      { key: 'ad_account_id', label: 'Ad account ID', placeholder: '1234567890' },
      // `page_id` kept as the stored key for backward compatibility with rows
      // created by older versions of the admin. The server-side resolver in
      // `src/lib/metaCredentials.ts` accepts both `facebook_page_id` and `page_id`.
      { key: 'page_id', label: 'Facebook Page ID', placeholder: '1000000000' },
      { key: 'instagram_business_id', label: 'Instagram Business ID', placeholder: '17841400000000000' },
    ],
  },
  {
    id: 'google',
    label: 'Google APIs',
    description: 'Credenciales de Google para Login, Maps, Analytics u otros servicios OAuth.',
    fields: [
      { key: 'client_id', label: 'OAuth client ID', placeholder: 'xxxxx.apps.googleusercontent.com' },
      { key: 'client_secret', label: 'OAuth client secret', type: 'password' },
      { key: 'refresh_token', label: 'Refresh token', type: 'password' },
    ],
  },
  {
    id: 'google_ads',
    label: 'Google Ads',
    description: 'Developer token + Customer ID para consumir Google Ads API (requiere OAuth refresh token).',
    fields: [
      { key: 'developer_token', label: 'Developer token', type: 'password' },
      { key: 'customer_id', label: 'Customer ID', placeholder: '123-456-7890' },
      { key: 'login_customer_id', label: 'Login customer ID (MCC)', placeholder: '987-654-3210' },
    ],
  },
  {
    id: 'tiktok',
    label: 'TikTok for Business · Ads',
    description: 'Access token y Advertiser ID para TikTok Marketing API.',
    fields: [
      { key: 'access_token', label: 'Access token', type: 'password' },
      { key: 'advertiser_id', label: 'Advertiser ID', placeholder: '7123456789012345678' },
    ],
  },
];

interface ProviderStatus {
  credentials: Record<string, { set: boolean; preview: string }>;
  updated_at?: string;
}

/* ── Input reutilizable ── */
function Field({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled,
  hint,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{label}</label>
      <div className="relative">
        <input
          type={isPassword ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-yellow-400/50 transition-colors disabled:opacity-40 pr-12"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-zinc-600">{hint}</p>}
    </div>
  );
}

/* ── Toast ── */
function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  if (!msg) return null;
  return (
    <div
      className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
        type === 'success'
          ? 'border-green-500/30 bg-green-500/10 text-green-400'
          : 'border-red-500/30 bg-red-500/10 text-red-400'
      }`}
    >
      {type === 'success' && <Check className="w-4 h-4 flex-shrink-0" />}
      {msg}
    </div>
  );
}

/* ── Sección de card ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-8">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 mb-6">{title}</h2>
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   PÁGINA PRINCIPAL
════════════════════════════════════════════════ */
export default function ConfiguracionPage() {
  /* ── Estado del negocio ── */
  const [negocio, setNegocio] = useState({
    nombre: '',
    rut: '',
    direccion: '',
    ciudad: '',
    whatsapp: '',
    emailContacto: '',
    sitioWeb: '',
  });

  const [savingNegocio, setSavingNegocio] = useState(false);
  const [negocioMsg, setNegocioMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  /* ── Estado de contraseña ── */
  type PwdStep = 'email' | 'code';
  const [pwdStep, setPwdStep] = useState<PwdStep>('email');
  const [pwdEmail, setPwdEmail] = useState('');
  const [pwdCode, setPwdCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  /* ── Estado de la sesión actual del admin ── */
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(true);

  /* ── Integraciones de APIs externas ── */
  const [integrations, setIntegrations] = useState<Record<string, ProviderStatus>>({});
  const [integrationInputs, setIntegrationInputs] = useState<Record<string, Record<string, string>>>({});
  const [integrationMsg, setIntegrationMsg] = useState<Record<string, { text: string; type: 'success' | 'error' } | null>>({});
  const [savingIntegration, setSavingIntegration] = useState<string | null>(null);
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);
  const [integrationsError, setIntegrationsError] = useState<string | null>(null);
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);
  const [integrationTest, setIntegrationTest] = useState<Record<string, { ok: boolean; error?: string; checks?: Array<{ name: string; ok: boolean; detail?: string }> } | null>>({});

  async function loadIntegrations() {
    setLoadingIntegrations(true);
    setIntegrationsError(null);
    try {
      const res = await fetch('/api/admin/integrations', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        setIntegrationsError(json.hint ?? json.error ?? 'No se pudieron leer las integraciones.');
        return;
      }
      setIntegrations(json.providers ?? {});
    } catch {
      setIntegrationsError('Error de red al consultar integraciones.');
    } finally {
      setLoadingIntegrations(false);
    }
  }

  useEffect(() => {
    void loadIntegrations();
  }, []);

  async function handleSaveIntegration(provider: ProviderKey) {
    const credentials = integrationInputs[provider] ?? {};
    const hasInput = Object.values(credentials).some((v) => v && v.trim().length > 0);
    if (!hasInput) {
      setIntegrationMsg((prev) => ({ ...prev, [provider]: { text: 'Ingresa al menos un campo para guardar.', type: 'error' } }));
      return;
    }
    setSavingIntegration(provider);
    setIntegrationMsg((prev) => ({ ...prev, [provider]: null }));
    try {
      const res = await fetch('/api/admin/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, credentials }),
      });
      const json = await res.json();
      if (!res.ok) {
        setIntegrationMsg((prev) => ({ ...prev, [provider]: { text: json.hint ?? json.error ?? 'Error al guardar.', type: 'error' } }));
        return;
      }
      setIntegrationMsg((prev) => ({ ...prev, [provider]: { text: 'Credenciales guardadas en InsForge.', type: 'success' } }));
      setIntegrationInputs((prev) => ({ ...prev, [provider]: {} }));
      await loadIntegrations();
    } catch {
      setIntegrationMsg((prev) => ({ ...prev, [provider]: { text: 'Error de red.', type: 'error' } }));
    } finally {
      setSavingIntegration(null);
    }
  }

  async function handleTestIntegration(provider: ProviderKey) {
    setTestingIntegration(provider);
    setIntegrationTest((prev) => ({ ...prev, [provider]: null }));
    try {
      const res = await fetch(`/api/admin/integrations/test?provider=${encodeURIComponent(provider)}`, { cache: 'no-store' });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        checks?: Array<{ name: string; ok: boolean; detail?: string }>;
      };
      setIntegrationTest((prev) => ({
        ...prev,
        [provider]: {
          ok: !!json.ok,
          error: json.error,
          checks: json.checks,
        },
      }));
    } catch (err) {
      setIntegrationTest((prev) => ({
        ...prev,
        [provider]: { ok: false, error: err instanceof Error ? err.message : 'Error de red.' },
      }));
    } finally {
      setTestingIntegration(null);
    }
  }

  async function handleDeleteIntegration(provider: ProviderKey) {
    if (typeof window !== 'undefined' && !window.confirm(`¿Eliminar credenciales de ${provider.toUpperCase()}?`)) return;
    setSavingIntegration(provider);
    setIntegrationMsg((prev) => ({ ...prev, [provider]: null }));
    try {
      const res = await fetch(`/api/admin/integrations?provider=${encodeURIComponent(provider)}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        setIntegrationMsg((prev) => ({ ...prev, [provider]: { text: json.error ?? 'Error al eliminar.', type: 'error' } }));
        return;
      }
      setIntegrationMsg((prev) => ({ ...prev, [provider]: { text: 'Credenciales eliminadas.', type: 'success' } }));
      setIntegrationInputs((prev) => ({ ...prev, [provider]: {} }));
      await loadIntegrations();
    } catch {
      setIntegrationMsg((prev) => ({ ...prev, [provider]: { text: 'Error de red.', type: 'error' } }));
    } finally {
      setSavingIntegration(null);
    }
  }

  useEffect(() => {
    async function loadAdminSession() {
      try {
        const res = await fetch('/api/admin/me', { cache: 'no-store' });
        if (!res.ok) {
          setAdminEmail(null);
          return;
        }
        const json = (await res.json()) as { authenticated?: boolean; email?: string };
        if (json.authenticated && typeof json.email === 'string') {
          setAdminEmail(json.email);
          setPwdEmail(json.email);
        }
      } catch {
        setAdminEmail(null);
      } finally {
        setLoadingAdmin(false);
      }
    }

    void loadAdminSession();
  }, []);

  useEffect(() => {
    async function loadBusinessConfig() {
      const { data, error } = await insforge.database
        .from('business_config')
        .select('id, nombre, rut, direccion, ciudad, whatsapp, email_contacto, sitio_web')
        .eq('id', 'main')
        .limit(1);

      if (error || !Array.isArray(data) || data.length === 0) {
        return;
      }

      const config = data[0] as {
        nombre?: string;
        rut?: string;
        direccion?: string;
        ciudad?: string;
        whatsapp?: string;
        email_contacto?: string;
        sitio_web?: string;
      };

      setNegocio({
        nombre: config.nombre ?? '',
        rut: config.rut ?? '',
        direccion: config.direccion ?? '',
        ciudad: config.ciudad ?? '',
        whatsapp: config.whatsapp ?? '',
        emailContacto: config.email_contacto ?? '',
        sitioWeb: config.sitio_web ?? '',
      });
    }

    void loadBusinessConfig();
  }, []);

  /* ── Guardar datos del negocio (upsert en tabla business_config) ── */
  async function handleSaveNegocio(e: React.FormEvent) {
    e.preventDefault();
    setSavingNegocio(true);
    setNegocioMsg(null);

    const { error } = await insforge.database
      .from('business_config')
      .upsert([
        {
          id: 'main',
          nombre: negocio.nombre,
          rut: negocio.rut,
          direccion: negocio.direccion,
          ciudad: negocio.ciudad,
          whatsapp: negocio.whatsapp,
          email_contacto: negocio.emailContacto,
          sitio_web: negocio.sitioWeb,
          updated_at: new Date().toISOString(),
        },
      ]);

    setSavingNegocio(false);
    if (error) {
      setNegocioMsg({ text: `Error al guardar: ${error.message}`, type: 'error' });
    } else {
      setNegocioMsg({ text: 'Datos del negocio guardados correctamente.', type: 'success' });
    }
  }

  /* ── Enviar código de reseteo ── */
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    if (!pwdEmail) { setPasswordMsg({ text: 'Ingresa tu email de admin.', type: 'error' }); return; }
    setSavingPassword(true);
    await insforge.auth.sendResetPasswordEmail({
      email: pwdEmail,
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/admin/configuracion` : '/admin/configuracion',
    });
    setSavingPassword(false);
    setPasswordMsg({ text: 'Si el correo existe, recibirás un código en minutos.', type: 'success' });
    setPwdStep('code');
  }

  /* ── Cambiar contraseña del admin ── */
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);

    if (!pwdCode || !newPassword) {
      setPasswordMsg({ text: 'Completa todos los campos.', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'Las contraseñas nuevas no coinciden.', type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ text: 'La nueva contraseña debe tener al menos 6 caracteres.', type: 'error' });
      return;
    }

    setSavingPassword(true);

    // Intercambiar código por token
    const { data: tokenData, error: tokenErr } = await insforge.auth.exchangeResetPasswordToken({
      email: pwdEmail,
      code: pwdCode,
    });

    if (tokenErr || !tokenData?.token) {
      setSavingPassword(false);
      setPasswordMsg({ text: tokenErr?.message ?? 'Código inválido o expirado.', type: 'error' });
      return;
    }

    const { error } = await insforge.auth.resetPassword({
      newPassword,
      otp: tokenData.token,
    });

    setSavingPassword(false);

    if (error) {
      setPasswordMsg({ text: `Error: ${error.message}`, type: 'error' });
    } else {
      setPasswordMsg({ text: 'Contraseña actualizada correctamente.', type: 'success' });
      setPwdStep('email');
      setPwdEmail('');
      setPwdCode('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-playfair text-3xl sm:text-4xl font-bold text-white">Configuración</h1>
        <p className="text-zinc-400 text-sm mt-1">Datos del negocio, credenciales de acceso e integraciones con APIs externas.</p>
      </div>

      <div className="flex flex-col gap-8 max-w-3xl">
        {/* ── Sesión actual del admin ── */}
        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 mb-4">Sesión actual</h2>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center">
              <UserCog className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest text-zinc-500">Admin conectado</p>
              {loadingAdmin ? (
                <p className="text-white text-sm mt-1">Cargando…</p>
              ) : adminEmail ? (
                <p className="text-white text-sm font-medium truncate mt-1">{adminEmail}</p>
              ) : (
                <p className="text-zinc-500 text-sm mt-1">No se pudo leer la sesión.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Datos del negocio ── */}
        <form onSubmit={handleSaveNegocio}>
          <Section title="Datos del negocio">
            <Field
              label="Nombre del negocio"
              value={negocio.nombre}
              onChange={(v) => setNegocio((p) => ({ ...p, nombre: v }))}
              placeholder="Fabrick Ingeniería Residencial"
            />
            <Field
              label="RUT empresa"
              value={negocio.rut}
              onChange={(v) => setNegocio((p) => ({ ...p, rut: v }))}
              placeholder="76.543.210-9"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field
                label="Dirección"
                value={negocio.direccion}
                onChange={(v) => setNegocio((p) => ({ ...p, direccion: v }))}
                placeholder="Av. Principal 1234"
              />
              <Field
                label="Ciudad"
                value={negocio.ciudad}
                onChange={(v) => setNegocio((p) => ({ ...p, ciudad: v }))}
                placeholder="Santiago"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field
                label="WhatsApp de contacto"
                type="tel"
                value={negocio.whatsapp}
                onChange={(v) => setNegocio((p) => ({ ...p, whatsapp: v }))}
                placeholder="+56 9 1234 5678"
                hint="Se usará para el botón de contacto directo."
              />
              <Field
                label="Email de contacto"
                type="email"
                value={negocio.emailContacto}
                onChange={(v) => setNegocio((p) => ({ ...p, emailContacto: v }))}
                placeholder="contacto@fabrick.cl"
                hint="Correo visible para clientes."
              />
            </div>
            <Field
              label="Sitio web"
              type="url"
              value={negocio.sitioWeb}
              onChange={(v) => setNegocio((p) => ({ ...p, sitioWeb: v }))}
              placeholder="https://fabrick.cl"
            />

            {negocioMsg && <Toast msg={negocioMsg.text} type={negocioMsg.type} />}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingNegocio}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-yellow-400 text-black text-sm font-bold uppercase tracking-widest hover:bg-yellow-300 transition-colors disabled:opacity-60"
              >
                {savingNegocio ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Guardando…
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Guardar cambios
                  </>
                )}
              </button>
            </div>
          </Section>
        </form>

        {/* ── Integraciones de APIs externas ── */}
        <div className="rounded-[2rem] border border-yellow-400/20 bg-[linear-gradient(180deg,rgba(24,24,27,0.9),rgba(0,0,0,0.9))] p-6 sm:p-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/10 border border-yellow-400/30">
              <KeyRound className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-yellow-400">Integraciones externas</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Las claves se guardan cifradas en InsForge (tabla <code className="px-1 rounded bg-zinc-900 text-zinc-300">integrations</code>) y se cargan automáticamente en cada sesión.
              </p>
            </div>
          </div>

          {integrationsError && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
              {integrationsError}
            </div>
          )}

          <div className="flex flex-col gap-5">
            {PROVIDERS.map((prov) => {
              const status = integrations[prov.id];
              const inputs = integrationInputs[prov.id] ?? {};
              const msg = integrationMsg[prov.id];
              const isConfigured = status && Object.values(status.credentials).some((c) => c.set);
              return (
                <div key={prov.id} className="rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-5">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">{prov.label}</p>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                            isConfigured
                              ? 'border-green-500/30 bg-green-500/10 text-green-400'
                              : 'border-zinc-700 bg-zinc-900 text-zinc-500'
                          }`}
                        >
                          {isConfigured && <CheckCircle2 className="h-3 w-3" />}
                          {isConfigured ? 'Conectado' : 'No configurado'}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{prov.description}</p>
                      {status?.updated_at && (
                        <p className="mt-1 text-[10px] text-zinc-600">
                          Actualizado: {new Date(status.updated_at).toLocaleString('es-CL')}
                        </p>
                      )}
                    </div>
                    {isConfigured && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteIntegration(prov.id)}
                        disabled={savingIntegration === prov.id}
                        className="flex items-center gap-1.5 rounded-full border border-red-500/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-red-400 transition hover:border-red-500/50 hover:bg-red-500/10 disabled:opacity-50 shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                        Eliminar
                      </button>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {prov.fields.map((field) => {
                      const existing = status?.credentials?.[field.key];
                      return (
                        <Field
                          key={field.key}
                          label={field.label}
                          type={field.type ?? 'text'}
                          value={inputs[field.key] ?? ''}
                          onChange={(v) =>
                            setIntegrationInputs((prev) => ({
                              ...prev,
                              [prov.id]: { ...(prev[prov.id] ?? {}), [field.key]: v },
                            }))
                          }
                          placeholder={existing?.set ? existing.preview : (field.placeholder ?? '')}
                          hint={existing?.set ? 'Valor actual oculto. Deja vacío para mantenerlo.' : undefined}
                          disabled={loadingIntegrations || savingIntegration === prov.id}
                        />
                      );
                    })}
                  </div>

                  {msg && <div className="mt-3"><Toast msg={msg.text} type={msg.type} /></div>}

                  {integrationTest[prov.id] && (
                    <div
                      className={`mt-3 rounded-xl border px-3 py-2 text-[11px] ${
                        integrationTest[prov.id]?.ok
                          ? 'border-green-500/30 bg-green-500/10 text-green-300'
                          : 'border-red-500/30 bg-red-500/10 text-red-300'
                      }`}
                    >
                      <p className="font-bold uppercase tracking-widest text-[10px]">
                        {integrationTest[prov.id]?.ok ? '✓ Conexión correcta' : '✕ Falla de conexión'}
                      </p>
                      {integrationTest[prov.id]?.error && (
                        <p className="mt-1 leading-relaxed">{integrationTest[prov.id]?.error}</p>
                      )}
                      {integrationTest[prov.id]?.checks && integrationTest[prov.id]!.checks!.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {integrationTest[prov.id]!.checks!.map((check, idx) => (
                            <li key={idx} className="flex gap-2">
                              <span aria-hidden>{check.ok ? '✓' : '✕'}</span>
                              <span>
                                <span className="font-semibold">{check.name}</span>
                                {check.detail && <span className="text-zinc-400"> — {check.detail}</span>}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    {prov.id === 'meta' && (
                      <button
                        type="button"
                        onClick={() => void handleTestIntegration(prov.id)}
                        disabled={testingIntegration === prov.id || savingIntegration === prov.id}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/20 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-white/5 transition-colors disabled:opacity-60"
                      >
                        {testingIntegration === prov.id ? 'Probando…' : 'Probar conexión'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleSaveIntegration(prov.id)}
                      disabled={savingIntegration === prov.id || loadingIntegrations}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-yellow-400 text-black text-[11px] font-bold uppercase tracking-widest hover:bg-yellow-300 transition-colors disabled:opacity-60"
                    >
                      {savingIntegration === prov.id ? (
                        <>
                          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Guardando…
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          Guardar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Cambiar contraseña ── */}
        <form onSubmit={pwdStep === 'email' ? handleSendCode : handleChangePassword}>
          <Section title="Cambiar contraseña del admin">
            {pwdStep === 'email' ? (
              <>
                <Field
                  label="Email del admin"
                  type="email"
                  value={pwdEmail}
                  onChange={setPwdEmail}
                  placeholder="feduardomsz@gmail.com"
                  hint={
                    adminEmail && pwdEmail === adminEmail
                      ? 'Prellenado con el email de tu sesión actual. Recibirás un código en este correo.'
                      : 'Recibirás un código de verificación en este correo.'
                  }
                />
                {passwordMsg && <Toast msg={passwordMsg.text} type={passwordMsg.type} />}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="flex items-center gap-2 px-6 py-3 rounded-full border border-yellow-400/30 text-yellow-400 text-sm font-bold uppercase tracking-widest hover:bg-yellow-400/10 transition-colors disabled:opacity-60"
                  >
                    {savingPassword ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Enviando…
                      </>
                    ) : (
                      'Enviar código de verificación'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-zinc-500">
                  Se envió un código a <span className="text-yellow-400">{pwdEmail}</span>.{' '}
                  <button type="button" onClick={() => { setPwdStep('email'); setPasswordMsg(null); }} className="underline hover:text-zinc-300 transition-colors">
                    Cambiar email
                  </button>
                </p>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Código de 6 dígitos</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={pwdCode}
                    onChange={(e) => setPwdCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-5 py-4 text-white text-2xl font-bold tracking-[0.5em] text-center placeholder:text-zinc-600 focus:outline-none focus:border-yellow-400/50 transition-colors"
                  />
                </div>
                <Field
                  label="Nueva contraseña"
                  type="password"
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="Mínimo 6 caracteres"
                />
                <Field
                  label="Confirmar nueva contraseña"
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Repite la nueva contraseña"
                />
                {passwordMsg && <Toast msg={passwordMsg.text} type={passwordMsg.type} />}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="flex items-center gap-2 px-6 py-3 rounded-full border border-yellow-400/30 text-yellow-400 text-sm font-bold uppercase tracking-widest hover:bg-yellow-400/10 transition-colors disabled:opacity-60"
                  >
                    {savingPassword ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Actualizando…
                      </>
                    ) : (
                      'Cambiar contraseña'
                    )}
                  </button>
                </div>
              </>
            )}
          </Section>
        </form>

        {/* ── Nota informativa ── */}
        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5 flex gap-3">
          <Info className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-zinc-400 leading-relaxed">
            ¿Necesitas cambiar el <span className="text-zinc-200">email</span> o el{' '}
            <span className="text-zinc-200">nombre</span> del admin? Hazlo desde el panel de InsForge
            (Auth → Users) o desde la tabla <code className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/10 text-zinc-300">admin_users</code>{' '}
            (Database → Tables). El SDK no expone esos cambios directamente.
          </p>
        </div>
      </div>
    </div>
  );
}
