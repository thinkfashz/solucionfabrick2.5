'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';

/**
 * Cloudflare Turnstile widget, env-gated.
 *
 * Renders nothing if NEXT_PUBLIC_TURNSTILE_SITE_KEY is not configured, so existing
 * forms keep working until the key is provisioned.
 *
 * On successful challenge, Turnstile injects a hidden input
 * `cf-turnstile-response` into the parent form; the server route should verify it
 * via the shared helper in `src/lib/turnstile.ts`.
 */
export default function TurnstileWidget({ action }: { action?: string }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!siteKey) return;
    // The script uses data-sitekey attribute auto-rendering, so the only thing
    // this effect does is re-render the widget when the element mounts after a
    // client-side navigation.
    const w = window as unknown as { turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => void } };
    if (w.turnstile && ref.current && !ref.current.dataset.rendered) {
      w.turnstile.render(ref.current, { sitekey: siteKey, action });
      ref.current.dataset.rendered = '1';
    }
  }, [siteKey, action]);

  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        async
        defer
      />
      <div
        ref={ref}
        className="cf-turnstile"
        data-sitekey={siteKey}
        data-theme="dark"
        data-action={action}
      />
    </>
  );
}
