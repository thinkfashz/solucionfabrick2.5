import { NextRequest, NextResponse } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';

const PROFILE_FIELDS = ['display_name', 'phone', 'bio', 'instagram', 'facebook', 'linkedin', 'whatsapp', 'website'] as const;

type ProfileField = (typeof PROFILE_FIELDS)[number];

type ProfileMetadata = {
  cover_url?: string | null;
  id_card_url?: string | null;
  gallery_images?: string[];
  public_slug?: string | null;
  nfc_enabled?: boolean;
  public_profile_enabled?: boolean;
  updated_from?: string;
  updated_at?: string;
};

type ProfileRow = Partial<Record<ProfileField, string | null>> & {
  email: string;
  avatar_url?: string | null;
  avatar_public_id?: string | null;
  metadata?: ProfileMetadata | null;
  created_at?: string;
  updated_at?: string;
};

function text(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : null;
}

function bool(value: unknown) {
  return value === true;
}

function stringArray(value: unknown, maxItems = 12) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()).slice(0, maxItems);
}

function makeSlug(value: unknown, fallback: string) {
  const raw = typeof value === 'string' && value.trim() ? value : fallback;
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || fallback;
}

function normalizeProfile(body: Record<string, unknown>) {
  return {
    display_name: text(body.display_name, 120),
    phone: text(body.phone, 80),
    bio: text(body.bio, 1000),
    instagram: text(body.instagram, 200),
    facebook: text(body.facebook, 200),
    linkedin: text(body.linkedin, 200),
    whatsapp: text(body.whatsapp, 80),
    website: text(body.website, 240),
  } satisfies Partial<Record<ProfileField, string | null>>;
}

function normalizeMetadata(body: Record<string, unknown>, email: string, previous?: ProfileMetadata | null): ProfileMetadata {
  const incoming = body.metadata && typeof body.metadata === 'object' ? body.metadata as Record<string, unknown> : {};
  const fallbackSlug = email.split('@')[0] || 'perfil';
  return {
    ...(previous ?? {}),
    cover_url: text(incoming.cover_url, 1200) ?? previous?.cover_url ?? null,
    id_card_url: text(incoming.id_card_url, 1200) ?? previous?.id_card_url ?? null,
    gallery_images: stringArray(incoming.gallery_images).length ? stringArray(incoming.gallery_images) : previous?.gallery_images ?? [],
    public_slug: makeSlug(incoming.public_slug, fallbackSlug),
    nfc_enabled: bool(incoming.nfc_enabled),
    public_profile_enabled: bool(incoming.public_profile_enabled),
    updated_from: 'admin_profile_page',
    updated_at: new Date().toISOString(),
  };
}

async function getProfile(email: string) {
  const client = getAdminInsforge();
  const { data, error } = await client.database
    .from('admin_profiles')
    .select('email, display_name, phone, bio, avatar_url, avatar_public_id, instagram, facebook, linkedin, whatsapp, website, metadata, created_at, updated_at')
    .eq('email', email)
    .maybeSingle();

  if (error) return null;
  return data as ProfileRow | null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const profile = await getProfile(session.email);
    const fallbackMetadata: ProfileMetadata = {
      cover_url: null,
      id_card_url: null,
      gallery_images: [],
      public_slug: makeSlug(session.email.split('@')[0], 'perfil'),
      nfc_enabled: false,
      public_profile_enabled: false,
    };

    return NextResponse.json({
      profile: profile ? { ...profile, metadata: { ...fallbackMetadata, ...(profile.metadata ?? {}) } } : {
        email: session.email,
        display_name: session.email.split('@')[0],
        phone: null,
        bio: null,
        avatar_url: null,
        instagram: null,
        facebook: null,
        linkedin: null,
        whatsapp: null,
        website: null,
        metadata: fallbackMetadata,
      },
      session: {
        email: session.email,
        rol: session.rol ?? 'admin',
        exp: session.exp,
      },
    });
  } catch (err) {
    return adminError(err, 'ADMIN_PROFILE_GET_FAILED', 500, request);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const body = (await request.json()) as Record<string, unknown>;
    const previous = await getProfile(session.email);
    const client = getAdminInsforge();
    const row = {
      email: session.email,
      ...normalizeProfile(body),
      metadata: normalizeMetadata(body, session.email, previous?.metadata),
    };

    const { data, error } = await client.database
      .from('admin_profiles')
      .upsert([row], { onConflict: 'email' })
      .select('email, display_name, phone, bio, avatar_url, instagram, facebook, linkedin, whatsapp, website, metadata, created_at, updated_at')
      .single();

    if (error) {
      return NextResponse.json({ error: 'No se pudo guardar el perfil. Ejecuta la migración admin_profiles.', hint: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, profile: data });
  } catch (err) {
    return adminError(err, 'ADMIN_PROFILE_PATCH_FAILED', 500, request);
  }
}
