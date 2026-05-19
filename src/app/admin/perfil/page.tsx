'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, ExternalLink, Globe2, IdCard, ImagePlus, Instagram, Linkedin, Loader2, MessageCircle, QrCode, Save, Settings2, ShieldCheck, SmartphoneNfc, User, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Metadata = {
  cover_url?: string | null;
  id_card_url?: string | null;
  gallery_images?: string[];
  public_slug?: string | null;
  nfc_enabled?: boolean;
  public_profile_enabled?: boolean;
};

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
  metadata?: Metadata | null;
};

const emptyProfile: Profile = {
  email: '', display_name: '', phone: '', bio: '', avatar_url: null,
  instagram: '', facebook: '', linkedin: '', whatsapp: '', website: '',
  metadata: { gallery_images: [], nfc_enabled: false, public_profile_enabled: false },
};

const inputClass = 'w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-yellow-300/60 focus:ring-2 focus:ring-yellow-300/10';
const labelClass = 'text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500';

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'SF';
}

function normalizeUrl(value?: string | null, type?: string) {
  if (!value) return null;
  if (type === 'whatsapp') return value.startsWith('http') ? value : `https://wa.me/${value.replace(/\D/g, '')}`;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `https://${value}`;
}

function updateMetadata(profile: Profile, patch: Partial<Metadata>): Profile {
  return { ...profile, metadata: { ...(profile.metadata ?? {}), ...patch } };
}

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [role, setRole] = useState('admin');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [editing, setEditing] = useState(true);
  const [qr, setQr] = useState<string | null>(null);
  const avatarRef = useRef<HTMLInputElement | null>(null);
  const coverRef = useRef<HTMLInputElement | null>(null);
  const idRef = useRef<HTMLInputElement | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/profile', { cache: 'no-store' });
        const json = await res.json();
        if (!alive) return;
        if (json.profile) setProfile({ ...emptyProfile, ...json.profile, metadata: { ...(emptyProfile.metadata ?? {}), ...(json.profile.metadata ?? {}) } });
        if (json.session?.rol) setRole(json.session.rol);
      } catch { if (alive) setStatus('No se pudo cargar el perfil.'); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const displayName = profile.display_name || 'Administrador Fabrick';
  const slug = profile.metadata?.public_slug || displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/perfil-publico/${slug}` : `/perfil-publico/${slug}`;
  const whatsappUrl = normalizeUrl(profile.whatsapp, 'whatsapp');
  const socialLinks = [
    { label: 'Instagram', value: profile.instagram, icon: Instagram },
    { label: 'Facebook', value: profile.facebook, icon: MessageCircle },
    { label: 'LinkedIn', value: profile.linkedin, icon: Linkedin },
    { label: 'WhatsApp', value: whatsappUrl, icon: MessageCircle },
    { label: 'Sitio web', value: profile.website, icon: Globe2 },
  ];
  const completion = Math.round(([profile.display_name, profile.phone, profile.bio, profile.avatar_url, profile.metadata?.cover_url, profile.instagram, profile.linkedin, profile.whatsapp, profile.website].filter(Boolean).length / 9) * 100);

  function update(key: keyof Profile, value: string) { setProfile((prev) => ({ ...prev, [key]: value })); }
  function meta(patch: Partial<Metadata>) { setProfile((prev) => updateMetadata(prev, patch)); }

  async function saveProfile() {
    setSaving(true); setStatus(null);
    try {
      const res = await fetch('/api/admin/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo guardar.');
      setProfile((prev) => ({ ...prev, ...json.profile, metadata: { ...(prev.metadata ?? {}), ...(json.profile?.metadata ?? {}) } }));
      setEditing(false);
      setStatus('Perfil guardado correctamente.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Error guardando perfil.'); }
    finally { setSaving(false); }
  }

  async function uploadAvatar(file: File) {
    setUploading('avatar'); setStatus(null);
    try {
      const form = new FormData(); form.append('photo', file);
      const res = await fetch('/api/admin/profile/photo', { method: 'POST', body: form });
      const json = await res.json(); if (!res.ok) throw new Error(json.error || 'No se pudo subir la imagen.');
      setProfile((prev) => ({ ...prev, avatar_url: json.photo }));
      setStatus('Foto de perfil guardada.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Error subiendo imagen.'); }
    finally { setUploading(null); }
  }

  async function uploadAsset(kind: 'cover' | 'id_card' | 'gallery', file: File) {
    setUploading(kind); setStatus(null);
    try {
      const form = new FormData(); form.append('kind', kind); form.append('file', file);
      const res = await fetch('/api/admin/profile/assets', { method: 'POST', body: form });
      const json = await res.json(); if (!res.ok) throw new Error(json.error || 'No se pudo subir imagen.');
      setProfile((prev) => updateMetadata(prev, json.metadata ?? {}));
      setStatus(kind === 'cover' ? 'Portada guardada.' : kind === 'id_card' ? 'ID guardado.' : 'Imagen añadida a galería.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Error subiendo imagen.'); }
    finally { setUploading(null); }
  }

  async function generateQr() {
    const value = profile.whatsapp ? normalizeUrl(profile.whatsapp, 'whatsapp') : publicUrl;
    const res = await fetch(`/api/admin/profile/qr?value=${encodeURIComponent(value || publicUrl)}`);
    const json = await res.json();
    if (json.qr) setQr(json.qr);
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-zinc-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando perfil...</div>;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 pb-10">
      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
        <Card className="relative mx-auto w-full max-w-md overflow-hidden border-white/10 bg-white text-zinc-950 shadow-2xl shadow-black/35 dark:bg-zinc-950 dark:text-white">
          <div className="relative z-10 h-64 overflow-hidden rounded-b-[3rem] bg-zinc-900">
            {profile.metadata?.cover_url ? <img src={profile.metadata.cover_url} alt="Portada" className="h-full w-full object-cover brightness-75" /> : <div className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.45),transparent_34%),linear-gradient(135deg,#111827,#020617)]" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
            <button type="button" onClick={() => coverRef.current?.click()} className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white backdrop-blur" aria-label="Cambiar portada"><ImagePlus className="h-4 w-4" /></button>
          </div>
          <div className="relative z-20 -mt-16 px-6 text-center">
            <button type="button" onClick={() => avatarRef.current?.click()} className="mx-auto block w-fit rounded-full border-[8px] border-white bg-white shadow-xl dark:border-zinc-950 dark:bg-zinc-950">
              <Avatar className="h-32 w-32 border-4 border-white bg-zinc-900 dark:border-zinc-900">
                {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt={displayName} /> : null}
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-zinc-950 text-3xl text-white">{initials(displayName)}</AvatarFallback>
              </Avatar>
            </button>
            <CardHeader className="px-0 pb-2 pt-4">
              <div className="flex justify-center gap-2"><Badge variant="secondary">{role}</Badge><Badge variant="success">Activo</Badge></div>
              <CardTitle className="mt-3 text-3xl font-black tracking-[-0.06em] text-zinc-950 dark:text-white">{displayName}</CardTitle>
              <CardDescription className="mx-auto max-w-xs pt-2 text-sm leading-relaxed text-zinc-500">{profile.bio || 'Añade una descripción profesional para demos, QR y NFC.'}</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pt-2">
              <div className="grid grid-cols-3 gap-2 rounded-3xl border border-zinc-200 bg-zinc-50 p-3 dark:border-white/10 dark:bg-white/[0.03]"><div className="text-center"><p className="text-2xl font-black">{completion}%</p><p className="text-[10px] uppercase tracking-widest text-zinc-500">Perfil</p></div><div className="border-x border-zinc-200 text-center dark:border-white/10"><p className="text-2xl font-black">{socialLinks.filter((s) => s.value).length}</p><p className="text-[10px] uppercase tracking-widest text-zinc-500">Redes</p></div><div className="text-center"><p className="text-2xl font-black">{profile.metadata?.gallery_images?.length ?? 0}</p><p className="text-[10px] uppercase tracking-widest text-zinc-500">Fotos</p></div></div>
            </CardContent>
          </div>
        </Card>

        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 p-6 shadow-2xl shadow-black/40 sm:p-8"><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_5%_10%,rgba(16,185,129,0.24),transparent_35%),radial-gradient(circle_at_95%_0%,rgba(250,204,21,0.14),transparent_32%)]" /><div className="relative"><p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">Perfil inteligente</p><h1 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.07em] text-white sm:text-6xl">Identidad admin, QR y NFC</h1><p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">Gestiona portada, avatar, ID, galería, redes y perfil público seguro sin exponer datos sensibles.</p><div className="mt-6 flex flex-wrap gap-3"><Button onClick={() => setEditing((v) => !v)} variant="secondary"><Settings2 className="h-4 w-4" /> {editing ? 'Ocultar edición' : 'Editar datos'}</Button><Button onClick={generateQr} variant="outline"><QrCode className="h-4 w-4" /> Generar QR WhatsApp</Button><a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-semibold text-zinc-200 hover:bg-white/10"><SmartphoneNfc className="h-4 w-4" /> Ver perfil público</a></div></div></section>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{socialLinks.map(({ label, value, icon: Icon }) => <a key={label} href={normalizeUrl(value, label === 'WhatsApp' ? 'whatsapp' : undefined) || '#'} target={value ? '_blank' : undefined} rel="noreferrer" className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5 transition hover:border-emerald-300/40 hover:bg-emerald-300/[0.04]"><Icon className="mb-4 h-5 w-5 text-emerald-300" /><p className="font-black text-white">{label}</p><p className="mt-1 truncate text-xs text-zinc-500">{value || 'Sin configurar'}</p></a>)}</section>
        </div>
      </motion.section>

      {editing && <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]"><Card className="border-white/10 bg-zinc-950/80"><CardHeader><CardTitle className="text-2xl font-black tracking-[-0.05em] text-white">Editar información</CardTitle><CardDescription>Al guardar se cerrará este panel de ajustes.</CardDescription></CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className={labelClass}>Nombre</span><input className={inputClass} value={profile.display_name ?? ''} onChange={(e) => update('display_name', e.target.value)} /></label><label className="space-y-2"><span className={labelClass}>Teléfono</span><input className={inputClass} value={profile.phone ?? ''} onChange={(e) => update('phone', e.target.value)} /></label><label className="space-y-2 sm:col-span-2"><span className={labelClass}>Bio</span><textarea className={inputClass} rows={4} value={profile.bio ?? ''} onChange={(e) => update('bio', e.target.value)} /></label><label className="space-y-2"><span className={labelClass}>Instagram</span><input className={inputClass} value={profile.instagram ?? ''} onChange={(e) => update('instagram', e.target.value)} /></label><label className="space-y-2"><span className={labelClass}>Facebook</span><input className={inputClass} value={profile.facebook ?? ''} onChange={(e) => update('facebook', e.target.value)} /></label><label className="space-y-2"><span className={labelClass}>LinkedIn</span><input className={inputClass} value={profile.linkedin ?? ''} onChange={(e) => update('linkedin', e.target.value)} /></label><label className="space-y-2"><span className={labelClass}>WhatsApp</span><input className={inputClass} value={profile.whatsapp ?? ''} onChange={(e) => update('whatsapp', e.target.value)} /></label><label className="space-y-2 sm:col-span-2"><span className={labelClass}>Sitio web</span><input className={inputClass} value={profile.website ?? ''} onChange={(e) => update('website', e.target.value)} /></label><label className="space-y-2"><span className={labelClass}>Slug público</span><input className={inputClass} value={profile.metadata?.public_slug ?? ''} onChange={(e) => meta({ public_slug: e.target.value })} /></label><label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-zinc-300"><input type="checkbox" checked={!!profile.metadata?.nfc_enabled} onChange={(e) => meta({ nfc_enabled: e.target.checked, public_profile_enabled: e.target.checked })} /> Activar perfil NFC/QR público</label></div><div className="mt-5 flex flex-wrap gap-3"><Button onClick={saveProfile} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar</Button><Button variant="outline" onClick={() => idRef.current?.click()}><IdCard className="h-4 w-4" /> Subir ID</Button><Button variant="outline" onClick={() => galleryRef.current?.click()}><ImagePlus className="h-4 w-4" /> Añadir galería</Button></div>{status && <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">{status}</p>}</CardContent></Card><aside className="space-y-4"><Card className="border-white/10 bg-zinc-950/80"><CardHeader><CardTitle className="text-white">ID privado</CardTitle><CardDescription>Se guarda separado del avatar y no se muestra en el perfil público.</CardDescription></CardHeader><CardContent>{profile.metadata?.id_card_url ? <img src={profile.metadata.id_card_url} alt="ID" className="aspect-video w-full rounded-2xl object-cover" /> : <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-white/15 text-sm text-zinc-500">Sin ID</div>}</CardContent></Card>{qr && <Card className="border-white/10 bg-white"><CardContent className="p-5"><img src={qr} alt="QR WhatsApp" className="w-full" /></CardContent></Card>}</aside></motion.section>}

      <section className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">{profile.metadata?.gallery_images?.map((image) => <img key={image} src={image} alt="Galería" className="aspect-square rounded-3xl object-cover" />)}</section>

      <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadAvatar(file); e.target.value = ''; }} />
      <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadAsset('cover', file); e.target.value = ''; }} />
      <input ref={idRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadAsset('id_card', file); e.target.value = ''; }} />
      <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadAsset('gallery', file); e.target.value = ''; }} />
      {uploading && <div className="fixed bottom-5 right-5 z-50 rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white shadow-2xl"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Subiendo {uploading}...</div>}
    </main>
  );
}
