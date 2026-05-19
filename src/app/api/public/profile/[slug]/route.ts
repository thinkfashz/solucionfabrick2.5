import { NextRequest, NextResponse } from 'next/server';
import { getAdminInsforge } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';

type Metadata = {
  cover_url?: string | null;
  id_card_url?: string | null;
  gallery_images?: string[];
  public_slug?: string | null;
  nfc_enabled?: boolean;
  public_profile_enabled?: boolean;
};

type ProfileRow = {
  email?: string;
  display_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  metadata?: Metadata | null;
};

function publicSocial(url?: string | null) {
  return typeof url === 'string' && url.trim() ? url.trim() : null;
}

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const cleanSlug = slug.toLowerCase().trim();
    const client = getAdminInsforge();
    const { data, error } = await client.database
      .from('admin_profiles')
      .select('display_name, bio, avatar_url, instagram, facebook, linkedin, whatsapp, website, metadata')
      .contains('metadata', { public_slug: cleanSlug })
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: 'Perfil público no encontrado.' }, { status: 404 });
    }

    const row = data as ProfileRow;
    const metadata = row.metadata ?? {};
    if (!metadata.public_profile_enabled || !metadata.nfc_enabled) {
      return NextResponse.json({ error: 'Perfil público desactivado.' }, { status: 404 });
    }

    return NextResponse.json({
      profile: {
        display_name: row.display_name,
        bio: row.bio,
        avatar_url: row.avatar_url,
        cover_url: metadata.cover_url ?? null,
        gallery_images: Array.isArray(metadata.gallery_images) ? metadata.gallery_images.slice(0, 6) : [],
        socials: {
          instagram: publicSocial(row.instagram),
          facebook: publicSocial(row.facebook),
          linkedin: publicSocial(row.linkedin),
          whatsapp: publicSocial(row.whatsapp),
          website: publicSocial(row.website),
        },
      },
    });
  } catch {
    return NextResponse.json({ error: 'No se pudo cargar el perfil público.' }, { status: 500 });
  }
}
