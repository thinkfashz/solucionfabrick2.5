type Router = { push: (path: string) => void };

/**
 * Show the cinematic SF overlay, then navigate to `path`.
 *
 * If a Next.js router instance is provided, uses client-side navigation
 * (no full reload → no loading-screen replay → app doesn't feel stuck).
 * Falls back to `window.location.href` only when no router is available.
 *
 * The overlay is auto-hidden by `PageTransition` as soon as the pathname
 * actually changes (reliable, reacts to real route commit). A hard safety
 * timeout is also installed here so the overlay is *guaranteed* to fade
 * out — even when navigating to the current URL, when the network stalls,
 * or when React fails to re-render for any reason.
 */
export function navigateWithTransition(path: string, router?: Router) {
  if (typeof window === 'undefined') return;

  const el = document.getElementById('page-transition-overlay') as HTMLDivElement | null;

  const hideOverlay = () => {
    if (el) {
      el.style.transition = 'opacity 0.4s cubic-bezier(0.16,1,0.3,1)';
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
    }
  };

  const go = () => {
    if (router) {
      try {
        router.push(path);
      } catch {
        // If client-side navigation fails for any reason, fall back to a
        // hard navigation so the user is never left stuck on the overlay.
        window.location.href = path;
        return;
      }
    } else {
      window.location.href = path;
    }
  };

  if (el) {
    // Use the cinematic overlay component
    el.style.pointerEvents = 'all';
    el.style.transition = 'opacity 0.22s cubic-bezier(0.16,1,0.3,1)';
    el.style.opacity = '1';

    // Kick off navigation almost immediately — the overlay will be hidden
    // by `PageTransition` when the destination route is mounted (via
    // `usePathname` change). This keeps transitions smooth on heavy pages
    // like `/tienda` without a fixed, brittle timeout.
    window.setTimeout(go, 120);

    // Hard safety net: never allow the overlay to stay visible for more
    // than 1.8s, regardless of what happens with routing, rendering, or
    // same-URL clicks. This is the backstop that guarantees stability.
    window.setTimeout(hideOverlay, 1800);
  } else {
    // Fallback: CSS class animation
    document.documentElement.classList.add('route-transition-out');
    window.setTimeout(() => {
      document.documentElement.classList.remove('route-transition-out');
      go();
    }, 360);
  }
}

