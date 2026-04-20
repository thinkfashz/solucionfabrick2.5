export function navigateWithTransition(path: string, duration = 600) {
  if (typeof window === 'undefined') return;

  const el = document.getElementById('page-transition-overlay') as HTMLDivElement | null;

  if (el) {
    // Use the cinematic overlay component
    el.style.pointerEvents = 'all';
    el.style.transition = 'opacity 0.28s cubic-bezier(0.16,1,0.3,1)';
    el.style.opacity = '1';

    window.setTimeout(() => {
      window.location.href = path;
    }, duration / 2);
  } else {
    // Fallback: CSS class animation
    document.documentElement.classList.add('route-transition-out');
    window.setTimeout(() => {
      window.location.href = path;
    }, 360);
  }
}

