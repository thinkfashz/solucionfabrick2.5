'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Copy, CreditCard, ExternalLink, Loader2, RefreshCw, Save, ShieldCheck, TestTube2, Webhook } from 'lucide-react';

type LabStatus = {
  ready: boolean;
  mode: 'production' | 'sandbox' | 'unknown';
  tokenPrefix: string;
  publicKeyPreview: string;
  accessTokenPreview: string;
  webhookSecretPreview: string;
  encryptedAtRest: boolean;
  account: { id: string | number | null; email: string | null; nickname: string | null; siteId: string | null; isTestUser: boolean } | null;
  message: string;
};

type PreferenceResult = {
  ok: boolean;
  preference: { id: string; init_point?: string; sandbox_init_point?: string };
  externalReference: string;
  webhookUrl: string;
  checkoutUrl: string | null;
  mode: string;
};

type LabEvent = {
  id: string;
  receivedAt: string;
  method: string;
  query: Record<string, string>;
  body: unknown;
  paymentId?: string;
  type?: string;
  topic?: string;
  action?: string;
  payment?: Record<string, unknown> | null;
};

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function maskMode(mode: string) {
  if (mode === 'sandbox') return 'TEST / Sandbox';
  if (mode === 'production') return 'Producción';
  return 'Desconocido';
}

function statusColor(status?: unknown) {
  const s = String(status || '').toLowerCase();
  if (s === 'approved') return 'text-emerald-300';
  if (s === 'pending' || s === 'in_process' || s === 'authorized') return 'text-amber-300';
  if (s) return 'text-rose-300';
  return 'text-zinc-400';
}

async function readJson<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json as T;
}

