'use client';

import { useEffect } from 'react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import { Lock, ShieldCheck } from 'lucide-react';

interface MercadoPagoBrickProps {
  amount: number;
  orderId: string;
  payerEmail: string;
  onSuccess: (paymentId: string, status: string) => void;
  onError: (error: string) => void;
}

export default function MercadoPagoBrick({
  amount,
  orderId,
  payerEmail,
  onSuccess,
  onError,
}: MercadoPagoBrickProps) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_MP_PUBLIC_KEY) return;
    initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY, { locale: 'es-CL' });
  }, []);

  const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;

  if (!publicKey) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-4 text-red-400 text-sm">
        ⚠️ Configure la variable de entorno{' '}
        <code className="font-mono font-bold">NEXT_PUBLIC_MP_PUBLIC_KEY</code> para habilitar el pago con MercadoPago.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style>{`
        .mp-brick-wrapper .mp-mercadopago-container {
          background: transparent !important;
        }
        .mp-brick-wrapper input, .mp-brick-wrapper select {
          background: #000 !important;
          color: #fff !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
        .mp-brick-wrapper input:focus, .mp-brick-wrapper select:focus {
          border-color: #FACC15 !important;
          outline: none !important;
        }
        .mp-brick-wrapper [data-testid="action-button"],
        .mp-brick-wrapper button[type="submit"] {
          background: #FACC15 !important;
          color: #000 !important;
          font-weight: 900 !important;
        }
      `}</style>

      {/* Security header */}
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span className="text-[9px] uppercase tracking-[0.3em] text-emerald-400 font-bold">
          Pago Seguro · MercadoPago
        </span>
      </div>

      {/* MP Brick wrapper with dark/gold styling */}
      <div id="mp-card-brick-container" className="mp-brick-wrapper">
        <CardPayment
          initialization={{ amount }}
          customization={{
            visual: {
              style: {
                theme: 'dark',
                customVariables: {
                  baseColor: '#FACC15',
                  baseColorFirstVariant: '#D97706',
                  baseColorSecondVariant: '#FDE047',
                  errorColor: '#f87171',
                  successColor: '#34d399',
                  outlinePrimaryColor: '#FACC15',
                  outlineSecondaryColor: '#27272a',
                  buttonTextColor: '#000000',
                },
              },
              hideFormTitle: true,
              hidePaymentButton: false,
            },
            paymentMethods: {
              minInstallments: 1,
              maxInstallments: 12,
            },
          }}
          onSubmit={async (formData) => {
            try {
              const res = await fetch('/api/payments/mp-create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token: formData.token,
                  payment_method_id: formData.payment_method_id,
                  issuer_id: formData.issuer_id,
                  installments: formData.installments,
                  payer: {
                    email: payerEmail ?? formData.payer?.email,
                    identification: formData.payer?.identification,
                  },
                  amount,
                  orderId,
                  description: 'Compra Fabrick',
                }),
              });
              const body = await res.json();
              if (!res.ok || !body.ok) {
                onError(body.error ?? body.detail ?? 'Error procesando el pago.');
                return;
              }
              onSuccess(body.paymentId ?? '', body.status ?? 'approved');
            } catch {
              onError('Error de red al procesar el pago.');
            }
          }}
          onError={(error) => {
            onError(error?.message ?? 'Error en el formulario de pago.');
          }}
        />
      </div>

      {/* Security badges */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <div className="flex items-center gap-1.5 text-zinc-500 text-[8px] uppercase tracking-widest">
          <Lock className="w-3 h-3" /> SSL 256-bit
        </div>
        <div className="w-px h-3 bg-zinc-700" />
        <div className="flex items-center gap-1.5 text-zinc-500 text-[8px] uppercase tracking-widest">
          <ShieldCheck className="w-3 h-3" /> PCI DSS
        </div>
        <div className="w-px h-3 bg-zinc-700" />
        <span className="text-zinc-500 text-[8px] uppercase tracking-widest font-bold">MercadoPago</span>
      </div>
    </div>
  );
}
