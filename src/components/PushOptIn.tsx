'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';

type Status = 'loading' | 'unsupported' | 'disabled' | 'default' | 'granted' | 'denied' | 'working';

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

export default function PushOptIn() {
  const [status, setStatus] = useState<Status>('loading');
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (typeof window === 'undefined') return;
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        if (!cancelled) setStatus('unsupported');
        return;
      }
      try {
        const res = await fetch('/api/push/public-key', { cache: 'no-store' });
        const { enabled, publicKey: key } = (await res.json()) as { enabled: boolean; publicKey: string | null };
        if (!enabled || !key) {
          if (!cancelled) setStatus('disabled');
          return;
        }
        if (!cancelled) {
          setPublicKey(key);
          setStatus(Notification.permission as Status);
        }
      } catch {
        if (!cancelled) setStatus('disabled');
      }
    }
    void init();
    return () => { cancelled = true; };
  }, []);

  async function subscribe() {
    if (!publicKey) return;
    setStatus('working');
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission as Status);
        return;
      }
      const registration = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.ready);
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      if (!response.ok && response.status !== 202) throw new Error(`Server returned ${response.status}`);
      setStatus('granted');
    } catch (err) {
      console.error('[PushOptIn] subscribe failed', err);
      setError('No fue posible activar las notificaciones. Intenta de nuevo.');
      setStatus('default');
    }
  }

  async function unsubscribe() {
    setStatus('working');
    setError(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = registration ? await registration.pushManager.getSubscription() : null;
      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => undefined);
        await subscription.unsubscribe().catch(() => undefined);
      }
      setStatus('default');
    } catch (err) {
      console.error('[PushOptIn] unsubscribe failed', err);
      setError('No fue posible desactivar las notificaciones.');
      setStatus('granted');
    }
  }

  if (status === 'loading' || status === 'unsupported' || status === 'disabled') return null;

  return (
    <div className="rounded-[1.75rem] bg-[#fffaf5] p-5 text-[#171820] shadow-[0_18px_60px_rgba(23,24,32,.08)] ring-1 ring-[#171820]/10">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#171820] text-[#ccb196]">
          {status === 'granted' ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black">Notificaciones del proyecto</h3>
          <p className="mt-1 text-xs leading-6 text-[#6b625c]">
            {status === 'granted'
              ? 'Recibirás avisos sobre pedidos, avances y comunicaciones importantes.'
              : 'Activa los avisos para recibir cambios relevantes sin tener que revisar la cuenta constantemente.'}
          </p>
          {error ? <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">{error}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {status === 'granted' ? (
              <button type="button" onClick={unsubscribe} className="inline-flex items-center gap-2 rounded-full bg-[#f2e9e3] px-4 py-2.5 text-[10px] font-black uppercase tracking-[.14em] text-[#6f6259] transition hover:bg-red-50 hover:text-red-800">
                <BellOff className="h-3.5 w-3.5" /> Desactivar
              </button>
            ) : status === 'working' ? (
              <button type="button" disabled className="inline-flex items-center gap-2 rounded-full bg-[#ccb196]/35 px-4 py-2.5 text-[10px] font-black uppercase tracking-[.14em] text-[#765438]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Configurando…
              </button>
            ) : status === 'denied' ? (
              <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#8c817a]">Bloqueadas en el navegador · habilítalas desde la configuración del sitio</p>
            ) : (
              <button type="button" onClick={subscribe} className="inline-flex items-center gap-2 rounded-full bg-[#b6906c] px-4 py-2.5 text-[10px] font-black uppercase tracking-[.14em] text-[#171820] transition hover:bg-[#ccb196]">
                <Bell className="h-3.5 w-3.5" /> Activar notificaciones
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
