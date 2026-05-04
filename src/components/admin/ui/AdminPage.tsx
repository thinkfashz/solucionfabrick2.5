'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/* ─────────────────────────────────────────────────────────────────────────
 * AdminPage — wrapper visual coherente para todos los módulos del admin.
 * Aplica entrada cinematográfica + ritmo de staggering en hijos.
 * ──────────────────────────────────────────────────────────────────────── */

const containerVars = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const itemVars = {
  hidden: { opacity: 0, y: 10, filter: 'blur(4px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

export function AdminPage({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={containerVars}
      initial="hidden"
      animate="show"
      className={`space-y-5 pb-24 lg:pb-8 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function AdminMotion({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={itemVars} className={className}>
      {children}
    </motion.div>
  );
}

interface AdminPageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  meta?: ReactNode;
}

export function AdminPageHeader({ eyebrow, title, description, icon: Icon, actions, meta }: AdminPageHeaderProps) {
  return (
    <motion.section
      variants={itemVars}
      className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/55 p-5 backdrop-blur-2xl md:p-7"
    >
      {/* Glow ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(56,189,248,0.10),transparent_55%),radial-gradient(circle_at_92%_15%,rgba(250,204,21,0.10),transparent_50%)]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-yellow-300/30 to-transparent" />
      </div>

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-1 items-start gap-4">
          {Icon ? (
            <span className="relative hidden h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-yellow-300/30 bg-gradient-to-br from-yellow-400/20 via-yellow-300/10 to-transparent shadow-[0_8px_30px_rgba(250,204,21,0.18)] sm:flex">
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.4),transparent_60%)]" />
              <Icon className="relative h-6 w-6 text-yellow-300" strokeWidth={1.5} />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            {eyebrow ? (
              <p className="text-[9px] font-bold uppercase tracking-[0.42em] text-yellow-300/85">{eyebrow}</p>
            ) : null}
            <h1 className="mt-1 font-playfair text-2xl font-black leading-tight text-white md:text-3xl xl:text-4xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">{description}</p>
            ) : null}
            {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
          </div>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div>
        ) : null}
      </div>
    </motion.section>
  );
}

interface AdminCardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  as?: 'div' | 'section' | 'article';
}

export function AdminCard({ children, className = '', glow = false, as = 'section' }: AdminCardProps) {
  const Component = motion[as];
  return (
    <Component
      variants={itemVars}
      className={`relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/45 p-5 backdrop-blur-xl transition-colors duration-300 hover:border-yellow-300/30 ${glow ? 'shadow-[0_18px_60px_rgba(0,0,0,0.55)]' : ''} ${className}`}
    >
      {glow ? (
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(250,204,21,0.06),transparent_60%)]" />
      ) : null}
      <div className="relative">{children}</div>
    </Component>
  );
}

interface AdminStatProps {
  label: string;
  value: ReactNode;
  delta?: { value: number; suffix?: string } | null;
  icon?: LucideIcon;
  accent?: 'yellow' | 'cyan' | 'emerald' | 'rose';
  hint?: string;
}

const accentMap: Record<NonNullable<AdminStatProps['accent']>, { glow: string; text: string; ring: string }> = {
  yellow: { glow: 'rgba(250,204,21,0.15)', text: 'text-yellow-300', ring: 'border-yellow-300/30' },
  cyan: { glow: 'rgba(56,189,248,0.15)', text: 'text-cyan-300', ring: 'border-cyan-300/30' },
  emerald: { glow: 'rgba(52,211,153,0.15)', text: 'text-emerald-300', ring: 'border-emerald-300/30' },
  rose: { glow: 'rgba(244,114,182,0.15)', text: 'text-rose-300', ring: 'border-rose-300/30' },
};

export function AdminStat({ label, value, delta, icon: Icon, accent = 'yellow', hint }: AdminStatProps) {
  const a = accentMap[accent];
  const positive = delta ? delta.value >= 0 : true;
  return (
    <motion.div
      variants={itemVars}
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:${a.ring}`}
    >
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(circle at 80% 0%, ${a.glow}, transparent 60%)` }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-zinc-500">{label}</p>
          <p className="mt-2 font-playfair text-2xl font-black text-white md:text-3xl">{value}</p>
          {delta ? (
            <p className={`mt-1 text-[10px] font-mono ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {positive ? '▲' : '▼'} {Math.abs(delta.value)}{delta.suffix ?? '%'}
            </p>
          ) : null}
          {hint ? <p className="mt-1 text-[10px] text-zinc-500">{hint}</p> : null}
        </div>
        {Icon ? (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${a.ring} bg-black/40`}>
            <Icon className={`h-4 w-4 ${a.text}`} strokeWidth={1.6} />
          </span>
        ) : null}
      </div>
    </motion.div>
  );
}
