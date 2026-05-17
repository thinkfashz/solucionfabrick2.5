'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, CircleDashed, Sparkles } from 'lucide-react';

export function AdminBasePage({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`min-h-full bg-[#07070a] text-zinc-100 ${className}`}>
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.10),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_34%)]" />
      {children}
    </div>
  );
}

export function AdminBaseHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-zinc-950/80 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="text-[11px] font-black uppercase tracking-[0.28em] text-yellow-300">{eyebrow}</p> : null}
        <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function AdminBaseGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-4 ${className}`}>{children}</div>;
}

export function AdminBaseCard({ children, className = '', interactive = false }: { children: ReactNode; className?: string; interactive?: boolean }) {
  const body = (
    <div className={`relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-950/78 p-5 shadow-[0_16px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl ${interactive ? 'transition hover:-translate-y-0.5 hover:border-yellow-300/35 hover:bg-zinc-950' : ''} ${className}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      {children}
    </div>
  );
  return interactive ? <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.16 }}>{body}</motion.div> : body;
}

export function AdminBaseMetric({ label, value, hint, icon }: { label: string; value: string | number; hint?: string; icon?: ReactNode }) {
  return (
    <AdminBaseCard interactive>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">{label}</p>
          <p className="mt-3 text-3xl font-black text-white">{value}</p>
          {hint ? <p className="mt-2 text-xs text-zinc-500">{hint}</p> : null}
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-yellow-300">{icon ?? <Sparkles className="h-5 w-5" />}</span>
      </div>
    </AdminBaseCard>
  );
}

export function AdminBaseBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }) {
  const toneClass = {
    neutral: 'border-white/10 bg-white/[0.04] text-zinc-300',
    success: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200',
    warning: 'border-yellow-300/25 bg-yellow-300/10 text-yellow-200',
    danger: 'border-red-300/25 bg-red-300/10 text-red-200',
    info: 'border-sky-300/25 bg-sky-300/10 text-sky-200',
  }[tone];
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${toneClass}`}>{children}</span>;
}

export function AdminBaseButton({ children, href, onClick, variant = 'primary' }: { children: ReactNode; href?: string; onClick?: () => void; variant?: 'primary' | 'ghost' }) {
  const classes = variant === 'primary'
    ? 'bg-yellow-300 text-black hover:bg-yellow-200'
    : 'border border-white/10 bg-white/[0.04] text-zinc-200 hover:border-yellow-300/40 hover:text-yellow-200';
  const content = <span className="inline-flex items-center gap-2">{children}<ArrowUpRight className="h-4 w-4" /></span>;
  if (href) return <a href={href} className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.18em] transition ${classes}`}>{content}</a>;
  return <button type="button" onClick={onClick} className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.18em] transition ${classes}`}>{content}</button>;
}

export function AdminBaseEmpty({ title = 'Sin datos reales todavía', description = 'Cuando el endpoint responda información real, esta sección se actualizará automáticamente.' }: { title?: string; description?: string }) {
  return (
    <AdminBaseCard className="text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-400">
        <CircleDashed className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-black text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">{description}</p>
    </AdminBaseCard>
  );
}
