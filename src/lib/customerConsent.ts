export const CUSTOMER_TERMS_VERSION = '2026-09-10';
export const CUSTOMER_PRIVACY_VERSION = '2026-09-10';
export const PENDING_CUSTOMER_CONSENT_KEY = 'fabrick.pending-customer-consent.v1';

export type PendingCustomerConsent = {
  name: string;
  phone?: string;
  acceptedTerms: true;
  marketingEmail: boolean;
  marketingWhatsapp: boolean;
  termsVersion: string;
  privacyVersion: string;
};

export function buildPendingCustomerConsent(input: {
  name: string;
  phone?: string;
  marketingOptIn?: boolean;
}): PendingCustomerConsent {
  return {
    name: input.name.trim(),
    phone: input.phone?.trim() || '',
    acceptedTerms: true,
    marketingEmail: Boolean(input.marketingOptIn),
    marketingWhatsapp: Boolean(input.marketingOptIn),
    termsVersion: CUSTOMER_TERMS_VERSION,
    privacyVersion: CUSTOMER_PRIVACY_VERSION,
  };
}
