'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  Building2,
  CheckCircle2,
  FileKey2,
  FileText,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  Save,
  Server,
  ShieldCheck,
  ShoppingBag,
  TriangleAlert,
  Webhook,
} from 'lucide-react';

type FieldState = { set: boolean; preview: string; source?: string };
type OperationsData = {
  ok: boolean;
  mercadoPago: {
    connected: boolean;
    status: string;
    message: string;
    mode: 'production' | 'sandbox' | 'unknown';
    source: string;
    accessToken: FieldState;
    publicKey: FieldState;
    webhookSecret: FieldState;
    webhook: { endpoint: string; routeActive: boolean; signatureConfigured: boolean; ready: boolean };
    account: { id?: string | number | null; email?: string | null; nickname?: string | null; siteId?: string | null; isTestUser?: boolean } | null;
    latencyMs: number | null;
  };
  billing: {
    provider: string;
    providerName: string;
    configured: boolean;
    simulated: boolean;
    source: string;
    encryptedAtRest: boolean;
    missing: string[];
    fields: Record<string, FieldState>;
  };
  notifications: { emailReady: boolean; provider: string; source: string; notifyTo: string; notifyToSet: boolean };
  encryption: { configured: boolean };
  recentSales: Array<{
    id: string;
    customerName: string;
    customerEmail: string;
    total: number;
    currency: string;
    paymentId: string;
    paymentStatus: string;
    status: string;
    dispatchCode: string;
    trackingNumber: string;
    updatedAt: string;
    products: Array<{ name: string; quantity: number; unitPrice: number }>;
  }>;
};

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const inputClass = 'min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-300/45';

