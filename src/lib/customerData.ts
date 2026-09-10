import 'server-only';

import { insforgeAdmin } from '@/lib/insforge';
import { CUSTOMER_PRIVACY_VERSION, CUSTOMER_TERMS_VERSION } from '@/lib/customerConsent';

type Row = Record<string, unknown>;

type CustomerInput = {
  firstName?: unknown;
  lastName?: unknown;
  phone?: unknown;
  avatarUrl?: unknown;
  address?: unknown;
  commune?: unknown;
  region?: unknown;
  postalCode?: unknown;
  deliveryNotes?: unknown;
  acceptTerms?: boolean;
  marketingEmail?: boolean;
  marketingWhatsapp?: boolean;
  source?: string;
};

function text(value: unknown, max = 240) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function bool(value: unknown) {
  return value === true;
}

function first(data: unknown): Row | null {
  return Array.isArray(data) && data[0] && typeof data[0] === 'object' ? data[0] as Row : null;
}

function dbError(error: unknown): never {
  const message = error && typeof error === 'object' && 'message' in error ? String((error as { message?: unknown }).message || '') : String(error || 'Error de base de datos');
  if (/does not exist|relation .* not found|schema cache|42P01|PGRST205/i.test(message)) {
    throw new Error(`CUSTOMER_SCHEMA_NOT_READY:${message}`);
  }
  throw new Error(message || 'No se pudo acceder a los datos privados del cliente.');
}

async function one(table: string, key: string, value: string) {
  const { data, error } = await insforgeAdmin.database.from(table).select('*').eq(key, value).limit(1);
  if (error) dbError(error);
  return first(data);
}

