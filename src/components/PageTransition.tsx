'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// Shared transition used for every auto-hide path.
const HIDE_TRANSITION = 'opacity 0.3s cubic-bezier(0.16,1,0.3,1)';
// How long after the overlay becomes opaque we force it back off, regardless
// of router state. Kept very short so the user never perceives the app as
// "stuck" on the cinematic overlay — even on slow routes or SSR redirects.
const AUTO_HIDE_DELAY_MS = 800;
// Inline `opacity` values ≤ this count as "hidden" for observer purposes. We
// treat unparseable values as opaque so a hard-hide is still scheduled — it
// is always safe to hide an overlay that is already invisible.
const OPACITY_HIDDEN_THRESHOLD = 0.05;

/**
 * Full-screen cinematic page transition overlay — BlackBerry-style.
 *
 * Mounted once at the root. `routeTransition.ts` toggles its visibility
 * when a navigation starts. This component owns the overlay's *auto-hide*
 * contract end-to-end so it can never get "stuck" on slow/heavy routes
 * (like `/tienda` with the full catalog or `/admin` with recharts), on
 * server-side redirects (e.g. middleware bouncing `/admin → /admin/login`),
 * or when the user clicks a link to the current route.
 *
 * Three independent safety nets run at once:
 *  1. A `usePathname()` effect fades the overlay out as soon as the
 *     destination route mounts.
 *  2. A `MutationObserver` on the overlay's `style` attribute schedules a
 *     hard-hide 1.5s after *any* time the overlay is made opaque, no
 *     matter who flipped it on — so even same-URL clicks recover.
 *  3. On mount, we force the overlay to `opacity: 0` / `pointer-events:
 *     none` so that a reload landing on the stuck state immediately
 *     clears it.
 */
