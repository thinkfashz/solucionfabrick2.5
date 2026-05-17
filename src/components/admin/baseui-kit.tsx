'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';

export function AdminBasePage({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-h-full bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.10),transparent_32%),linear-gradient(180deg,rgba(9,9,11,0.98),rgba(0,0,0,1))] px-3 py-4 text-zinc-100 sm:px-5 lg:px-8">
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/80 p-5 shadow-[0_28px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:p-6">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_38%,rgba(250,204,21,0.08))]" />
          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              {eyebrow ? <p className="text-[11px] font-black uppercase tracking-[0.28em] text-yellow-300">{eyebrow}</p> : null}
              <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-4xl">{title}</h1>
              {description ? <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base">{description}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

export function AdminBaseGrid({ children, cols = 'auto' }: { children: ReactNode; cols?: 'auto' | '2' | '3' | '4' }) {
  const grid = cols === '2'
    ? 'grid-cols-1 lg:grid-cols-2'
    : cols === '3'
      ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
      : cols === '4'
        ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
        : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4';
  return <div className={`grid gap-4 ${grid}`}>{children}</div>;
}

export function AdminBaseCard({
  title,
  description,
  icon: Icon,
  href,
  badge,
  children,
  tone = 'gold',
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  href?: string;
  badge?: string;
  children?: ReactNode;
  tone?: 'gold' | 'blue' | 'emerald' | 'rose' | 'purple' | 'zinc';
}) {
  const toneMap = {
    gold: 'from-yellow-300/18 via-amber-400/8 to-transparent border-yellow-300/20 hover:border-yellow-300/45',
    blue: 'from-sky-300/18 via-blue-400/8 to-transparent border-sky-300/20 hover:border-sky-300/45',
    emerald: 'from-emerald-300/18 via-green-400/8 to-transparent border-emerald-300/20 hover:border-emerald-300/45',
    rose: 'from-rose-300/18 via-red-400/8 to-transparent border-rose-300/20 hover:border-rose-300/45',
    purple: 'from-purple-300/18 via-fuchsia-400/8 to-transparent border-purple-300/20 hover:border-purple-300/45',
    zinc: 'from-white/10 via-zinc-400/5 to-transparent border-white/10 hover:border-white/25',
  } as const;

  const content = (
    <div className={`group relative min-h-[180px] overflow-hidden rounded-[1.75rem] border bg-zinc-950/75 p-5 shadow-[0_18px_80px_rgba(0,0,0,0.42)] transition duration-300 hover:-translate-y-1 ${toneMap[tone]}`}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${toneMap[tone].split(' border-')[0]}`} />
      <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-white/10 blur-3xl transition group-hover:bg-yellow-300/15" />
      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          {Icon ? <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-yellow-200"><Icon className="h-5 w-5" /></span> : <span />}
          <div className="flex items-center gap-2">
            {badge ? <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">{badge}</span> : null}
            {href ? <ArrowUpRight className="h-4 w-4 text-zinc-500 transition group-hover:text-yellow-300" /> : null}
          </div>
        </div>
        <div className="mt-5 flex-1">
          <h3 className="text-lg font-black leading-tight text-white">{title}</h3>
          {description ? <p className="mt-2 text-sm leading-relaxed text-zinc-400">{description}</p> : null}
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export function AdminBaseMetric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export function AdminBaseButton({ href, children, variant = 'primary' }: { href?: string; children: ReactNode; variant?: 'primary' | 'ghost' }) {
  const cls = variant === 'primary'
    ? 'border-yellow-300/40 bg-yellow-300 text-black hover:bg-yellow-200'
    : 'border-white/10 bg-white/5 text-zinc-200 hover:border-yellow-300/40 hover:text-yellow-200';
  const content = <span className={`inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition ${cls}`}>{children}</span>;
  return href ? <Link href={href}>{content}</Link> : content;
}