function Status({ ok, good = 'Operativo', bad = 'Pendiente' }: { ok: boolean; good?: string; bad?: string }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[.14em] ${ok ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-300'}`}>{ok ? <CheckCircle2 className="h-3 w-3"/> : <TriangleAlert className="h-3 w-3"/>}{ok ? good : bad}</span>;
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4 border-t border-white/8 py-2.5 text-xs"><span className="text-zinc-500">{label}</span><b className="max-w-[65%] break-words text-right text-zinc-200">{value || '—'}</b></div>;
}

export default function PaymentsOperationsPanel() {
  const [data, setData] = useState<OperationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [billing, setBilling] = useState({ api_key: '', rut_emisor: '', razon_social: '', giro: '', direccion: '', comuna: '', base_url: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/payments/operations', { cache: 'no-store', credentials: 'same-origin' });
      const json = await res.json().catch(() => null) as OperationsData | { error?: string } | null;
      if (!res.ok) throw new Error((json as { error?: string } | null)?.error || `HTTP ${res.status}`);
      const next = json as OperationsData;
      setData(next);
      setNotifyEmail(next.notifications.notifyTo || '');
      setBilling((current) => ({
        ...current,
        rut_emisor: next.billing.fields.rut_emisor?.set ? next.billing.fields.rut_emisor.preview : '',
        razon_social: next.billing.fields.razon_social?.set ? next.billing.fields.razon_social.preview : '',
        giro: next.billing.fields.giro?.set ? next.billing.fields.giro.preview : '',
        direccion: next.billing.fields.direccion?.set ? next.billing.fields.direccion.preview : '',
        comuna: next.billing.fields.comuna?.set ? next.billing.fields.comuna.preview : '',
        base_url: next.billing.fields.base_url?.set ? next.billing.fields.base_url.preview : '',
        api_key: '',
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el centro operativo.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save(action: 'save_billing' | 'save_notifications') {
    setSaving(action);
    setMessage(null);
    setError(null);
    try {
      const body = action === 'save_notifications'
        ? { action, email: notifyEmail }
        : { action, values: billing };
      const res = await fetch('/api/admin/payments/operations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({})) as { error?: string; message?: string };
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setMessage(json.message || 'Configuración guardada.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally { setSaving(null); }
  }

  return <section className="mx-auto max-w-[1500px] px-4 pt-6 text-white md:px-6 lg:px-8">
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,135,31,.17),transparent_32%),linear-gradient(135deg,#171719,#09090b)] p-5 shadow-2xl md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-amber-300">Cobro · Orden · DTE · Notificaciones</p><h1 className="mt-2 text-3xl font-black tracking-[-.04em] md:text-4xl">Operación de ventas</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">Una sola vista para verificar Mercado Pago, webhook, correo de ventas y emisión tributaria. Los secretos nunca se muestran completos.</p></div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-xs font-black uppercase tracking-[.12em] hover:bg-white/10 disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}Actualizar</button>
      </div>

      {message ? <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}
      {error ? <div className="mt-5 rounded-xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

      {loading && !data ? <div className="grid min-h-56 place-items-center text-zinc-500"><Loader2 className="h-7 w-7 animate-spin"/></div> : null}

      {data ? <>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-[1.5rem] border border-sky-300/15 bg-sky-300/[.055] p-5">
            <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><Server className="h-5 w-5 text-sky-300"/><h2 className="font-black">Mercado Pago</h2></div><Status ok={data.mercadoPago.connected && data.mercadoPago.mode === 'production'} good="Producción" bad={data.mercadoPago.mode === 'sandbox' ? 'Pruebas' : 'Revisar'}/></div>
            <p className="mt-3 text-xs leading-5 text-zinc-400">{data.mercadoPago.message}</p>
            <div className="mt-4"><InfoLine label="Origen credencial" value={data.mercadoPago.source === 'vercel-env' ? 'Vercel Environment' : data.mercadoPago.source}/><InfoLine label="Access token" value={data.mercadoPago.accessToken.preview}/><InfoLine label="Public key" value={data.mercadoPago.publicKey.preview}/><InfoLine label="Cuenta" value={data.mercadoPago.account?.email || data.mercadoPago.account?.nickname || String(data.mercadoPago.account?.id || 'Conectada')}/><InfoLine label="Latencia API" value={data.mercadoPago.latencyMs != null ? `${data.mercadoPago.latencyMs} ms` : '—'}/></div>
          </div>

          <div className="rounded-[1.5rem] border border-violet-300/15 bg-violet-300/[.05] p-5">
            <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><Webhook className="h-5 w-5 text-violet-300"/><h2 className="font-black">Webhook</h2></div><Status ok={data.mercadoPago.webhook.ready} good="Firmado" bad="Falta secret"/></div>
            <p className="mt-3 text-xs leading-5 text-zinc-400">La ruta del servidor está activa. El indicador verde exige además que exista el secret de firma de Mercado Pago.</p>
            <div className="mt-4"><InfoLine label="Endpoint" value={data.mercadoPago.webhook.endpoint}/><InfoLine label="Ruta servidor" value={data.mercadoPago.webhook.routeActive ? 'Activa' : 'Inactiva'}/><InfoLine label="Firma webhook" value={data.mercadoPago.webhook.signatureConfigured ? 'Configurada' : 'Pendiente'}/><InfoLine label="Secret" value={data.mercadoPago.webhookSecret.preview}/></div>
          </div>

          <div className="rounded-[1.5rem] border border-emerald-300/15 bg-emerald-300/[.05] p-5">
            <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><Bell className="h-5 w-5 text-emerald-300"/><h2 className="font-black">Avisos de venta</h2></div><Status ok={data.notifications.emailReady && data.notifications.notifyToSet} good="Activo" bad="Configurar"/></div>
            <p className="mt-3 text-xs leading-5 text-zinc-400">Cada pago aprobado envía confirmación al cliente y un segundo correo interno con productos, cliente, pago, total y estado DTE.</p>
            <label className="mt-4 grid gap-2 text-xs font-bold text-zinc-400"><span className="flex items-center gap-2"><Mail className="h-4 w-4"/>Correo administrador</span><input type="email" value={notifyEmail} onChange={(e) => setNotifyEmail(e.target.value)} className={inputClass} placeholder="ventas@solucionesfabrick.com"/></label>
            <button type="button" onClick={() => void save('save_notifications')} disabled={saving !== null} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-300 px-4 text-xs font-black text-black disabled:opacity-50">{saving === 'save_notifications' ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}Guardar correo</button>
          </div>
        </div>

        <div id="dte" className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
          <div className="rounded-[1.6rem] border border-amber-300/20 bg-amber-300/[.055] p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><FileKey2 className="h-5 w-5 text-amber-300"/><h2 className="text-xl font-black">SII · Haulmer / OpenFactura</h2></div><p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-400">Guarda aquí las credenciales del proveedor de DTE. Se cifran en Insforge. Sin credenciales, Fabrick mantiene la orden y genera solo un comprobante interno de compra.</p></div><Status ok={data.billing.configured} good="DTE real" bad="Simulado"/></div>
            <div className="mt-4 rounded-xl border border-white/8 bg-black/20 p-3 text-xs text-zinc-400"><ShieldCheck className="mr-2 inline h-4 w-4 text-amber-300"/>Cifrado en reposo: <b className="text-white">{data.encryption.configured ? 'AES-256-GCM activo' : 'revisar ENCRYPTION_KEY'}</b> · Fuente actual: <b className="text-white">{data.billing.source}</b></div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <FiscalField label="API key" value={billing.api_key} set={(value) => setBilling((s) => ({ ...s, api_key: value }))} placeholder={data.billing.fields.api_key?.preview || 'Clave OpenFactura'} password/>
              <FiscalField label="RUT emisor" value={billing.rut_emisor} set={(value) => setBilling((s) => ({ ...s, rut_emisor: value }))} placeholder="12345678-9"/>
              <FiscalField label="Razón social" value={billing.razon_social} set={(value) => setBilling((s) => ({ ...s, razon_social: value }))} placeholder="Empresa SpA"/>
              <FiscalField label="Giro" value={billing.giro} set={(value) => setBilling((s) => ({ ...s, giro: value }))} placeholder="Actividad registrada"/>
              <FiscalField label="Dirección casa matriz" value={billing.direccion} set={(value) => setBilling((s) => ({ ...s, direccion: value }))} placeholder="Calle y número"/>
              <FiscalField label="Comuna" value={billing.comuna} set={(value) => setBilling((s) => ({ ...s, comuna: value }))} placeholder="Comuna"/>
              <div className="md:col-span-2"><FiscalField label="Base URL" value={billing.base_url} set={(value) => setBilling((s) => ({ ...s, base_url: value }))} placeholder="https://api.haulmer.com"/></div>
            </div>
            <button type="button" onClick={() => void save('save_billing')} disabled={saving !== null} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-300 px-5 text-xs font-black text-black disabled:opacity-50">{saving === 'save_billing' ? <Loader2 className="h-4 w-4 animate-spin"/> : <KeyRound className="h-4 w-4"/>}Guardar integración tributaria</button>
          </div>

          <div className="rounded-[1.6rem] border border-white/10 bg-black/20 p-5 md:p-6">
            <div className="flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-amber-300"/><h2 className="text-xl font-black">Últimas compras confirmadas</h2></div>
            <p className="mt-2 text-xs text-zinc-500">Vista operativa desde las órdenes internas. Los montos financieros siguen teniendo como fuente de verdad a Mercado Pago.</p>
            <div className="mt-4 space-y-2">
              {data.recentSales.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-zinc-500">Todavía no hay ventas pagadas en esta ventana.</p> : data.recentSales.map((sale) => <div key={sale.id} className="rounded-xl border border-white/8 bg-white/[.035] p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><b className="block truncate text-sm">{sale.products[0]?.name || `Pedido ${sale.id}`}</b><span className="mt-1 block truncate text-[10px] text-zinc-500">{sale.customerName} · {sale.customerEmail}</span></div><b className="shrink-0 text-sm text-amber-300">{CLP.format(sale.total)}</b></div><div className="mt-3 flex flex-wrap gap-2 text-[9px] font-bold uppercase tracking-[.1em] text-zinc-500"><span>MP {sale.paymentId || '—'}</span><span>·</span><span>{sale.status || sale.paymentStatus}</span>{sale.dispatchCode ? <><span>·</span><span>Despacho {sale.dispatchCode}</span></> : null}</div><div className="mt-2 text-[10px] leading-4 text-zinc-500">{sale.products.slice(0, 4).map((p) => `${p.quantity}× ${p.name}`).join(' · ')}</div></div>)}
            </div>
          </div>
        </div>
      </> : null}
    </div>
  </section>;
}

function FiscalField({ label, value, set, placeholder, password = false }: { label: string; value: string; set: (value: string) => void; placeholder: string; password?: boolean }) {
  return <label className="grid gap-2 text-xs font-bold text-zinc-400"><span>{label}</span><input type={password ? 'password' : 'text'} value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} className={inputClass}/></label>;
}
