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

interface OrderPreview {
  name?: string;
  price?: string;
  customerName?: string;
  address?: string;
  paymentMethod?: string;
  nextStep?: string;
  orderId?: string;
}

function Kicker({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-[#ffd229] text-[11px] font-black uppercase tracking-[0.34em]">
      <span className="block w-8 h-px bg-gradient-to-r from-[#ffd229] to-transparent flex-shrink-0" />
      {label}
    </span>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" width={80} height={80}>
      <style>{`
        @keyframes circleIn {
          from { stroke-dashoffset: 251; opacity: 0; }
          to   { stroke-dashoffset: 0;   opacity: 1; }
        }
        @keyframes checkDraw {
          from { stroke-dashoffset: 60; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes pulsate {
          0%,100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.08); opacity: 0.8; }
        }
        .circle-anim {
          stroke-dasharray: 251;
          stroke-dashoffset: 251;
          animation: circleIn 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s forwards;
        }
        .check-anim {
          stroke-dasharray: 60;
          stroke-dashoffset: 60;
          animation: checkDraw 0.5s cubic-bezier(0.16,1,0.3,1) 0.65s forwards;
        }
        .pulse-anim {
          animation: pulsate 2.4s ease-in-out 1.2s infinite;
        }
      `}</style>
      <g className="pulse-anim">
        <circle cx="40" cy="40" r="39" className="circle-anim" stroke="#23d18b" strokeWidth="2" fill="rgba(35,209,139,0.08)" />
      </g>
      <polyline
        points="22,41 34,53 58,27"
        className="check-anim"
        stroke="#23d18b"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function ConfettiDot({ x, y, color, delay, size }: { x: number; y: number; color: string; delay: number; size: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        animation: `confettiFall 1.8s ease-in ${delay}s both`,
        opacity: 0,
      }}
    />
  );
}

const CONFETTI_DOTS = [
  { x: 15, y: -5, color: '#ffd229', delay: 0.3, size: 8 },
  { x: 30, y: -8, color: '#23d18b', delay: 0.5, size: 6 },
  { x: 50, y: -6, color: '#ffd229', delay: 0.2, size: 10 },
  { x: 65, y: -4, color: '#fff8ed', delay: 0.6, size: 5 },
  { x: 80, y: -7, color: '#23d18b', delay: 0.4, size: 7 },
  { x: 22, y: -3, color: '#fff', delay: 0.7, size: 4 },
  { x: 72, y: -5, color: '#ffd229', delay: 0.1, size: 6 },
];

export default function AceptadaClient() {
  const [order, setOrder] = useState<OrderPreview>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem('fabrick_order_preview');
      if (raw) setOrder(JSON.parse(raw) as OrderPreview);
    } catch {
      // ignore
    }
  }, []);

  const waHref = buildWhatsAppLink(
    `Hola Soluciones Fabrick, acabo de completar mi compra${order.orderId ? ` (pedido ${order.orderId})` : ''} y quiero coordinar el despacho.`,
  );

  const infoItems = [
    { label: 'Producto', value: order.name || 'Material seleccionado' },
    { label: 'Total pagado', value: order.price || '—' },
    { label: 'Cliente', value: order.customerName || '—' },
    { label: 'Dirección', value: order.address || 'A coordinar' },
    { label: 'Método de pago', value: order.paymentMethod || 'Webpay / Transferencia' },
    { label: 'Siguiente paso', value: order.nextStep || 'Te contactaremos para coordinar el despacho' },
  ];

  return (
    <div className="min-h-screen" style={{ color: '#fff8ed', background: PAGE_BG }}>
      <style>{`
        @keyframes confettiFall {
          0%   { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(120px) rotate(360deg); }
        }
      `}</style>
      <Navbar />
      <main className="max-w-[640px] mx-auto px-4 md:px-8 pt-12 pb-32">

        {/* Hero */}
        <div className="flex flex-col items-center text-center mb-10 relative">
          <div className="relative">
            <CheckIcon />
            {CONFETTI_DOTS.map((d, i) => (
              <ConfettiDot key={i} {...d} />
            ))}
          </div>
          <div className="mt-6">
            <Kicker label="Compra aceptada" />
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
            Tu pedido quedó<br />confirmado.
          </h1>
          <p className="mt-4 leading-[1.7] max-w-md" style={{ color: '#b9afa2' }}>
            Recibimos tu compra correctamente. En breve nuestro equipo se pondrá en contacto contigo para coordinar el despacho a tu dirección en la Región del Maule.
          </p>
        </div>

        {/* Order box */}
        <div style={{ ...CARD_STYLE, padding: 26 }}>
          <Kicker label="Resumen del pedido" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
            {infoItems.map(({ label, value }) => (
              <div
                key={label}
                className="flex flex-col gap-1 p-4"
                style={{
                  border: '1px solid rgba(255,248,237,0.10)',
                  borderRadius: 20,
                  background: 'rgba(255,255,255,0.035)',
                }}
              >
                <span
                  className="text-[10px] uppercase font-black tracking-[0.22em]"
                  style={{ color: '#7f766d' }}
                >
                  {label}
                </span>
                <strong className="text-[18px] font-black leading-snug" style={{ color: '#fff8ed' }}>
                  {value}
                </strong>
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Link
            href="/tienda"
            className="flex-1 flex items-center justify-center rounded-full py-4 text-[11px] font-black uppercase tracking-[0.25em] text-black hover:bg-yellow-300 transition"
            style={{ background: '#ffd229' }}
          >
            Volver al catálogo
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
            Hablar por WhatsApp
          </a>
        </div>
      </main>
    </div>
  );
}
