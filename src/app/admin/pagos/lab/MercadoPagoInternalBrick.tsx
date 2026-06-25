'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';

type BrickController = { unmount: () => void };
type MercadoPagoInstance = { bricks: () => { create: (type: string, containerId: string, settings: unknown) => Promise<BrickController> } };
type MercadoPagoConstructor = new (publicKey: string, options?: { locale?: string }) => MercadoPagoInstance;

declare global {
  interface Window {
    MercadoPago?: MercadoPagoConstructor;
    cardPaymentBrickController?: BrickController;
  }
}

type DirectPaymentResult = {
  ok: boolean;
  paymentId?: string;
  status?: string;
  statusDetail?: string | null;
  externalReference?: string;
};

type Props = {
  ready: boolean;
  title: string;
  amount: number;
  email: string;
  onPaymentId: (id: string) => void;
  onNotice: (message: string) => void;
  onRefreshEvents: () => void;
};

function statusClass(status?: string) {
  if (status === 'approved') return 'text-emerald-300';
  if (status === 'pending' || status === 'in_process' || status === 'authorized') return 'text-amber-300';
  if (status) return 'text-rose-300';
  return 'text-zinc-400';
}

async function readJson<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json as T;
}

export default function MercadoPagoInternalBrick({ ready, title, amount, email, onPaymentId, onNotice, onRefreshEvents }: Props) {
  const [sdkReady, setSdkReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DirectPaymentResult | null>(null);

  useEffect(() => {
    return () => {
      window.cardPaymentBrickController?.unmount?.();
      window.cardPaymentBrickController = undefined;
    };
  }, []);

  async function mountBrick() {
    setResult(null);
    if (!ready) return onNotice('Primero guarda las credenciales TEST. Después quedan guardadas en la BD.');
    if (!sdkReady || !window.MercadoPago) return onNotice('Mercado Pago SDK todavía está cargando.');
    setLoading(true);
    try {
      const config = await readJson<{ publicKey: string }>(await fetch('/api/admin/mercadopago-lab/public-key', { cache: 'no-store' }));
      window.cardPaymentBrickController?.unmount?.();
      window.cardPaymentBrickController = undefined;

      const mp = new window.MercadoPago(config.publicKey, { locale: 'es-CL' });
      const bricksBuilder = mp.bricks();
      const externalReference = `mp_lab_direct_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const settings = {
        initialization: {
          amount,
          payer: { email },
        },
        customization: {
          visual: { style: { theme: 'dark' } },
          paymentMethods: {
            creditCard: 'all',
            debitCard: 'all',
            maxInstallments: 12,
          },
        },
        callbacks: {
          onReady: () => onNotice('Formulario interno listo. Usa una tarjeta de prueba.'),
          onSubmit: (formData: unknown) => new Promise<void>((resolve, reject) => {
            const payload = {
              ...(typeof formData === 'object' && formData ? formData as Record<string, unknown> : {}),
              description: title,
              external_reference: externalReference,
              amount,
            };
            fetch('/api/admin/mercadopago-lab/direct-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            }).then(async (response) => {
              const json = await response.json().catch(() => ({}));
              if (!response.ok) {
                setResult({ ok: false, status: 'error', statusDetail: json.error || `HTTP ${response.status}` });
                onNotice(json.error || 'No se pudo procesar el intento interno.');
                reject(json);
                return;
              }
              const next = json as DirectPaymentResult;
              setResult(next);
              if (next.paymentId) onPaymentId(String(next.paymentId));
              onNotice(`Resultado interno: ${next.status || 'sin estado'} · ID ${next.paymentId || '—'}`);
              onRefreshEvents();
              resolve();
            }).catch((error) => {
              onNotice(error instanceof Error ? error.message : 'Error procesando intento interno.');
              reject(error);
            });
          }),
          onError: (error: unknown) => onNotice(`Error Mercado Pago Brick: ${error instanceof Error ? error.message : JSON.stringify(error)}`),
        },
      };
      window.cardPaymentBrickController = await bricksBuilder.create('cardPayment', 'cardPaymentBrick_container', settings);
      setMounted(true);
    } catch (err) {
      onNotice(err instanceof Error ? err.message : 'No se pudo montar el formulario interno.');
    } finally {
      setLoading(false);
    }
  }

  return <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-5 shadow-2xl shadow-black/30">
    <Script src="https://sdk.mercadopago.com/js/v2" strategy="afterInteractive" onLoad={() => setSdkReady(true)} onReady={() => setSdkReady(true)} />
    <div className="mb-4 flex items-start gap-3">
      <div className="rounded-2xl bg-emerald-400/10 p-2 text-emerald-300 ring-1 ring-emerald-300/25"><CreditCard className="h-5 w-5" /></div>
      <div>
        <h2 className="text-xl font-black text-white">Pago interno con tarjeta</h2>
        <p className="mt-1 text-xs leading-5 text-zinc-400">Renderiza Mercado Pago Brick dentro del admin. No necesitas salir a Checkout Pro.</p>
      </div>
    </div>
    <button onClick={mountBrick} disabled={loading} className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-black disabled:opacity-60">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Mostrar formulario interno
    </button>
    <p className="mb-3 text-xs text-zinc-500">SDK: {sdkReady ? 'cargado' : 'cargando'} · Formulario: {mounted ? 'montado' : 'sin montar'}</p>
    <div className="rounded-3xl border border-white/10 bg-white p-2 text-black">
      <div id="cardPaymentBrick_container" className="min-h-[420px] rounded-2xl bg-white p-2" />
    </div>
    {result && <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm">
      <p className={`font-black ${statusClass(result.status)}`}>Estado: {result.status || 'error'} · {result.statusDetail || 'sin detalle'}</p>
      <p className="mt-1 text-zinc-400">Payment ID: {result.paymentId || '—'}</p>
      <p className="mt-1 break-all text-zinc-500">External reference: {result.externalReference || '—'}</p>
    </div>}
  </section>;
}
