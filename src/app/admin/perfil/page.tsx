'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Camera, CheckCircle2, ExternalLink, Facebook, Globe2, Instagram, Linkedin, Loader2, Megaphone, MessageCircle, Save, ShieldCheck, Sparkles, User, X, Zap } from 'lucide-react';

type Profile = {
  email: string;
  display_name: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  whatsapp: string | null;
  website: string | null;
  metadata?: { social_stats?: SocialStats } | null;
};

type SocialStats = {
  instagram_followers?: number;
  facebook_followers?: number;
  linkedin_followers?: number;
  tiktok_followers?: number;
};

type AdsStatus = {
  connected: boolean;
  accessToken?: { present: boolean; source: string | null; healthy: boolean; message: string };
  adAccount?: { present: boolean; source: string | null; masked: string | null };
  facebookPage?: { present: boolean; source: string | null; masked: string | null };
  instagramBusiness?: { present: boolean; source: string | null; masked: string | null };
};

const emptyProfile: Profile = {
  email: '', display_name: '', phone: '', bio: '', avatar_url: null, instagram: '', facebook: '', linkedin: '', whatsapp: '', website: '', metadata: { social_stats: {} },
};

function initials(name: string) { return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'SF'; }
function fmt(n?: number) { return Math.max(0, Number(n || 0)).toLocaleString('es-CL'); }
function socialStats(profile: Profile): SocialStats { return profile.metadata?.social_stats || {}; }

function Field({ label, value, onChange, placeholder, textarea = false, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean; type?: string }) {
  return <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[0.28em] text-sky-200/55">{label}</span>{textarea ? <textarea value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} rows={5} className="w-full rounded-[1.4rem] border border-white/10 bg-black/25 px-4 py-4 text-base text-white outline-none placeholder:text-white/25 focus:border-sky-200/50" /> : <input type={type} value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} className="h-14 w-full rounded-[1.4rem] border border-white/10 bg-black/25 px-4 text-base text-white outline-none placeholder:text-white/25 focus:border-sky-200/50" />}</label>;
}

