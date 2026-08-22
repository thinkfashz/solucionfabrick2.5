import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function AdminPage({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`fabrick-page space-y-6 ${className}`}>{children}</div>;
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-black/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#9b6a12]">{eyebrow}</p> : null}
        <h2 className="mt-1 text-3xl font-black tracking-[-.055em] text-[#171612] sm:text-4xl">{title}</h2>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[#716b60]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function AdminStats({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-4 ${className}`}>{children}</section>;
}

export function AdminStat({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  note?: string;
  icon?: LucideIcon;
}) {
  return (
    <article className="border-t border-black/10 py-4 sm:py-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#8f887c]">{label}</p>
        {Icon ? <Icon className="h-4 w-4 text-[#c77a00]" /> : null}
      </div>
      <strong className="mt-2 block text-3xl font-black tracking-[-.05em] text-[#171612]">{value}</strong>
      {note ? <p className="mt-1 text-xs leading-5 text-[#8f887c]">{note}</p> : null}
    </article>
  );
}

export function AdminSurface({
  children,
  title,
  description,
  actions,
  className = '',
}: {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[18px] border border-black/10 bg-white/60 p-4 sm:p-5 ${className}`}>
      {title || description || actions ? (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {title ? <h3 className="text-lg font-black tracking-[-.025em] text-[#171612]">{title}</h3> : null}
            {description ? <p className="mt-1 text-xs leading-5 text-[#817a6f]">{description}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function AdminEmptyState({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="grid min-h-56 place-items-center py-10 text-center">
      <div className="max-w-md">
        {Icon ? <Icon className="mx-auto h-6 w-6 text-[#c77a00]" /> : null}
        <h3 className="mt-3 text-lg font-black text-[#171612]">{title}</h3>
        {description ? <p className="mt-2 text-sm leading-6 text-[#817a6f]">{description}</p> : null}
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}
