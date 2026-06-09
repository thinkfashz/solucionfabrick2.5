'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { buildWhatsAppLink } from '@/lib/whatsapp';

const PAGE_BG =
  'radial-gradient(circle at 20% -10%,rgba(255,210,41,.16),transparent 28rem), radial-gradient(circle at 90% 10%,rgba(255,210,41,.07),transparent 22rem), linear-gradient(180deg,#030303 0%,#070706 55%,#030303 100%)';

const CARD_BG =
  'radial-gradient(circle at 80% 0%,rgba(255,210,41,.08),transparent 18rem), linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.025))';

const CARD_STYLE: React.CSSProperties = {
  background: CARD_BG,
  border: '1px solid rgba(255,248,237,.12)',
  borderRadius: 28,
  boxShadow: '0 26px 80px rgba(0,0,0,.48)',
};

function Kicker({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-[#ffd229] text-[11px] font-black uppercase tracking-[0.34em]">
      <span className="block w-8 h-px bg-gradient-to-r from-[#ffd229] to-transparent flex-shrink-0" />
      {label}
    </span>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" width={80} height={80}>
      <style>{`
        @keyframes circleInRed {
          from { stroke-dashoffset: 251; opacity: 0; }
          to   { stroke-dashoffset: 0;   opacity: 1; }
        }
        @keyframes shakeIcon {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-6px); }
          40%      { transform: translateX(6px); }
          60%      { transform: translateX(-4px); }
          80%      { transform: translateX(4px); }
        }
        .circle-red-anim {
          stroke-dasharray: 251;
          stroke-dashoffset: 251;
          animation: circleInRed 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s forwards;
        }
        .shake-anim {
          animation: shakeIcon 0.6s cubic-bezier(0.36,0.07,0.19,0.97) 0.8s both;
        }
      `}</style>
      <g className="shake-anim">
        <circle
          cx="40" cy="40" r="39"
          className="circle-red-anim"
          stroke="#ef4444"
          strokeWidth="2"
          fill="rgba(239,68,68,0.08)"
        />
        <line x1="26" y1="26" x2="54" y2="54" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
        <line x1="54" y1="26" x2="26" y2="54" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

interface StoredOrder {
  productId?: string;
  name?: string;
  price?: string;
  img?: string;
}

export default function FallidaClient() {
  const [retryHref, setRetryHref] = useState('/checkout');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('fabrick_order_preview');
      if (raw) {
        const parsed = JSON.parse(raw) as StoredOrder;
        const params = new URLSearchParams();
        if (parsed.productId) params.set('productId', parsed.productId);
        if (parsed.name) params.set('name', parsed.name);
        if (parsed.price) params.set('price', parsed.price);
        if (parsed.img) params.set('img', parsed.img);
        const qs = params.toString();
        setRetryHref(qs ? `/checkout?${qs}` : '/checkout');
      }
    } catch {
      // ignore
    }
  }, []);

  const waHref = buildWhatsAppLink(
    'Hola Soluciones Fabrick, tuve un problema al completar mi compra y necesito ayuda para terminar el proceso.',
  );

  return (
    <div className="min-h-screen" style={{ color: '#fff8ed', background: PAGE_BG }}>
      <Navbar />
      <main className="max-w-[640px] mx-auto px-4 md:px-8 pt-12 pb-32">

        {/* Hero */}
        <div className="flex flex-col items-center text-center mb-10">
          <XIcon />
          <div className="mt-6">
            <Kicker label="Compra no completada" />
          </div>
          <h1
            className="font-playfair mt-3"
            style={{
              fontSize: 'clamp(36px,7vw,64px)',
              lineHeight: 0.95,
              letterSpacing: '-0.06em',
              color: '#fff8ed',
            }}
          >
            No hubo cobro.
          </h1>
          <p className="mt-4 leading-[1.7] max-w-md" style={{ color: '#b9afa2' }}>
            La transacción no se completó, pero no te preocupes: no se realizó ningún cargo y tus datos están seguros. Puedes intentarlo de nuevo o contactar a un asesor.
          </p>
        </div>

        {/* Info cards */}
        <div style={{ ...CARD_STYLE, padding: 26 }}>
          <Kicker label="¿Qué pasó?" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
            {/* Card 1: Data protected */}
            <div
              className="flex flex-col gap-2 p-4"
              style={{
                border: '1px solid rgba(255,248,237,0.10)',
                borderRadius: 20,
                background: 'rgba(255,255,255,0.035)',
              }}
            >
              <span className="text-[22px]">🔒</span>
              <strong className="text-[15px] font-black" style={{ color: '#ffd229' }}>
                Datos protegidos
              </strong>
              <p className="text-[12px] leading-[1.6]" style={{ color: '#b9afa2' }}>
                No almacenamos ningún dato de tarjeta ni información sensible de pago. El proceso es 100% seguro.
              </p>
            </div>
            {/* Card 2: Assisted close */}
            <div
              className="flex flex-col gap-2 p-4"
              style={{
                border: '1px solid rgba(255,248,237,0.10)',
                borderRadius: 20,
                background: 'rgba(255,255,255,0.035)',
              }}
            >
              <span className="text-[22px]">📞</span>
              <strong className="text-[15px] font-black" style={{ color: '#23d18b' }}>
                Cierre asistido
              </strong>
              <p className="text-[12px] leading-[1.6]" style={{ color: '#b9afa2' }}>
                Un asesor puede ayudarte a completar la compra por WhatsApp en pocos minutos, sin complicaciones.
              </p>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Link
            href={retryHref}
            className="flex-1 flex items-center justify-center rounded-full py-4 text-[11px] font-black uppercase tracking-[0.25em] text-black hover:bg-yellow-300 transition"
            style={{ background: '#ffd229' }}
          >
            Intentar de nuevo
          </Link>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center rounded-full py-4 text-[11px] font-black uppercase tracking-[0.25em] transition"
            style={{
              border: '1px solid rgba(255,248,237,0.14)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff8ed',
            }}
          >
            Pedir ayuda
          </a>
        </div>
      </main>
    </div>
  );
}