export default function PageTransition() {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);

  // Admin panel intentionally renders without any cinematic transition
  // overlay. The global overlay has historically been able to get "stuck"
  // opaque on top of `/admin/*`, blocking all interaction with the control
  // room. For the admin we unconditionally force it hidden on every render
  // and skip mounting the overlay markup entirely.
  const isAdmin = pathname?.startsWith('/admin') ?? false;

  // ── Safety net #3: on first mount, force the overlay hidden so any
  // "stuck" state from a previous SSR/redirect is cleared immediately.
  // When navigating into /admin we also force-hide on every pathname
  // change (with `transition: none` so there is no fade animation) so a
  // previously-raised overlay can never cover the panel.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('page-transition-overlay') as HTMLDivElement | null;
    if (!el) return;
    el.style.transition = isAdmin ? 'none' : HIDE_TRANSITION;
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
  }, [isAdmin, pathname]);

  // ── Safety net #2: observe the overlay's own visibility. Every time it
  // becomes opaque (from any source — route change, direct DOM toggle,
  // programmatic show) schedule a guaranteed hard-hide. This decouples
  // the auto-hide from whoever showed the overlay and from the router.
  useEffect(() => {
    const el = document.getElementById('page-transition-overlay') as HTMLDivElement | null;
    if (!el) return;

    let safety: ReturnType<typeof setTimeout> | null = null;

    const scheduleHide = () => {
      if (safety !== null) clearTimeout(safety);
      safety = setTimeout(() => {
        el.style.transition = HIDE_TRANSITION;
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
      }, AUTO_HIDE_DELAY_MS);
    };

    const isOpaque = () => {
      const raw = el.style.opacity;
      if (raw === '' || raw === '0') return false;
      const n = Number(raw);
      // NaN → treat as opaque so we still schedule a hide; it's always safe
      // to hide an already-hidden overlay.
      return Number.isNaN(n) ? true : n > OPACITY_HIDDEN_THRESHOLD;
    };

    if (isOpaque()) scheduleHide();

    const observer = new MutationObserver(() => {
      if (isOpaque()) scheduleHide();
    });
    observer.observe(el, { attributes: true, attributeFilter: ['style'] });

    return () => {
      observer.disconnect();
      if (safety !== null) clearTimeout(safety);
    };
  }, []);

  // ── Safety net #1: fade out whenever the route actually commits.
  useEffect(() => {
    // Skip the very first render — there's nothing to transition from.
    if (prevPathRef.current === null) {
      prevPathRef.current = pathname;
      return;
    }
    // Even when the pathname is unchanged (e.g. user clicked a link to the
    // page they're already on), fall through so we still clear any overlay
    // that `navigateWithTransition` may have raised.
    prevPathRef.current = pathname;

    const el = document.getElementById('page-transition-overlay') as HTMLDivElement | null;
    if (!el) return;

    // Wait two animation frames so the new route has a chance to paint
    // behind the overlay before we fade out — this avoids a visible flash
    // of the previous page while the router is still committing.
    let raf1: number | null = null;
    let raf2: number | null = null;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        el.style.transition = HIDE_TRANSITION;
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
      });
    });

    return () => {
      if (raf1 !== null) cancelAnimationFrame(raf1);
      if (raf2 !== null) cancelAnimationFrame(raf2);
    };
  }, [pathname]);

  // Admin routes render no overlay at all — transitions are instantaneous
  // so the panel can never get covered by a stuck black screen.
  if (isAdmin) return null;

  return (
    <div
      id="page-transition-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background:
          'radial-gradient(ellipse at center, #0a0a0a 0%, #000 70%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
        pointerEvents: 'none',
        opacity: 0,
        transition: 'opacity 0.3s cubic-bezier(0.16,1,0.3,1)',
      }}
      aria-hidden="true"
    >
      {/* ── BlackBerry 2.0 connection bar ─────────────────────────────────
          Tienda  ──[ packets travelling both ways through SF logo ]──  Mercado Pago
          The center hub is the animated SF wordmark; gold packets sweep
          across the rail in opposite directions so the user instantly
          reads it as a live store ⇄ bank handshake — not a generic
          spinner. The whole composition is GPU-only (transform / opacity)
          so the overlay launches "at the speed of light". */}
      <div
        style={{
          position: 'relative',
          width: 'min(520px, 78vw)',
          height: '90px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Left endpoint: TIENDA */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.4rem',
            zIndex: 2,
          }}
        >
          <span
            className="motion-safe:animate-[pt-endpoint-pulse_1.6s_ease-in-out_infinite]"
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '999px',
              background: '#FFC700',
              boxShadow: '0 0 12px rgba(255,199,0,0.85)',
            }}
          />
          <span
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              fontSize: '8px',
              letterSpacing: '0.35em',
              color: 'rgba(255,255,255,0.55)',
              textTransform: 'uppercase',
            }}
          >
            Tienda
          </span>
        </div>

        {/* Connection rail with packets */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '14%',
            right: '14%',
            height: '2px',
            transform: 'translateY(-50%)',
            background:
              'linear-gradient(90deg, rgba(255,199,0,0.08) 0%, rgba(255,199,0,0.18) 50%, rgba(255,199,0,0.08) 100%)',
            borderRadius: '999px',
            overflow: 'hidden',
            zIndex: 0,
          }}
        >
          <span
            className="motion-safe:animate-[pt-connect-forward_1.4s_linear_infinite]"
            style={{
              position: 'absolute',
              top: '-1px',
              height: '4px',
              width: '32%',
              borderRadius: '999px',
              background:
                'linear-gradient(90deg, transparent 0%, #FFE17A 45%, #FFC700 60%, transparent 100%)',
              boxShadow: '0 0 12px rgba(250,204,21,0.7)',
            }}
          />
          <span
            className="motion-safe:animate-[pt-connect-back_1.7s_linear_infinite]"
            style={{
              position: 'absolute',
              top: '-1px',
              height: '4px',
              width: '24%',
              borderRadius: '999px',
              background:
                'linear-gradient(270deg, transparent 0%, #FFE17A 45%, #FFC700 60%, transparent 100%)',
              boxShadow: '0 0 10px rgba(250,204,21,0.55)',
              animationDelay: '0.6s',
            }}
          />
        </div>

        {/* Center hub: animated SF logo embedded in the connection bar */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.45rem 0.9rem',
            borderRadius: '999px',
            background: 'rgba(0,0,0,0.85)',
            border: '1px solid rgba(255,199,0,0.35)',
            boxShadow:
              '0 0 24px rgba(250,204,21,0.45), inset 0 0 12px rgba(250,204,21,0.15)',
          }}
        >
          <svg
            viewBox="0 0 160 80"
            className="motion-safe:animate-[pt-breathe_1.8s_ease-in-out_infinite]"
            style={{
              height: '2.4rem',
              width: 'auto',
              filter: 'drop-shadow(0 0 16px rgba(250,204,21,0.6))',
            }}
          >
            <defs>
              <linearGradient id="ptGold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FFE17A" />
                <stop offset="60%" stopColor="#FFC700" />
                <stop offset="100%" stopColor="#E2AE00" />
              </linearGradient>
            </defs>
            <text
              x="12"
              y="62"
              fontFamily="Montserrat, Arial, sans-serif"
              fontSize="72"
              fontWeight="900"
              fill="url(#ptGold)"
              letterSpacing="-2"
            >
              SF
            </text>
          </svg>
          <span
            style={{
              fontFamily: 'Montserrat, Arial, sans-serif',
              fontSize: '7px',
              letterSpacing: '0.45em',
              color: 'rgba(250,204,21,0.85)',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            Soluciones · Fabrick · SpA
          </span>
        </div>

        {/* Right endpoint: MERCADO PAGO */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.4rem',
            zIndex: 2,
          }}
        >
          <span
            className="motion-safe:animate-[pt-endpoint-pulse_1.6s_ease-in-out_infinite]"
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '999px',
              background: '#00B1EA',
              boxShadow: '0 0 12px rgba(0,177,234,0.85)',
              animationDelay: '0.8s',
            }}
          />
          <span
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              fontSize: '8px',
              letterSpacing: '0.35em',
              color: 'rgba(255,255,255,0.55)',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            Mercado&nbsp;Pago
          </span>
        </div>
      </div>

      {/* Tiny status text (intentionally empty — overlay auto-hides within
          800ms, no copy needed). */}
      <div
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          fontSize: '9px',
          letterSpacing: '0.35em',
          color: 'rgba(255,255,255,0.25)',
          textTransform: 'uppercase',
          minHeight: '1em',
        }}
      />

    </div>
  );
}

