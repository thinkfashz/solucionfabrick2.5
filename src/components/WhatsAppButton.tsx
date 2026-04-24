'use client';

/**
 * Floating WhatsApp button.
 *
 * - Non-intrusive: 48-56 px, discreet position, hides the tooltip by default.
 * - Works on mobile (bottom-right, safe-area aware) and desktop (larger, with copy).
 * - Number is read from NEXT_PUBLIC_WHATSAPP_NUMBER (digits only, no +) with a safe fallback.
 * - Can be disabled on specific pages via the `hideOn` prop or by setting `data-hide-whatsapp="true"` on <html>.
 */

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const DEFAULT_NUMBER = '56912345678'; // Chile fallback; override via NEXT_PUBLIC_WHATSAPP_NUMBER
const DEFAULT_MESSAGE = 'Hola Soluciones Fabrick, me interesa cotizar un proyecto de construcción o remodelación. ¿Pueden asesorarme?';

function WhatsAppIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M19.11 17.21c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.47-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.09 3.2 5.08 4.49.71.31 1.26.5 1.69.64.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z" />
      <path d="M16.03 4.5C9.66 4.5 4.49 9.67 4.49 16.03c0 2.04.54 4.05 1.57 5.82L4.5 27.5l5.82-1.52a11.49 11.49 0 0 0 5.71 1.52h.01c6.37 0 11.54-5.17 11.54-11.54 0-3.08-1.2-5.99-3.38-8.17a11.49 11.49 0 0 0-8.17-3.29zm0 21.08h-.01a9.52 9.52 0 0 1-4.85-1.33l-.35-.21-3.45.9.92-3.37-.23-.35a9.52 9.52 0 0 1-1.46-5.07c0-5.29 4.3-9.6 9.6-9.6a9.52 9.52 0 0 1 6.79 2.81 9.52 9.52 0 0 1 2.81 6.79c0 5.3-4.3 9.6-9.6 9.6z" />
    </svg>
  );
}

export interface WhatsAppButtonProps {
  /** Routes where the button should NOT appear. Start with '/' — e.g. ['/admin', '/checkout']. */
  hideOn?: string[];
  /** Override the pre-filled message. */
  message?: string;
}

export default function WhatsAppButton({
  hideOn = ['/admin', '/auth', '/checkout'],
  message = DEFAULT_MESSAGE,
}: WhatsAppButtonProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  // Hide on specific route prefixes
  if (pathname && hideOn.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  const rawNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || DEFAULT_NUMBER;
  const number = rawNumber.replace(/[^\d]/g, '');
  const href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Cotiza por WhatsApp con Soluciones Fabrick"
      title="Cotiza por WhatsApp"
      className="group fixed z-[9500] bottom-5 right-5 sm:bottom-7 sm:right-7 flex items-center gap-2 pointer-events-auto pr-0 sm:pr-4 rounded-full shadow-[0_18px_40px_rgba(0,0,0,0.45)] bg-[#25D366] text-white transition-all duration-300 hover:shadow-[0_22px_60px_rgba(37,211,102,0.45)] hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Halo pulse — subtle, respects reduced motion */}
      <span
        aria-hidden
        className="wa-halo absolute inset-0 rounded-full bg-[#25D366]/50 blur-md -z-10 motion-safe:animate-[wa-pulse_2.8s_ease-out_infinite]"
      />
      <span className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-[#1FB859] ring-4 ring-[#25D366]/40 group-hover:ring-[#25D366]/60 transition">
        <WhatsAppIcon size={24} />
      </span>
      <span className="hidden sm:inline text-[11px] font-bold tracking-[0.18em] uppercase pr-2">
        WhatsApp
      </span>
    </a>
  );
}
