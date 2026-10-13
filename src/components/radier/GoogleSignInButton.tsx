'use client';

import { useEffect, useRef, useState } from 'react';

export type GoogleProfile = { nombre: string; email: string; picture?: string };

type GsiCredential = { credential?: string };

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
          cancel: () => void;
        };
      };
    };
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';
let gsiPromise: Promise<void> | null = null;

function loadGsi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Sin ventana'));
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiPromise) {
    gsiPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GSI_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => { gsiPromise = null; reject(new Error('No se pudo cargar Google Identity')); };
      document.head.appendChild(script);
    });
  }
  return gsiPromise;
}

function decodeProfile(jwt: string): GoogleProfile | null {
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const email = String(payload.email || '');
    if (!payload.email_verified || !email) return null;
    const nombre = String(payload.name || payload.given_name || email.split('@')[0] || '').slice(0, 80);
    return { nombre, email: email.toLowerCase(), picture: typeof payload.picture === 'string' ? payload.picture : undefined };
  } catch { return null; }
}

/**
 * Botón oficial "Continuar con Google" (Google Identity Services, con FedCM).
 * Si no hay `NEXT_PUBLIC_GOOGLE_CLIENT_ID` no renderiza nada: el formulario
 * manual sigue siendo la vía principal. Nunca bloquea la página si Google falla.
 */
export default function GoogleSignInButton({ onProfile, onError }: {
  onProfile: (profile: GoogleProfile) => void;
  onError?: (message: string) => void;
}) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!clientId || !hostRef.current) return;
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || !hostRef.current || !window.google?.accounts?.id) return;
        const gsi = window.google.accounts.id;
        gsi.initialize({
          client_id: clientId,
          callback: (response: GsiCredential) => {
            const profile = response.credential ? decodeProfile(response.credential) : null;
            if (profile) onProfile(profile);
            else {
              setFailed(true);
              onError?.('Google no devolvió un perfil válido. Completa tus datos manualmente.');
            }
          },
          use_fedcm_for_button: true,
        });
        gsi.renderButton(hostRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'left',
          width: 320,
        });
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [clientId, onProfile, onError]);

  if (!clientId || failed) return null;
  return <div ref={hostRef} className="flex justify-center" aria-label="Continuar con Google" />;
}
