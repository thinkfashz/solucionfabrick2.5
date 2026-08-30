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

function publicMeta(row: AdminProfileRow) {
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  return normalizeFounderPublicProfile(metadata.public_profile);
}

export async function getPublicFounderProfile(): Promise<PublicFounderProfile> {
  const client = getAdminInsforge();
  const { data, error } = await client.database
    .from('admin_profiles')
    .select('display_name, bio, avatar_url, instagram, facebook, linkedin, whatsapp, website, metadata, updated_at')
    .order('updated_at', { ascending: false })
    .limit(20);

  const rows = !error && Array.isArray(data) ? data as AdminProfileRow[] : [];
  const selected = rows.find((row) => publicMeta(row).is_owner)
    ?? rows.find((row) => publicMeta(row).enabled)
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
    instagram: selected.instagram || null,
    facebook: selected.facebook || null,
    linkedin: selected.linkedin || null,
    whatsapp: selected.whatsapp || null,
    website: selected.website || null,
    profile,
  };
}