export default function MercadoPagoLabClient() {
  const [status, setStatus] = useState<LabStatus | null>(null);
  const [publicKey, setPublicKey] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [title, setTitle] = useState('Compra demo Soluciones Fabrick');
  const [amount, setAmount] = useState(1000);
  const [email, setEmail] = useState('test_user_123@testuser.com');
  const [paymentId, setPaymentId] = useState('');
  const [preference, setPreference] = useState<PreferenceResult | null>(null);
  const [events, setEvents] = useState<LabEvent[]>([]);
  const [paymentResult, setPaymentResult] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const baseWebhook = useMemo(() => typeof window === 'undefined' ? '/api/admin/mercadopago-lab/webhook' : `${window.location.origin}/api/admin/mercadopago-lab/webhook`, []);

  async function loadStatus() {
    setBusy('status');
    try {
      const json = await readJson<LabStatus>(await fetch('/api/admin/mercadopago-lab/credentials', { cache: 'no-store' }));
      setStatus(json);
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function loadEvents() {
    try {
      const json = await readJson<{ events: LabEvent[] }>(await fetch('/api/admin/mercadopago-lab/events', { cache: 'no-store' }));
      setEvents(json.events || []);
    } catch {
      setEvents([]);
    }
  }

  useEffect(() => { void loadStatus(); void loadEvents(); }, []);

  async function saveCredentials() {
    setBusy('save');
    setNotice('');
    try {
      const json = await readJson<LabStatus & { ok: boolean }>(await fetch('/api/admin/mercadopago-lab/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey, accessToken, webhookSecret }),
      }));
      setStatus(json);
      setPublicKey('');
      setAccessToken('');
      setWebhookSecret('');
      setNotice('Credenciales demo guardadas en BD sin tocar la pasarela real.');
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function createPreference() {
    setBusy('preference');
    setNotice('');
    try {
      const json = await readJson<PreferenceResult>(await fetch('/api/admin/mercadopago-lab/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, amount, email, quantity: 1 }),
      }));
      setPreference(json);
      setNotice(`Preferencia creada: ${json.preference.id}. Abre el checkout y paga con usuario/tarjeta de prueba.`);
      void loadEvents();
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function checkPayment() {
    if (!paymentId.trim()) return setNotice('Pega un payment_id para consultar.');
    setBusy('payment');
    try {
      const json = await readJson<{ payment: Record<string, unknown> }>(await fetch(`/api/admin/mercadopago-lab/payment?id=${encodeURIComponent(paymentId.trim())}`, { cache: 'no-store' }));
      setPaymentResult(json.payment);
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setNotice('Copiado al portapapeles.');
  }

  return <main className="min-h-screen bg-[#050505] px-4 py-6 text-white md:px-6">
    <div className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="space-y-5">
        <header className="rounded-[2rem] border border-amber-300/20 bg-[radial-gradient(circle_at_90%_0%,rgba(245,158,11,.24),transparent_28rem),linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.02))] p-5 shadow-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.28em] text-amber-200"><TestTube2 className="h-3.5 w-3.5" /> Laboratorio aislado</p>
          <h1 className="mt-4 text-4xl font-black tracking-[-.06em] md:text-6xl">MercadoPago Lab</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">Prueba credenciales demo, crea una compra de prueba y verifica webhook sin modificar la pasarela real de la tienda.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <Metric label="Estado" value={status?.ready ? 'Listo' : 'Pendiente'} good={status?.ready} />
            <Metric label="Modo" value={maskMode(status?.mode || 'unknown')} good={status?.mode === 'sandbox'} />
            <Metric label="Token" value={status?.tokenPrefix ? `${status.tokenPrefix}-…` : '—'} />
            <Metric label="Cifrado BD" value={status?.encryptedAtRest ? 'Activo' : 'No configurado'} good={status?.encryptedAtRest} />
          </div>
        </header>

        {notice && <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100">{notice}</div>}

        <section className="grid gap-5 lg:grid-cols-2">
          <Card title="1. Credenciales demo" icon={<ShieldCheck className="h-5 w-5" />} subtitle="Se guardan en integrations.provider = mercadopago_lab. No pisan mercadopago.">
            <div className="grid gap-3">
              <Input label="Public Key TEST" value={publicKey} onChange={setPublicKey} placeholder="TEST-xxxxxxxx" />
              <Input label="Access Token TEST" value={accessToken} onChange={setAccessToken} placeholder="TEST-xxxxxxxx" secret />
              <Input label="Webhook secret / signature secret opcional" value={webhookSecret} onChange={setWebhookSecret} placeholder="Opcional" secret />
              <button onClick={saveCredentials} disabled={busy === 'save'} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-black disabled:opacity-60">{busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar credenciales demo</button>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/35 p-3 text-xs leading-5 text-zinc-400">
              <b className="text-white">Actual:</b> Public Key {status?.publicKeyPreview || '—'} · Access Token {status?.accessTokenPreview || '—'} · Secret {status?.webhookSecretPreview || '—'}
            </div>
          </Card>

          <Card title="2. Compra directa de prueba" icon={<CreditCard className="h-5 w-5" />} subtitle="Crea una preferencia Checkout Pro de prueba y abre el pago en Mercado Pago.">
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Producto demo" value={title} onChange={setTitle} />
              <NumberInput label="Monto CLP" value={amount} onChange={setAmount} />
              <div className="md:col-span-2"><Input label="Email comprador test" value={email} onChange={setEmail} /></div>
            </div>
            <button onClick={createPreference} disabled={busy === 'preference'} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-black disabled:opacity-60">{busy === 'preference' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Crear compra demo {money.format(amount)}</button>
            {preference && <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
              <p><b>Preference ID:</b> {preference.preference.id}</p>
              <p className="mt-1 break-all"><b>External ref:</b> {preference.externalReference}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {preference.checkoutUrl && <a href={preference.checkoutUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-4 py-2 text-xs font-black text-black"><ExternalLink className="h-4 w-4" /> Abrir checkout demo</a>}
                <button onClick={() => copy(preference.webhookUrl)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white"><Copy className="h-4 w-4" /> Copiar webhook</button>
              </div>
            </div>}
          </Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Card title="3. Consultar pago" icon={<RefreshCw className="h-5 w-5" />} subtitle="Pega el payment_id que devuelve Mercado Pago o que aparece en el webhook.">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]"><Input label="Payment ID" value={paymentId} onChange={setPaymentId} placeholder="123456789" /><button onClick={checkPayment} disabled={busy === 'payment'} className="self-end rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-black text-black disabled:opacity-60">Consultar</button></div>
            {paymentResult && <pre className="mt-3 max-h-72 overflow-auto rounded-2xl border border-white/10 bg-black/45 p-3 text-xs text-zinc-300">{JSON.stringify(paymentResult, null, 2)}</pre>}
          </Card>

          <Card title="4. Webhook para configurar" icon={<Webhook className="h-5 w-5" />} subtitle="Copia esta URL en Mercado Pago Developers → Tu aplicación → Webhooks.">
            <div className="rounded-2xl border border-white/10 bg-black/45 p-3 font-mono text-xs text-zinc-200 break-all">{baseWebhook}</div>
            <button onClick={() => copy(baseWebhook)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white"><Copy className="h-4 w-4" /> Copiar URL webhook</button>
            <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100"><AlertTriangle className="mr-2 inline h-4 w-4" /> Esta URL es solo para laboratorio. No reemplaza `/api/payments/webhook?source=mercadopago` de tu checkout real.</div>
          </Card>
        </section>
      </section>

      <aside className="space-y-5">
        <Card title="Eventos recibidos" icon={<Webhook className="h-5 w-5" />} subtitle="Últimas notificaciones guardadas desde Mercado Pago Lab.">
          <button onClick={loadEvents} className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white"><RefreshCw className="h-4 w-4" /> Actualizar eventos</button>
          <div className="space-y-3">
            {events.length === 0 ? <p className="rounded-2xl border border-white/10 bg-black/35 p-4 text-sm text-zinc-400">Todavía no hay webhooks recibidos.</p> : events.slice(0, 10).map((event) => {
              const payment = event.payment || null;
              const payStatus = payment ? payment.status : undefined;
              return <article key={event.id} className="rounded-2xl border border-white/10 bg-black/35 p-3 text-xs">
                <div className="flex items-center justify-between gap-2"><b className="text-white">{event.type || event.topic || 'notification'}</b><span className="text-zinc-500">{new Date(event.receivedAt).toLocaleString('es-CL')}</span></div>
                <p className="mt-1 text-zinc-400">Payment ID: {event.paymentId || '—'}</p>
                <p className={`mt-1 font-black ${statusColor(payStatus)}`}>Estado: {String(payStatus || 'sin consulta')}</p>
              </article>;
            })}
          </div>
        </Card>

        <Card title="Checklist de prueba" icon={<CheckCircle2 className="h-5 w-5" />} subtitle="Orden recomendado para validar sin riesgo.">
          <ol className="space-y-3 text-sm leading-6 text-zinc-300">
            <li><b className="text-white">1.</b> Pega credenciales de prueba con prefijo <code className="rounded bg-white/10 px-1">TEST-</code>.</li>
            <li><b className="text-white">2.</b> Crea la compra demo y abre Checkout Pro.</li>
            <li><b className="text-white">3.</b> En Mercado Pago, inicia sesión con comprador de prueba y paga con tarjeta de prueba.</li>
            <li><b className="text-white">4.</b> Vuelve al admin, actualiza eventos y revisa payment_id/status.</li>
            <li><b className="text-white">5.</b> Configura la URL webhook del panel y repite la compra.</li>
          </ol>
        </Card>
      </aside>
    </div>
  </main>;
}

function Metric({ label, value, good }: { label: string; value: string; good?: boolean }) { return <div className="rounded-2xl border border-white/10 bg-black/30 p-4"><p className="text-[10px] font-black uppercase tracking-[.22em] text-zinc-500">{label}</p><p className={`mt-1 text-lg font-black ${good ? 'text-emerald-300' : 'text-white'}`}>{value}</p></div>; }
function Card({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: ReactNode; children: ReactNode }) { return <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-5 shadow-2xl shadow-black/30"><div className="mb-4 flex items-start gap-3"><div className="rounded-2xl bg-amber-400/10 p-2 text-amber-300 ring-1 ring-amber-300/25">{icon}</div><div><h2 className="text-xl font-black text-white">{title}</h2><p className="mt-1 text-xs leading-5 text-zinc-400">{subtitle}</p></div></div>{children}</section>; }
function Input({ label, value, onChange, placeholder, secret }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; secret?: boolean }) { return <label className="grid gap-1 text-xs font-black uppercase tracking-[.16em] text-zinc-500">{label}<input type={secret ? 'password' : 'text'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="rounded-2xl border border-white/10 bg-black/35 px-3 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-amber-300/70" /></label>; }
function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) { return <label className="grid gap-1 text-xs font-black uppercase tracking-[.16em] text-zinc-500">{label}<input type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} className="rounded-2xl border border-white/10 bg-black/35 px-3 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-amber-300/70" /></label>; }
