'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import {
  Activity,
  BarChart3,
  Database,
  FileCheck2,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  Terminal,
} from 'lucide-react';

interface AdminModule {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  badge: string;
  status: 'listo' | 'validar' | 'continuo';
}

const ADMIN_MODULES: AdminModule[] = [
  {
    id: 'modulo-1-env',
    title: 'Módulo 1 · Entorno seguro',
    description: 'Variables críticas, credenciales InsForge, dominio y estado de conexión antes de producción.',
    href: '/admin/activar',
    icon: <KeyRound className="w-6 h-6" />,
    color: 'from-yellow-400 to-amber-600',
    badge: 'SEGURIDAD',
    status: 'validar',
  },
  {
    id: 'modulo-2-sesion',
    title: 'Módulo 2 · Sesión admin',
    description: 'Login, cookies httpOnly, secreto de sesión, roles y protección de acceso al panel.',
    href: '/admin/equipo',
    icon: <LockKeyhole className="w-6 h-6" />,
    color: 'from-rose-400 to-red-600',
    badge: 'ACCESO',
    status: 'continuo',
  },
  {
    id: 'modulo-3-rate-limit',
    title: 'Módulo 3 · Rate limit',
    description: 'Control de intentos, bloqueo temporal, errores admin y protección contra fuerza bruta.',
    href: '/admin/errores',
    icon: <Activity className="w-6 h-6" />,
    color: 'from-orange-400 to-red-500',
    badge: 'DEFENSA',
    status: 'continuo',
  },
  {
    id: 'modulo-4-validacion',
    title: 'Módulo 4 · Validación API',
    description: 'Validadores de payload, pruebas de endpoints y protección de datos antes de guardar.',
    href: '/admin/testing',
    icon: <FileCheck2 className="w-6 h-6" />,
    color: 'from-sky-400 to-blue-600',
    badge: 'API',
    status: 'continuo',
  },
  {
    id: 'modulo-5-passkeys',
    title: 'Módulo 5 · Huella / Face ID',
    description: 'Registro de dispositivos, passkeys WebAuthn y login biométrico real desde /admin/login.',
    href: '/admin/seguridad',
    icon: <Smartphone className="w-6 h-6" />,
    color: 'from-emerald-400 to-green-600',
    badge: 'MÓDULO 7',
    status: 'listo',
  },
  {
    id: 'modulo-6-base-datos',
    title: 'Módulo 6 · Base de datos',
    description: 'Tablas InsForge, migración admin_passkeys y terminal SQL para reparar estructura.',
    href: '/admin/sql',
    icon: <Database className="w-6 h-6" />,
    color: 'from-purple-400 to-indigo-600',
    badge: 'INSFORGE',
    status: 'validar',
  },
  {
    id: 'modulo-7-deploy',
    title: 'Módulo 7 · Deploy estable',
    description: 'Logs de Vercel, build, TypeScript, PR y cierre controlado antes de pasar a main.',
    href: '/admin/vercel-logs',
    icon: <Terminal className="w-6 h-6" />,
    color: 'from-zinc-300 to-zinc-600',
    badge: 'VERCEL',
    status: 'validar',
  },
  {
    id: 'control-general',
    title: 'Centro de control',
    description: 'Dashboard general con KPIs, ventas, pedidos, inventario y salud operativa.',
    href: '/admin',
    icon: <BarChart3 className="w-6 h-6" />,
    color: 'from-blue-400 to-cyan-600',
    badge: 'DASHBOARD',
    status: 'continuo',
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.08 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const statusClass = {
  listo: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
  validar: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-200',
  continuo: 'border-sky-400/40 bg-sky-400/10 text-sky-200',
} as const;

export function AdminModules() {
  return (
    <motion.div
      className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {ADMIN_MODULES.map((module) => (
        <motion.div key={module.id} variants={itemVariants}>
          <Link href={module.href} className="block h-full">
            <motion.div
              className={`relative h-full min-h-[230px] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${module.color} p-5 shadow-lg transition hover:border-white/25 hover:shadow-[0_24px_70px_rgba(0,0,0,0.35)]`}
              whileHover={{ scale: 1.025, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              <div className="relative z-10 flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/20">
                    {module.icon}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="rounded-full border border-white/25 bg-black/25 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                      {module.badge}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] ${statusClass[module.status]}`}>
                      {module.status}
                    </span>
                  </div>
                </div>
                <div className="mt-6 flex-1">
                  <h3 className="text-lg font-black leading-tight text-white sm:text-xl">{module.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/78">{module.description}</p>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-white/15 pt-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/70">Abrir módulo</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white">→</span>
                </div>
              </div>
            </motion.div>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}

export default AdminModules;
