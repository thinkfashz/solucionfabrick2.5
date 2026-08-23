'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

const containerVars = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.045, delayChildren: 0.02 },
  },
};

const itemVars = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

export function AdminPage({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={containerVars}
      initial="hidden"
      animate="show"
      className={`fabrick-page w-full max-w-full space-y-6 pb-24 lg:pb-8 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function AdminMotion({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <motion.div variants={itemVars} className={className}>{children}</motion.div>;
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
    <motion.header
      variants={itemVars}
      className="flex w-full flex-col gap-5 border-b border-black/10 pb-5 lg:flex-row lg:items-end lg:justify-between"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
        {Icon ? (
          <span className="mt-0.5 hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#c77a00]/15 bg-[#ffb000]/10 text-[#a56600] sm:flex">
            <Icon className="h-5 w-5" strokeWidth={1.7} />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          {eyebrow ? <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#9b6a12]">{eyebrow}</p> : null}
          <h1 className="mt-1 text-3xl font-black tracking-[-.055em] text-[#171612] sm:text-4xl">{title}</h1>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[#716b60]">{description}</p> : null}
          {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div> : null}
    </motion.header>
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
      className={`w-full max-w-full rounded-[18px] border border-black/10 bg-white/60 p-4 sm:p-5 ${glow ? 'shadow-[0_12px_32px_rgba(51,38,18,.06)]' : ''} ${className}`}
    >
      {children}
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

const accentMap: Record<NonNullable<AdminStatProps['accent']>, { text: string; bg: string }> = {
  yellow: { text: 'text-[#a56600]', bg: 'bg-[#ffb000]/10' },
  cyan: { text: 'text-cyan-700', bg: 'bg-cyan-500/10' },
  emerald: { text: 'text-emerald-700', bg: 'bg-emerald-500/10' },
  rose: { text: 'text-rose-700', bg: 'bg-rose-500/10' },
};

export function AdminStat({ label, value, delta, icon: Icon, accent = 'yellow', hint }: AdminStatProps) {
  const a = accentMap[accent];
  const positive = delta ? delta.value >= 0 : true;
  return (
    <motion.article variants={itemVars} className="border-t border-black/10 py-4 sm:py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#8f887c]">{label}</p>
          <strong className="mt-2 block text-3xl font-black tracking-[-.05em] text-[#171612]">{value}</strong>
          {delta ? (
            <p className={`mt-1 text-[10px] font-semibold ${positive ? 'text-emerald-700' : 'text-rose-700'}`}>
              {positive ? '▲' : '▼'} {Math.abs(delta.value)}{delta.suffix ?? '%'}
            </p>
          ) : null}
          {hint ? <p className="mt-1 text-xs leading-5 text-[#8f887c]">{hint}</p> : null}
        </div>
        {Icon ? <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${a.bg}`}><Icon className={`h-4 w-4 ${a.text}`} strokeWidth={1.7} /></span> : null}
      </div>
    </motion.article>
  );
}
