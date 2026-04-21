type Router = { push: (path: string) => void };

/**
 * Show the cinematic SF overlay, then navigate to `path`.
 *
 * If a Next.js router instance is provided, uses client-side navigation
 * (no full reload → no loading-screen replay → app doesn't feel stuck).
 * Falls back to `window.location.href` only when no router is available.
 */
export function navigateWithTransition(path: string, router?: Router, duration = 600) {
  if (typeof window === 'undefined') return;

  const el = document.getElementById('page-transition-overlay') as HTMLDivElement | null;

  const hideOverlay = () => {
    if (el) {
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
      // Fade the overlay back out once the new route has had a chance to render.
      window.setTimeout(hideOverlay, duration);
    } else {
      window.location.href = path;
    }
  };

  if (el) {
    // Use the cinematic overlay component
    el.style.pointerEvents = 'all';
    el.style.transition = 'opacity 0.28s cubic-bezier(0.16,1,0.3,1)';
    el.style.opacity = '1';

    window.setTimeout(go, duration / 2);
  } else {
    // Fallback: CSS class animation
    document.documentElement.classList.add('route-transition-out');
    window.setTimeout(() => {
      document.documentElement.classList.remove('route-transition-out');
      go();
    }, 360);
  }
}

