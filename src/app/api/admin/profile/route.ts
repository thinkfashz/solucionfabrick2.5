import { NextRequest, NextResponse } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';

type ProfileRow = {
  email: string;
  display_name?: string | null;
  phone?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  avatar_public_id?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

function text(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : null;
}

function numberValue(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

function normalizeProfile(body: Record<string, unknown>) {
  const existingMeta = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata as Record<string, unknown> : {};
  const socialStats = body.social_stats && typeof body.social_stats === 'object' && !Array.isArray(body.social_stats) ? body.social_stats as Record<string, unknown> : {};
  return {
    display_name: text(body.display_name, 120),
    phone: text(body.phone, 80),
    bio: text(body.bio, 1000),
    instagram: text(body.instagram, 200),
    facebook: text(body.facebook, 200),
    linkedin: text(body.linkedin, 200),
    whatsapp: text(body.whatsapp, 80),
    website: text(body.website, 240),
    metadata: {
      ...existingMeta,
      social_stats: {
        instagram_followers: numberValue(socialStats.instagram_followers),
        facebook_followers: numberValue(socialStats.facebook_followers),
        linkedin_followers: numberValue(socialStats.linkedin_followers),
        tiktok_followers: numberValue(socialStats.tiktok_followers),
      },
      updated_from: 'admin_profile_page',
      updated_at: new Date().toISOString(),
    },
  };
}

function fallbackProfile(email: string): ProfileRow {
  return {
    email,
    display_name: email.split('@')[0],
    phone: null,
    bio: null,
    avatar_url: null,
    instagram: null,
    facebook: null,
    linkedin: null,
    whatsapp: null,
    website: null,
    metadata: { social_stats: { instagram_followers: 0, facebook_followers: 0, linkedin_followers: 0, tiktok_followers: 0 } },
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

    return NextResponse.json({
      profile: profile ?? fallbackProfile(session.email),
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
    const current = await getProfile(session.email);
    const normalized = normalizeProfile({ ...(current ?? {}), ...body, metadata: { ...(current?.metadata ?? {}), ...((body.metadata as Record<string, unknown> | undefined) ?? {}) } });
    const client = getAdminInsforge();
    const row = { email: session.email, ...normalized };

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
