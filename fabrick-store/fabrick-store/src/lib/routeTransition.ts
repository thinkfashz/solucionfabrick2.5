export const TRANSITION_EVENT = 'fabrick:route-transition';

export function navigateWithTransition(path: string, duration = 360) {
  if (typeof window === 'undefined') return;

  // Fire overlay event before navigating
  window.dispatchEvent(new CustomEvent(TRANSITION_EVENT));

  document.documentElement.classList.add('route-transition-out');

  window.setTimeout(() => {
    window.location.href = path;
  }, duration);
}
