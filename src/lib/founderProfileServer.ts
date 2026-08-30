import 'server-only';
import { getAdminInsforge } from '@/lib/adminApi';
import { normalizeFounderPublicProfile, type FounderPublicProfile } from '@/lib/founderProfile';

type AdminProfileRow = {
  display_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  metadata?: Record<string, unknown> | null;
  updated_at?: string | null;
};

export type PublicFounderProfile = {
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  whatsapp: string | null;
  website: string | null;
  profile: FounderPublicProfile;
};

function rawPublicMeta(row: AdminProfileRow) {
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const value = metadata.public_profile;
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function publicMeta(row: AdminProfileRow) {
  return normalizeFounderPublicProfile(rawPublicMeta(row));
}

function isExplicitOwner(row: AdminProfileRow) {
  return rawPublicMeta(row)?.is_owner === true;
}

function isExplicitlyEnabled(row: AdminProfileRow) {
  return rawPublicMeta(row)?.enabled === true;
}

function normalizePublicSocial(value: string | null | undefined, network: 'instagram' | 'facebook' | 'linkedin') {
  const raw = value?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;

  const withoutAt = raw.replace(/^@/, '');
  if (network === 'instagram') {
    const handle = withoutAt
      .replace(/^(?:www\.)?instagram\.com\//i, '')
      .replace(/^\/+|\/+$/g, '');
    return handle ? `https://instagram.com/${handle}` : null;
  }
  if (network === 'facebook') {
    const handle = withoutAt
      .replace(/^(?:www\.)?facebook\.com\//i, '')
      .replace(/^\/+|\/+$/g, '');
    return handle ? `https://facebook.com/${handle}` : null;
  }

  const handle = withoutAt
    .replace(/^(?:www\.)?linkedin\.com\/(?:in\/)?/i, '')
    .replace(/^\/+|\/+$/g, '');
  return handle ? `https://linkedin.com/in/${handle}` : null;
}

export async function getPublicFounderProfile(): Promise<PublicFounderProfile> {
  const client = getAdminInsforge();
  const { data, error } = await client.database
    .from('admin_profiles')
    .select('display_name, bio, avatar_url, instagram, facebook, linkedin, whatsapp, website, metadata, updated_at')
    .order('updated_at', { ascending: false })
    .limit(20);

  const rows = !error && Array.isArray(data) ? data as AdminProfileRow[] : [];
  const selected = rows.find(isExplicitOwner)
    ?? rows.find(isExplicitlyEnabled)
    ?? rows[0]
    ?? {};
  const profile = publicMeta(selected);
  const metadata = selected.metadata && typeof selected.metadata === 'object' ? selected.metadata : {};
  const coverUrl = typeof metadata.cover_url === 'string' && metadata.cover_url.trim() ? metadata.cover_url : null;

  return {
    displayName: selected.display_name?.trim() || 'Fundador de Soluciones Fabrick',
    bio: selected.bio?.trim() || profile.summary,
    avatarUrl: selected.avatar_url || null,
    coverUrl,
    instagram: normalizePublicSocial(selected.instagram, 'instagram'),
    facebook: normalizePublicSocial(selected.facebook, 'facebook'),
    linkedin: normalizePublicSocial(selected.linkedin, 'linkedin'),
    whatsapp: selected.whatsapp || null,
    website: selected.website || null,
    profile,
  };
}