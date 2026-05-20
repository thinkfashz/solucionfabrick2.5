import Link from 'next/link';
import { ExternalLink, Globe2, Instagram, Linkedin, MessageCircle, User } from 'lucide-react';

export const dynamic = 'force-dynamic';

type PublicProfile = {
  display_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  gallery_images?: string[];
  socials?: Record<string, string | null | undefined>;
};

async function origin() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/+$/, '')}`;
  return 'http://localhost:3000';
}

async function getProfile(slug: string): Promise<PublicProfile | null> {
  try {
    const base = await origin();
    const res = await fetch(`${base}/api/public/profile/${encodeURIComponent(slug)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json() as { profile?: PublicProfile };
    return json.profile ?? null;
  } catch {
    return null;
  }
}

function socialUrl(value?: string | null, key?: string) {
  if (!value) return null;
  if (key === 'whatsapp') return value.startsWith('http') ? value : `https://wa.me/${value.replace(/\D/g, '')}`;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `https://${value}`;
}

function iconFor(key: string) {
  if (key === 'instagram') return Instagram;
  if (key === 'linkedin') return Linkedin;
  if (key === 'website') return Globe2;
  return MessageCircle;
}

export default async function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await getProfile(slug);

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
        <section className="max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl shadow-black/50">
          <User className="mx-auto h-10 w-10 text-zinc-500" />
          <p className="mt-5 text-xs font-black uppercase tracking-[0.25em] text-yellow-300">Perfil público</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.05em]">No disponible</h1>
          <p className="mt-3 text-sm text-zinc-400">Este perfil está desactivado, no existe o todavía no fue habilitado para NFC/QR.</p>
          <Link href="/" className="mt-6 inline-flex rounded-full bg-yellow-300 px-5 py-2 text-sm font-black text-black">Volver</Link>
        </section>
      </main>
    );
  }

  const socials = Object.entries(profile.socials ?? {})
    .map(([key, value]) => ({ key, href: socialUrl(value, key), Icon: iconFor(key) }))
    .filter((item) => item.href);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_36%),linear-gradient(180deg,#09090b,#020617)] px-4 py-8 text-white">
      <section className="mx-auto max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/80 shadow-2xl shadow-black/50 backdrop-blur">
        <div className="relative h-52 overflow-hidden bg-zinc-900">
          {profile.cover_url ? <img src={profile.cover_url} alt="Portada" className="h-full w-full object-cover brightness-75" /> : <div className="h-full w-full bg-[radial-gradient(circle_at_20%_10%,rgba(16,185,129,0.5),transparent_34%),linear-gradient(135deg,#111827,#020617)]" />}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-black/20 to-transparent" />
        </div>

        <div className="-mt-16 px-6 pb-8 text-center">
          <div className="mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-[8px] border-zinc-950 bg-zinc-900 shadow-xl">
            {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.display_name ?? 'Perfil'} className="h-full w-full object-cover" /> : <User className="h-12 w-12 text-zinc-500" />}
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-[-0.06em]">{profile.display_name || 'Soluciones Fabrick'}</h1>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-zinc-400">{profile.bio || 'Perfil público profesional.'}</p>

          <div className="mt-6 grid gap-3">
            {socials.map(({ key, href, Icon }) => (
              <a key={key} href={href ?? '#'} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:border-emerald-300/40 hover:bg-emerald-300/[0.05]">
                <span className="flex items-center gap-3"><Icon className="h-4 w-4 text-emerald-300" /><span className="text-sm font-bold capitalize">{key === 'website' ? 'Sitio web' : key}</span></span>
                <ExternalLink className="h-4 w-4 text-zinc-500" />
              </a>
            ))}
          </div>

          {(profile.gallery_images?.length ?? 0) > 0 && (
            <div className="mt-6 grid grid-cols-3 gap-2">
              {profile.gallery_images?.slice(0, 6).map((image) => <img key={image} src={image} alt="Galería" className="aspect-square rounded-2xl object-cover" />)}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
