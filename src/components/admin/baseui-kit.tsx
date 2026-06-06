import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';

// ─── AdminBasePage ────────────────────────────────────────────────────────────

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
    <section className="min-h-full w-full max-w-[100vw] overflow-x-hidden bg-[#09090b] bg-[radial-gradient(ellipse_80%_40%_at_10%_0%,rgba(250,204,21,0.11),transparent),radial-gradient(ellipse_60%_50%_at_90%_100%,rgba(56,189,248,0.07),transparent)] px-3 py-4 text-zinc-100 sm:px-5 lg:px-8">
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        {/* Premium header card */}
        <div className="relative overflow-hidden w-full rounded-[2rem] border border-white/[0.12] bg-zinc-950/85 p-6 shadow-[0_28px_120px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:p-7">
          {/* Inner gradient shimmer */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.07),transparent_35%,rgba(250,204,21,0.07))]" />
          {/* Soft glow blob top-right */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-amber-400/[0.07] blur-[80px]" />
          {/* Soft glow blob bottom-left */}
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-sky-400/[0.06] blur-[72px]" />
          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              {eyebrow ? (
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-400">
                  {eyebrow}
                </p>
              ) : null}
              <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-4xl">
                {title}
              </h1>
              {description ? (
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base">
                  {description}
                </p>
              ) : null}
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

// ─── AdminBaseGrid ────────────────────────────────────────────────────────────

export function AdminBaseGrid({
  children,
  cols = 'auto',
}: {
  children: ReactNode;
  cols?: 'auto' | '2' | '3' | '4';
}) {
  const grid =
    cols === '2'
      ? 'grid-cols-1 lg:grid-cols-2'
      : cols === '3'
        ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
        : cols === '4'
          ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
          : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4';
  return <div className={`grid gap-5 w-full ${grid}`}>{children}</div>;
}

// ─── AdminBaseCard ────────────────────────────────────────────────────────────

type CardTone = 'gold' | 'blue' | 'emerald' | 'rose' | 'purple' | 'indigo' | 'orange' | 'zinc';

const CARD_TONE_MAP: Record<
  CardTone,
  { gradient: string; border: string; glow: string; icon: string; arrow: string }
> = {
  gold: {
    gradient: 'from-amber-400/25 via-yellow-300/12 to-transparent',
    border: 'border-yellow-300/22 hover:border-yellow-300/50',
    glow: 'group-hover:bg-amber-300/18',
    icon: 'text-amber-200',
    arrow: 'group-hover:text-amber-300',
  },
  blue: {
    gradient: 'from-sky-400/25 via-blue-300/12 to-transparent',
    border: 'border-sky-300/22 hover:border-sky-300/50',
    glow: 'group-hover:bg-sky-300/18',
    icon: 'text-sky-200',
    arrow: 'group-hover:text-sky-300',
  },
  emerald: {
    gradient: 'from-emerald-400/25 via-green-300/12 to-transparent',
    border: 'border-emerald-300/22 hover:border-emerald-300/50',
    glow: 'group-hover:bg-emerald-300/18',
    icon: 'text-emerald-200',
    arrow: 'group-hover:text-emerald-300',
  },
  rose: {
    gradient: 'from-rose-400/25 via-red-300/12 to-transparent',
    border: 'border-rose-300/22 hover:border-rose-300/50',
    glow: 'group-hover:bg-rose-300/18',
    icon: 'text-rose-200',
    arrow: 'group-hover:text-rose-300',
  },
  purple: {
    gradient: 'from-violet-400/25 via-fuchsia-300/12 to-transparent',
    border: 'border-violet-300/22 hover:border-violet-300/50',
    glow: 'group-hover:bg-violet-300/18',
    icon: 'text-violet-200',
    arrow: 'group-hover:text-violet-300',
  },
  indigo: {
    gradient: 'from-indigo-400/25 via-indigo-300/12 to-transparent',
    border: 'border-indigo-300/22 hover:border-indigo-300/50',
    glow: 'group-hover:bg-indigo-300/18',
    icon: 'text-indigo-200',
    arrow: 'group-hover:text-indigo-300',
  },
  orange: {
    gradient: 'from-orange-400/25 via-orange-300/12 to-transparent',
    border: 'border-orange-300/22 hover:border-orange-300/50',
    glow: 'group-hover:bg-orange-300/18',
    icon: 'text-orange-200',
    arrow: 'group-hover:text-orange-300',
  },
  zinc: {
    gradient: 'from-white/10 via-zinc-400/5 to-transparent',
    border: 'border-white/10 hover:border-white/28',
    glow: 'group-hover:bg-white/10',
    icon: 'text-zinc-300',
    arrow: 'group-hover:text-zinc-200',
  },
};

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
  tone?: CardTone;
}) {
  const t = CARD_TONE_MAP[tone];

  const content = (
    <div
      className={`group relative min-h-[160px] overflow-hidden rounded-[2rem] border bg-zinc-900/70 p-5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5)] ${t.border}`}
    >
      {/* Gradient overlay */}
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${t.gradient}`} />
      {/* Glow orb */}
      <div
        className={`pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full bg-white/[0.07] blur-3xl transition-colors duration-500 ${t.glow}`}
      />
      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          {Icon ? (
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/40 ${t.icon}`}
            >
              <Icon className="h-5 w-5" />
            </span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {badge ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                {badge}
              </span>
            ) : null}
            {href ? (
              <ArrowUpRight
                className={`h-4 w-4 text-zinc-500 transition duration-200 ${t.arrow}`}
              />
            ) : null}
          </div>
        </div>
        <div className="mt-5 flex-1">
          <h3 className="text-lg font-black leading-tight text-white">{title}</h3>
          {description ? (
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{description}</p>
          ) : null}
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

// ─── AdminBaseMetric ──────────────────────────────────────────────────────────

export function AdminBaseMetric({
  label,
  value,
  hint,
  trend,
}: {
  label: string;
  value: string | number;
  hint?: string;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <div className="mt-1 flex items-end gap-2">
        <p className="text-3xl font-black text-white leading-none">{value}</p>
        {trend ? (
          <span
            className={`mb-0.5 flex items-center gap-0.5 text-xs font-bold ${
              trend.positive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {trend.positive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {trend.positive ? '+' : ''}
            {trend.value}%
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

// ─── AdminBaseButton ──────────────────────────────────────────────────────────

export function AdminBaseButton({
  href,
  children,
  variant = 'primary',
}: {
  href?: string;
  children: ReactNode;
  variant?: 'primary' | 'ghost';
}) {
  const cls =
    variant === 'primary'
      ? 'border-yellow-300/40 bg-yellow-300 text-black hover:bg-yellow-200'
      : 'border-white/10 bg-white/5 text-zinc-200 hover:border-yellow-300/40 hover:text-yellow-200';
  const content = (
    <span
      className={`inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition ${cls}`}
    >
      {children}
    </span>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

// ─── AdminStatRow ─────────────────────────────────────────────────────────────

export type StatRowItem = {
  label: string;
  value: string | number;
  accent?: string; // Tailwind text-color class e.g. "text-amber-400"
};

export function AdminStatRow({ stats }: { stats: StatRowItem[] }) {
  return (
    <div className="flex flex-wrap items-stretch divide-x divide-white/[0.08] rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl overflow-hidden">
      {stats.map((s, i) => (
        <div
          key={i}
          className="flex flex-1 min-w-[90px] flex-col justify-center px-4 py-3"
        >
          <p
            className={`text-xl font-black leading-none ${s.accent ?? 'text-white'}`}
          >
            {s.value}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}
