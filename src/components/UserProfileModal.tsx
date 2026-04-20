'use client';

import { useEffect, useState } from 'react';
import { X, User, MapPin, MessageCircle, Instagram, Facebook } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const PROFILE_KEY = (id: string) => `fabrick.profile.v1.${id}`;

export interface UserProfile {
  nombre: string;
  apellido: string;
  direccion: string;
  whatsapp: string;
  instagram?: string;
  tiktok?: string;
  facebook?: string;
}

export function getStoredProfile(userId: string): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY(userId));
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

function saveProfile(userId: string, profile: UserProfile) {
  try {
    localStorage.setItem(PROFILE_KEY(userId), JSON.stringify(profile));
  } catch {}
}

function isProfileComplete(p: UserProfile | null): boolean {
  if (!p) return false;
  return Boolean(p.nombre?.trim() && p.apellido?.trim() && p.direccion?.trim() && p.whatsapp?.trim());
}

function Field({
  label, icon: Icon, value, onChange, placeholder, type = 'text', required,
}: {
  label: string; icon: React.ComponentType<{ className?: string }>; value: string;
  onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-zinc-400">
        <Icon className="h-3 w-3 text-yellow-400/70" />
        {label}{required && <span className="text-yellow-400">*</span>}
      </label>
      <input
        type={type} value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-yellow-400/50 focus:outline-none transition-colors duration-200"
      />
    </div>
  );
}

// TikTok icon (not in lucide)
function IconTikTok({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.19 8.19 0 004.79 1.52V6.78a4.85 4.85 0 01-1.02-.09z"/>
    </svg>
  );
}

export default function UserProfileModal() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [direccion, setDireccion] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [facebook, setFacebook] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    const profile = getStoredProfile(user.id);
    if (!isProfileComplete(profile)) {
      // Pre-fill name from auth if available
      if (user.name) {
        const parts = user.name.split(' ');
        setNombre(parts[0] || '');
        setApellido(parts.slice(1).join(' ') || '');
      }
      // Slight delay so page loads first
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [user]);

  function handleSave() {
    if (!nombre.trim() || !apellido.trim() || !direccion.trim() || !whatsapp.trim()) {
      setError('Por favor completa los campos obligatorios.');
      return;
    }
    if (!user?.id) return;
    const profile: UserProfile = { nombre, apellido, direccion, whatsapp, instagram, tiktok, facebook };
    saveProfile(user.id, profile);
    setSaved(true);
    setTimeout(() => setOpen(false), 900);
  }

  if (!open || !user) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(circle at 50% 35%, rgba(201,169,110,0.06), rgba(0,0,0,0.96) 60%)' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md animate-[fadeUp_0.5s_cubic-bezier(0.16,1,0.3,1)_both]">
        {/* Gold top bar */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />

        <div className="rounded-b-[2rem] rounded-t-none border border-white/8 bg-[#0a0a0b]/95 p-7 shadow-[0_30px_80px_rgba(0,0,0,0.8),0_0_0_1px_rgba(201,169,110,0.08)] backdrop-blur-2xl">
          {/* Close button */}
          <button
            onClick={() => setOpen(false)}
            className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-zinc-500 transition hover:border-white/25 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header */}
          <div className="mb-7 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-400/10 ring-1 ring-yellow-400/25">
              <User className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-yellow-400/70">Bienvenido</p>
              <h2 className="font-playfair text-xl font-bold text-white">Completa tu perfil</h2>
            </div>
          </div>
          <p className="mb-6 text-sm leading-relaxed text-zinc-400">
            Para personalizar tu experiencia y gestionar tus pedidos, completa tu información de contacto.
          </p>

          {/* Required fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre" icon={User} value={nombre} onChange={setNombre} placeholder="Juan" required />
              <Field label="Apellido" icon={User} value={apellido} onChange={setApellido} placeholder="García" required />
            </div>
            <Field label="Dirección" icon={MapPin} value={direccion} onChange={setDireccion} placeholder="Calle 123, Santiago" required />
            <Field label="WhatsApp" icon={MessageCircle} value={whatsapp} onChange={setWhatsapp} placeholder="+56 9 XXXX XXXX" type="tel" required />

            {/* Divider */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-[10px] uppercase tracking-widest text-zinc-600">Redes sociales (opcional)</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  <Instagram className="h-3 w-3 text-pink-400/70" /> Instagram
                </label>
                <input
                  value={instagram} onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@usuario"
                  className="rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-xs text-white placeholder:text-white/20 focus:border-pink-400/40 focus:outline-none transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  <IconTikTok className="h-3 w-3 text-cyan-400/70" /> TikTok
                </label>
                <input
                  value={tiktok} onChange={(e) => setTiktok(e.target.value)}
                  placeholder="@usuario"
                  className="rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-xs text-white placeholder:text-white/20 focus:border-cyan-400/40 focus:outline-none transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  <Facebook className="h-3 w-3 text-blue-400/70" /> Facebook
                </label>
                <input
                  value={facebook} onChange={(e) => setFacebook(e.target.value)}
                  placeholder="@usuario"
                  className="rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-xs text-white placeholder:text-white/20 focus:border-blue-400/40 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-xs text-red-400">{error}</p>
          )}

          {saved && (
            <p className="mt-4 rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-2.5 text-xs text-green-400">
              ✓ Perfil guardado exitosamente
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 rounded-full bg-yellow-400 py-3.5 text-[11px] font-black uppercase tracking-[0.2em] text-black transition hover:bg-yellow-300 active:scale-[0.98]"
            >
              Guardar perfil
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full border border-white/10 px-5 py-3.5 text-[11px] font-semibold text-zinc-400 transition hover:border-white/20 hover:text-white"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
