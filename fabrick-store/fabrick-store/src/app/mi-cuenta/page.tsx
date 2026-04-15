import type { Metadata } from 'next';
import Link from 'next/link';
import { User, FolderOpen, Settings, Bell, Shield, Star } from 'lucide-react';
import SectionPageShell from '@/components/SectionPageShell';

const RECENT_PROJECTS = [
  {
    name: 'Remodelación cocina',
    status: 'Completado',
    date: 'Marzo 2024',
    statusColor: 'text-green-400',
  },
  {
    name: 'Instalación sistema de seguridad',
    status: 'En progreso',
    date: 'Junio 2024',
    statusColor: 'text-yellow-400',
  },
  {
    name: 'Presupuesto ampliación',
    status: 'Pendiente',
    date: 'Julio 2024',
    statusColor: 'text-zinc-400',
  },
];

const SETTINGS_SHORTCUTS = [
  { icon: Bell, label: 'Notificaciones', description: 'Configura alertas de avance de proyectos' },
  { icon: Shield, label: 'Seguridad', description: 'Cambiar contraseña y autenticación' },
  { icon: Star, label: 'Favoritos', description: 'Productos y servicios guardados' },
  { icon: Settings, label: 'Preferencias', description: 'Idioma, moneda y ajustes de cuenta' },
];

export const metadata: Metadata = {
  title: 'Mi Cuenta | Fabrick',
  description: 'Acceso y gestión de cuenta para clientes de Soluciones Fabrick.',
};

export default function MiCuentaPage() {
  return (
    <SectionPageShell
      eyebrow="Mi cuenta"
      title="Accede a tu espacio Fabrick"
      description="Ingresa para revisar seguimiento, guardar favoritos y continuar tu proceso con nuestro equipo."
      primaryAction={{ href: '/auth', label: 'Iniciar sesión' }}
      secondaryAction={{ href: '/contacto', label: 'Hablar con un asesor' }}
    >
      {/* Auth check placeholder */}
      <div className="mb-8 rounded-[2rem] border border-yellow-400/20 bg-yellow-400/5 p-6 text-center">
        <p className="text-sm font-bold text-yellow-400">
          Esta sección requiere autenticación. Inicia sesión para acceder a tu perfil completo.
        </p>
        <Link
          href="/auth"
          className="mt-4 inline-flex rounded-full bg-yellow-400 px-6 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-black transition hover:bg-white"
        >
          Iniciar sesión
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <div className="rounded-[2rem] border border-white/5 bg-zinc-950/85 p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-yellow-400/30 bg-black">
              <User className="h-7 w-7 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Cliente Fabrick</p>
              <p className="mt-0.5 text-base font-bold text-white">—</p>
              <p className="text-xs text-zinc-600">Sin sesión activa</p>
            </div>
          </div>
          <div className="mt-6 space-y-3 border-t border-white/5 pt-6">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Proyectos totales</span>
              <span className="font-bold text-white">—</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Miembro desde</span>
              <span className="font-bold text-white">—</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Nivel de cuenta</span>
              <span className="font-bold text-yellow-400">—</span>
            </div>
          </div>
        </div>

        {/* Projects history */}
        <div className="rounded-[2rem] border border-white/5 bg-zinc-950/85 p-8 lg:col-span-2">
          <div className="mb-5 flex items-center gap-3">
            <FolderOpen className="h-5 w-5 text-yellow-400" />
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white">Historial de proyectos</h2>
          </div>
          <div className="space-y-3">
            {RECENT_PROJECTS.map(({ name, status, date, statusColor }) => (
              <div key={name} className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/40 px-5 py-4">
                <div>
                  <p className="text-sm font-bold text-white">{name}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-zinc-600">{date}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${statusColor}`}>{status}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-zinc-600">
            Inicia sesión para ver tu historial real de proyectos
          </p>
        </div>
      </div>

      {/* Settings shortcuts */}
      <div className="mt-6 rounded-[2rem] border border-white/5 bg-zinc-950/80 p-8">
        <h2 className="mb-6 text-sm font-bold uppercase tracking-[0.2em] text-white">Configuración rápida</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {SETTINGS_SHORTCUTS.map(({ icon: Icon, label, description }) => (
            <Link
              key={label}
              href="/auth"
              className="group flex items-start gap-4 rounded-2xl border border-white/5 bg-black/40 p-5 transition hover:border-yellow-400/30"
            >
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-yellow-400/20 bg-black transition group-hover:border-yellow-400/50">
                <Icon className="h-4 w-4 text-yellow-400" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-white">{label}</p>
                <p className="mt-1 text-[11px] leading-snug text-zinc-500">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </SectionPageShell>
  );
}
