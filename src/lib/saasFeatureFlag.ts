export const SAAS_RUNTIME_STORAGE_KEY = 'sf_saas_runtime_enabled';
export const SAAS_RUNTIME_CHANGE_EVENT = 'sf-saas-runtime-change';

export function getDefaultSaaSRuntimeEnabled() {
  // Multi-tenant branding is safe for the original Fabrick tenant and should be
  // active by default. Set NEXT_PUBLIC_SAAS_RUNTIME_ENABLED=false only for an
  // intentional emergency rollback.
  return process.env.NEXT_PUBLIC_SAAS_RUNTIME_ENABLED !== 'false';
}

export function isSaaSRuntimeEnabled() {
  if (typeof window === 'undefined') return getDefaultSaaSRuntimeEnabled();
  const local = window.localStorage.getItem(SAAS_RUNTIME_STORAGE_KEY);
  if (local === 'false') return false;
  if (local === 'true') return true;
  return getDefaultSaaSRuntimeEnabled();
}

export function setSaaSRuntimeEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SAAS_RUNTIME_STORAGE_KEY, enabled ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent(SAAS_RUNTIME_CHANGE_EVENT, { detail: { enabled } }));
}

export function clearSaaSRuntimeOverride() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SAAS_RUNTIME_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(SAAS_RUNTIME_CHANGE_EVENT, { detail: { enabled: getDefaultSaaSRuntimeEnabled() } }));
}
