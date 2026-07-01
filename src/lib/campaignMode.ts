import 'server-only';

export type CampaignMode = 'normal' | 'limited' | 'catalog';

function readEnv(key: string) {
  return (process.env[key] ?? '').trim();
}

function isTruthy(value: string) {
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(value.toLowerCase());
}

function parseMode(value: string): CampaignMode {
  const normalized = value.toLowerCase();
  if (normalized === 'catalog' || normalized === 'catalog_only' || normalized === 'solo_catalogo') return 'catalog';
  if (normalized === 'limited' || normalized === 'limitado') return 'limited';
  return 'normal';
}

/**
 * Runtime traffic mode for high-spend ad campaigns.
 *
 * FABRICK_CAMPAIGN_MODE / CAMPAIGN_MODE:
 *   - normal  → full site behavior.
 *   - limited → keep checkout/forms, disable costly AI chat by default.
 *   - catalog → serve public catalog/pages, pause checkout and AI.
 */
export function getCampaignMode(): CampaignMode {
  return parseMode(readEnv('FABRICK_CAMPAIGN_MODE') || readEnv('CAMPAIGN_MODE'));
}

export function publicAiChatEnabled(): boolean {
  if (isTruthy(readEnv('DISABLE_PUBLIC_AI_CHAT'))) return false;
  return getCampaignMode() === 'normal';
}

export function publicCheckoutEnabled(): boolean {
  if (isTruthy(readEnv('DISABLE_PUBLIC_CHECKOUT'))) return false;
  return getCampaignMode() !== 'catalog';
}

export function publicFormsEnabled(): boolean {
  if (isTruthy(readEnv('DISABLE_PUBLIC_FORMS'))) return false;
  return true;
}

export function campaignRetryAfterSeconds(): string {
  const raw = Number.parseInt(readEnv('CAMPAIGN_RETRY_AFTER_SECONDS') || '300', 10);
  return String(Number.isFinite(raw) && raw > 0 ? raw : 300);
}

export function campaignBusyHeaders(): Record<string, string> {
  return {
    'Retry-After': campaignRetryAfterSeconds(),
    'Cache-Control': 'no-store',
  };
}

export function campaignStatusSnapshot() {
  return {
    mode: getCampaignMode(),
    aiChatEnabled: publicAiChatEnabled(),
    checkoutEnabled: publicCheckoutEnabled(),
    formsEnabled: publicFormsEnabled(),
  };
}