function SocialCard({ icon: Icon, title, handle, followers, href }: { icon: typeof Instagram; title: string; handle?: string | null; followers?: number; href?: string | null }) {
  return <a href={href || '#'} target={href ? '_blank' : undefined} rel="noreferrer" className="group rounded-[2rem] border border-white/10 bg-white/[0.075] p-5 shadow-[0_25px_70px_rgba(0,0,0,.22)] backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/12"><Icon className="mb-5 h-8 w-8 text-sky-200"/><h3 className="text-2xl font-black text-white">{title}</h3><p className="mt-1 truncate text-sm text-white/45">{handle || 'Sin configurar'}</p><div className="mt-5 rounded-[1.2rem] bg-[#d9ecff] p-4 text-[#0a2540]"><b className="block text-2xl font-black">{fmt(followers)}</b><span className="text-xs font-bold text-[#486984]">seguidores</span></div></a>;
}

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [role, setRole] = useState('admin');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [ads, setAds] = useState<AdsStatus | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [profileRes, adsRes] = await Promise.allSettled([
        fetch('/api/admin/profile', { cache: 'no-store' }).then((r)=>r.json()),
        fetch('/api/admin/ads/status', { cache: 'no-store' }).then((r)=>r.json()),
      ]);
      if (profileRes.status === 'fulfilled') {
        if (profileRes.value.profile) setProfile({ ...emptyProfile, ...profileRes.value.profile });
        if (profileRes.value.session?.rol) setRole(profileRes.value.session.rol);
      }
      if (adsRes.status === 'fulfilled' && adsRes.value?.ok) setAds(adsRes.value);
    } catch { setStatus('No se pudo cargar el perfil.'); } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const displayName = profile.display_name || profile.email.split('@')[0] || 'Administrador Fabrick';
  const stats = socialStats(profile);
  const totalFollowers = Number(stats.instagram_followers || 0) + Number(stats.facebook_followers || 0) + Number(stats.linkedin_followers || 0) + Number(stats.tiktok_followers || 0);
  const socialCount = [profile.instagram, profile.facebook, profile.linkedin, profile.website].filter(Boolean).length;
  const completion = Math.round(([profile.display_name, profile.phone, profile.bio, profile.avatar_url, profile.instagram, profile.facebook, profile.linkedin, profile.whatsapp, profile.website].filter(Boolean).length / 9) * 100);

  function update(key: keyof Profile, value: string) { setProfile((prev) => ({ ...prev, [key]: value })); }
  function updateFollower(key: keyof SocialStats, value: string) {
    setProfile((prev) => ({ ...prev, metadata: { ...(prev.metadata || {}), social_stats: { ...(prev.metadata?.social_stats || {}), [key]: Number(value) || 0 } } }));
  }

  async function saveProfile() {
    setSaving(true); setStatus('');
    try {
      const res = await fetch('/api/admin/profile', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...profile, social_stats: socialStats(profile), metadata: profile.metadata || {} }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo guardar.');
      setProfile((prev)=>({ ...prev, ...json.profile }));
      setStatus('Perfil guardado correctamente.');
    } catch (err) { setStatus(err instanceof Error ? err.message : 'Error guardando perfil.'); } finally { setSaving(false); }
  }

  async function uploadAvatar(file: File) {
    setUploading(true); setStatus('');
    try {
      const form = new FormData(); form.append('photo', file);
      const res = await fetch('/api/admin/profile/photo', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo subir la imagen.');
      setProfile((prev)=>({ ...prev, avatar_url: json.photo }));
      setStatus('Imagen guardada correctamente.');
    } catch (err) { setStatus(err instanceof Error ? err.message : 'Error subiendo imagen.'); } finally { setUploading(false); }
  }

  async function deleteAvatar() {
    setUploading(true); setStatus('');
    try {
      const res = await fetch('/api/admin/profile/photo', { method: 'DELETE' });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(json.error || 'No se pudo eliminar la imagen.');
      setProfile((prev)=>({ ...prev, avatar_url: null }));
      setStatus('Imagen eliminada.');
    } catch (err) { setStatus(err instanceof Error ? err.message : 'Error eliminando imagen.'); } finally { setUploading(false); }
  }

  if (loading) return <div className="grid min-h-[70vh] place-items-center bg-[#07192c] text-white"><Loader2 className="h-8 w-8 animate-spin text-sky-200" /></div>;

  return <main className="relative min-h-screen overflow-hidden bg-[#07192c] p-4 text-white sm:p-6 lg:p-8">
    <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e)=>{ const file = e.target.files?.[0]; if (file) void uploadAvatar(file); e.currentTarget.value=''; }} />
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(125,211,252,.25),transparent_32rem),radial-gradient(circle_at_90%_18%,rgba(255,255,255,.1),transparent_28rem),linear-gradient(180deg,#08243d,#07192c_55%,#06111f)]" />
    <section className="relative mx-auto grid max-w-7xl gap-5">
      <header className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <article className="overflow-hidden rounded-[2.8rem] border border-white/10 bg-white/[0.075] shadow-[0_30px_90px_rgba(0,0,0,.30)] backdrop-blur-2xl">
          <div className="relative h-72 bg-[#06111f]">
            {profile.avatar_url ? <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover grayscale opacity-70" /> : <div className="grid h-full w-full place-items-center bg-gradient-to-br from-sky-200 to-blue-950 text-5xl font-black">{initials(displayName)}</div>}
            <div className="absolute inset-0 bg-gradient-to-t from-[#06111f] via-[#06111f]/25 to-transparent" />
            <button onClick={()=>fileRef.current?.click()} className="absolute right-5 top-5 grid h-12 w-12 place-items-center rounded-full bg-white/15 backdrop-blur-xl"><Camera className="h-5 w-5"/></button>
          </div>
          <div className="relative -mt-16 px-6 pb-7 text-center">
            <div className="mx-auto grid h-36 w-36 place-items-center overflow-hidden rounded-full border-[10px] border-[#06111f] bg-gradient-to-br from-sky-200 to-blue-900 text-3xl font-black shadow-2xl">{profile.avatar_url ? <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" /> : initials(displayName)}</div>
            <div className="mt-5 flex justify-center gap-2"><span className="rounded-full bg-white/12 px-4 py-1 text-xs font-black uppercase tracking-wider">{role}</span><span className="rounded-full bg-emerald-400/18 px-4 py-1 text-xs font-black uppercase tracking-wider text-emerald-200">Activo</span></div>
            <h1 className="mt-4 text-4xl font-black tracking-tight">{displayName}</h1>
            <p className="mt-2 text-sm text-white/45">{profile.email}</p>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-white/55">{profile.bio || 'Añade una descripción profesional para demos y presentaciones.'}</p>
            <div className="mt-6 grid grid-cols-3 overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.07]"><div className="p-4"><b className="block text-2xl">{completion}%</b><span className="text-[10px] uppercase tracking-widest text-white/40">Perfil</span></div><div className="border-x border-white/10 p-4"><b className="block text-2xl">{socialCount}</b><span className="text-[10px] uppercase tracking-widest text-white/40">Redes</span></div><div className="p-4"><b className="block text-2xl">{fmt(totalFollowers)}</b><span className="text-[10px] uppercase tracking-widest text-white/40">Seguidores</span></div></div>
            <div className="mt-5 grid gap-3"><button onClick={()=>fileRef.current?.click()} className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#f4bf38] text-sm font-black text-[#07192c] disabled:opacity-50" disabled={uploading}>{uploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Camera className="h-4 w-4"/>} Cambiar foto</button><button onClick={()=>void deleteAvatar()} disabled={!profile.avatar_url || uploading} className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-white disabled:opacity-40"><X className="h-4 w-4"/> Eliminar</button></div>
          </div>
        </article>

        <article className="rounded-[2.8rem] border border-white/10 bg-white/[0.075] p-6 shadow-[0_30px_90px_rgba(0,0,0,.25)] backdrop-blur-2xl sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-sky-200">Perfil administrativo</p>
          <h2 className="mt-4 max-w-4xl text-5xl font-black leading-[.95] tracking-tight sm:text-7xl">Identidad, redes y anuncios en un solo lugar.</h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-white/60">Tu foto, nombre, rol y datos sociales ahora alimentan el sidebar, demos comerciales y panel de control. También puedes validar si Meta/Facebook Ads está conectado.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3"><div className="rounded-[2rem] bg-[#d9ecff] p-5 text-[#0a2540]"><ShieldCheck className="mb-3 h-6 w-6"/><b className="block text-2xl">{role}</b><span className="text-sm text-[#486984]">Rol activo</span></div><div className="rounded-[2rem] bg-white/10 p-5"><BarChart3 className="mb-3 h-6 w-6 text-sky-200"/><b className="block text-2xl">{fmt(totalFollowers)}</b><span className="text-sm text-white/50">Seguidores totales</span></div><div className="rounded-[2rem] bg-white/10 p-5"><Sparkles className="mb-3 h-6 w-6 text-yellow-200"/><b className="block text-2xl">{ads?.connected ? 'Conectado' : 'Revisar'}</b><span className="text-sm text-white/50">Meta Ads</span></div></div>
        </article>
      </header>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <article className="rounded-[2.8rem] border border-white/10 bg-white/[0.075] p-6 shadow-[0_30px_90px_rgba(0,0,0,.22)] backdrop-blur-2xl sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-3xl font-black">Editar información</h2><p className="mt-1 text-sm text-white/50">Guarda datos personales, redes y métricas visibles.</p></div><button onClick={()=>void saveProfile()} disabled={saving} className="inline-flex h-13 min-h-[52px] items-center gap-2 rounded-2xl bg-[#f4bf38] px-6 text-sm font-black text-[#07192c] disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>} Guardar</button></div>
          {status && <div className="mt-5 rounded-2xl border border-sky-200/20 bg-sky-200/10 p-4 text-sm text-sky-100">{status}</div>}
          <div className="mt-6 grid gap-5 md:grid-cols-2"><Field label="Nombre" value={profile.display_name || ''} onChange={(v)=>update('display_name', v)} /><Field label="Teléfono" value={profile.phone || ''} onChange={(v)=>update('phone', v)} /><div className="md:col-span-2"><Field label="Bio" value={profile.bio || ''} onChange={(v)=>update('bio', v)} textarea /></div><Field label="Instagram" value={profile.instagram || ''} onChange={(v)=>update('instagram', v)} placeholder="@usuario o URL" /><Field label="Facebook" value={profile.facebook || ''} onChange={(v)=>update('facebook', v)} /><Field label="LinkedIn" value={profile.linkedin || ''} onChange={(v)=>update('linkedin', v)} /><Field label="WhatsApp" value={profile.whatsapp || ''} onChange={(v)=>update('whatsapp', v)} /><div className="md:col-span-2"><Field label="Sitio web" value={profile.website || ''} onChange={(v)=>update('website', v)} /></div></div>
          <div className="mt-8"><h3 className="text-2xl font-black">Seguidores y alcance social</h3><p className="mt-1 text-sm text-white/50">Ingresa los números reales; después podemos conectarlos por API.</p><div className="mt-5 grid gap-4 md:grid-cols-4"><Field label="Instagram" type="number" value={String(stats.instagram_followers || 0)} onChange={(v)=>updateFollower('instagram_followers', v)} /><Field label="Facebook" type="number" value={String(stats.facebook_followers || 0)} onChange={(v)=>updateFollower('facebook_followers', v)} /><Field label="LinkedIn" type="number" value={String(stats.linkedin_followers || 0)} onChange={(v)=>updateFollower('linkedin_followers', v)} /><Field label="TikTok" type="number" value={String(stats.tiktok_followers || 0)} onChange={(v)=>updateFollower('tiktok_followers', v)} /></div></div>
        </article>

        <aside className="grid h-fit gap-5">
          <article className="rounded-[2.5rem] border border-white/10 bg-[#d9ecff] p-5 text-[#0a2540] shadow-[0_25px_80px_rgba(0,0,0,.22)]"><div className="flex items-center justify-between"><h3 className="text-2xl font-black">Meta / Facebook Ads</h3><Megaphone className="h-6 w-6"/></div><p className="mt-2 text-sm text-[#486984]">Estado de tu clave y cuenta publicitaria sin mostrar secretos.</p><div className="mt-5 grid gap-3"><div className="rounded-2xl bg-white/65 p-4"><span className="text-xs font-black uppercase tracking-widest text-[#486984]">Token</span><b className="mt-1 block">{ads?.accessToken?.present ? ads.accessToken.healthy ? 'Activo' : 'Presente con error' : 'No configurado'}</b><p className="mt-1 text-xs text-[#486984]">{ads?.accessToken?.message || 'Sin validar'}</p></div><div className="rounded-2xl bg-white/65 p-4"><span className="text-xs font-black uppercase tracking-widest text-[#486984]">Ad Account</span><b className="mt-1 block">{ads?.adAccount?.masked || 'No configurada'}</b><p className="mt-1 text-xs text-[#486984]">Fuente: {ads?.adAccount?.source || 'sin fuente'}</p></div><div className="rounded-2xl bg-white/65 p-4"><span className="text-xs font-black uppercase tracking-widest text-[#486984]">Instagram Business</span><b className="mt-1 block">{ads?.instagramBusiness?.present ? 'Conectado' : 'No conectado'}</b></div></div><div className="mt-5 grid gap-2"><Link href="/admin/publicidad" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#0a2540] text-sm font-black text-white"><Megaphone className="h-4 w-4"/> Ir a publicidad</Link><Link href="/admin/publicidad/coach" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#f4bf38] text-sm font-black text-[#0a2540]"><Zap className="h-4 w-4"/> Coach anuncios</Link></div></article>
          <article className="rounded-[2.5rem] border border-white/10 bg-white/[0.075] p-5 backdrop-blur-xl"><h3 className="text-2xl font-black">Estado del perfil</h3><p className="mt-2 text-sm text-white/50">Información lista para demos, sidebar y presentación interna.</p><div className="mt-5 grid gap-3"><div className="flex justify-between rounded-2xl bg-white/10 p-4"><span>Foto</span><b>{profile.avatar_url ? 'Configurada' : 'Pendiente'}</b></div><div className="flex justify-between rounded-2xl bg-white/10 p-4"><span>Contacto</span><b>{profile.phone && profile.whatsapp ? 'Completo' : 'Parcial'}</b></div><div className="flex justify-between rounded-2xl bg-white/10 p-4"><span>Redes</span><b>{socialCount}/4</b></div></div></article>
        </aside>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><SocialCard icon={Instagram} title="Instagram" handle={profile.instagram} followers={stats.instagram_followers} href={profile.instagram} /><SocialCard icon={Facebook} title="Facebook" handle={profile.facebook} followers={stats.facebook_followers} href={profile.facebook} /><SocialCard icon={Linkedin} title="LinkedIn" handle={profile.linkedin} followers={stats.linkedin_followers} href={profile.linkedin} /><SocialCard icon={Globe2} title="Sitio web" handle={profile.website} followers={stats.tiktok_followers} href={profile.website} /></section>
    </section>
  </main>;
}
