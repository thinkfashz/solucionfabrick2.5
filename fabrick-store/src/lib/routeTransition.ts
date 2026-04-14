export function navigateWithTransition(path: string, duration = 360) {
  if (typeof window === 'undefined') return;

  document.documentElement.classList.add('route-transition-out');

  window.setTimeout(() => {
    window.location.href = path;
  }, duration);
}