async function consentRows(userId: string) {
  const { data, error } = await insforgeAdmin.database
    .from('user_consents')
    .select('consent_key, granted, terms_version, privacy_version, source, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) dbError(error);
  return Array.isArray(data) ? data as Row[] : [];
}

function latestConsent(rows: Row[], key: string) {
  return rows.find((row) => row.consent_key === key) ?? null;
}

export async function getCustomerAccountBundle(userId: string, email?: string) {
  const normalizedEmail = text(email, 180).toLowerCase();
  const [profile, address, consents] = await Promise.all([
    one('customer_profiles', 'user_id', userId),
    one('customer_addresses', 'user_id', userId),
    consentRows(userId),
  ]);

  const terms = latestConsent(consents, 'terms_privacy');
  const marketingEmail = latestConsent(consents, 'marketing_email');
  const marketingWhatsapp = latestConsent(consents, 'marketing_whatsapp');
  const currentTerms = Boolean(
    terms?.granted === true
      && terms?.terms_version === CUSTOMER_TERMS_VERSION
      && terms?.privacy_version === CUSTOMER_PRIVACY_VERSION,
  );

  return {
    schemaReady: true,
    profile: {
      firstName: text(profile?.first_name, 100),
      lastName: text(profile?.last_name, 120),
      phone: text(profile?.phone, 40),
      avatarUrl: text(profile?.avatar_url, 700),
      email: text(profile?.email || normalizedEmail, 180).toLowerCase(),
    },
    address: {
      address: text(address?.address_line1, 240),
      commune: text(address?.commune, 100),
      region: text(address?.region, 100),
      postalCode: text(address?.postal_code, 24),
      deliveryNotes: text(address?.delivery_notes, 300),
    },
    consent: {
      required: !currentTerms,
      acceptedAt: text(terms?.created_at, 80),
      termsVersion: currentTerms ? CUSTOMER_TERMS_VERSION : '',
      privacyVersion: currentTerms ? CUSTOMER_PRIVACY_VERSION : '',
      marketingEmail: marketingEmail ? bool(marketingEmail.granted) : bool(profile?.marketing_email),
      marketingWhatsapp: marketingWhatsapp ? bool(marketingWhatsapp.granted) : bool(profile?.marketing_whatsapp),
    },
  };
}

export async function requireCurrentCustomerConsent(userId: string, email?: string) {
  const bundle = await getCustomerAccountBundle(userId, email);
  if (bundle.consent.required) throw new Error('CONSENT_REQUIRED');
  return bundle;
}

export async function saveCustomerAccount(userId: string, email: string | undefined, input: CustomerInput) {
  const normalizedEmail = text(email, 180).toLowerCase();
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error('CUSTOMER_EMAIL_REQUIRED');

  const current = await getCustomerAccountBundle(userId, normalizedEmail);
  if (current.consent.required && input.acceptTerms !== true) throw new Error('CONSENT_REQUIRED');

  const now = new Date().toISOString();
  const firstName = text(input.firstName, 100) || current.profile.firstName;
  const lastName = text(input.lastName, 120) || current.profile.lastName;
  const phone = text(input.phone, 40);
  const avatarUrl = text(input.avatarUrl, 700) || current.profile.avatarUrl;
  const marketingEmail = Boolean(input.marketingEmail);
  const marketingWhatsapp = Boolean(input.marketingWhatsapp);
  const acceptedAt = current.consent.acceptedAt || now;

  const profilePayload = {
    user_id: userId,
    email: normalizedEmail,
    first_name: firstName,
    last_name: lastName,
    phone: phone || null,
    avatar_url: avatarUrl || null,
    marketing_email: marketingEmail,
    marketing_whatsapp: marketingWhatsapp,
    terms_version: CUSTOMER_TERMS_VERSION,
    privacy_version: CUSTOMER_PRIVACY_VERSION,
    accepted_terms_at: acceptedAt,
    last_seen_at: now,
    updated_at: now,
  };
  const profileWrite = await insforgeAdmin.database.from('customer_profiles').upsert([profilePayload], { onConflict: 'user_id' });
  if (profileWrite.error) dbError(profileWrite.error);

  const addressPayload = {
    user_id: userId,
    label: 'Principal',
    address_line1: text(input.address, 240),
    commune: text(input.commune, 100),
    region: text(input.region, 100),
    postal_code: text(input.postalCode, 24),
    delivery_notes: text(input.deliveryNotes, 300),
    updated_at: now,
  };
  const addressWrite = await insforgeAdmin.database.from('customer_addresses').upsert([addressPayload], { onConflict: 'user_id' });
  if (addressWrite.error) dbError(addressWrite.error);

  const source = text(input.source, 40) || 'web';
  const consentEvents: Row[] = [];
  if (current.consent.required && input.acceptTerms === true) {
    consentEvents.push({
      user_id: userId,
      email_snapshot: normalizedEmail,
      consent_key: 'terms_privacy',
      granted: true,
      terms_version: CUSTOMER_TERMS_VERSION,
      privacy_version: CUSTOMER_PRIVACY_VERSION,
      source,
      created_at: now,
    });
  }
  if (current.consent.marketingEmail !== marketingEmail) {
    consentEvents.push({ user_id: userId, email_snapshot: normalizedEmail, consent_key: 'marketing_email', granted: marketingEmail, terms_version: CUSTOMER_TERMS_VERSION, privacy_version: CUSTOMER_PRIVACY_VERSION, source, created_at: now });
  }
  if (current.consent.marketingWhatsapp !== marketingWhatsapp) {
    consentEvents.push({ user_id: userId, email_snapshot: normalizedEmail, consent_key: 'marketing_whatsapp', granted: marketingWhatsapp, terms_version: CUSTOMER_TERMS_VERSION, privacy_version: CUSTOMER_PRIVACY_VERSION, source, created_at: now });
  }
  if (consentEvents.length) {
    const consentWrite = await insforgeAdmin.database.from('user_consents').insert(consentEvents);
    if (consentWrite.error) dbError(consentWrite.error);
  }

  const name = `${firstName} ${lastName}`.trim() || normalizedEmail;
  const crmExisting = await one('crm_customers', 'user_id', userId);
  const crmPayload = {
    user_id: userId,
    name,
    email: normalizedEmail,
    phone: phone || null,
    source: crmExisting?.source || 'Cuenta web',
    marketing_email: marketingEmail,
    marketing_whatsapp: marketingWhatsapp,
    updated_at: now,
  };
  if (crmExisting?.id) {
    const crmWrite = await insforgeAdmin.database.from('crm_customers').update(crmPayload).eq('id', String(crmExisting.id));
    if (crmWrite.error) dbError(crmWrite.error);
  } else {
    const crmWrite = await insforgeAdmin.database.from('crm_customers').insert([{ ...crmPayload, lifecycle_stage: 'Registrado', created_at: now }]);
    if (crmWrite.error) dbError(crmWrite.error);
  }

  return getCustomerAccountBundle(userId, normalizedEmail);
}

export async function saveCustomerAvatar(userId: string, email: string | undefined, avatarUrl: string) {
  await requireCurrentCustomerConsent(userId, email);
  const url = text(avatarUrl, 700);
  if (!url) throw new Error('AVATAR_URL_REQUIRED');
  const { error } = await insforgeAdmin.database.from('customer_profiles').update({ avatar_url: url, updated_at: new Date().toISOString() }).eq('user_id', userId);
  if (error) dbError(error);
}

export async function syncCrmCustomerFromOrder(order: Row) {
  const email = text(order.customer_email || order.cliente_email, 180).toLowerCase();
  if (!email) return { ok: true, skipped: true };
  const customer = await one('crm_customers', 'email', email).catch(() => null);
  if (!customer?.id) return { ok: true, skipped: true };
  const total = Math.max(0, Math.round(Number(order.total || 0) || 0));
  const { error } = await insforgeAdmin.database.from('crm_customers').update({
    phone: text(order.customer_phone || order.cliente_telefono, 40) || customer.phone || null,
    lifecycle_stage: 'Cliente',
    last_order_id: text(order.id, 120) || null,
    last_order_at: text(order.created_at, 80) || new Date().toISOString(),
    last_order_total: total,
    updated_at: new Date().toISOString(),
  }).eq('id', String(customer.id));
  return { ok: !error, reason: error?.message };
}
