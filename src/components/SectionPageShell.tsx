import Link from 'next/link';
import Navbar from '@/components/Navbar';
import FabrickLogo from '@/components/FabrickLogo';

interface ActionLink {
  href: string;
  label: string;
}

interface SectionPageShellProps {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction?: ActionLink;
  secondaryAction?: ActionLink;
  children: React.ReactNode;
}

export default function SectionPageShell({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  children,
}: SectionPageShellProps) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-black via-zinc-950 to-black text-white">
      <Navbar />
      <main className="px-4 pb-20 pt-28 md:px-12 md:pt-36">
        <section className="mx-auto max-w-7xl rounded-[2rem] border border-white/5 bg-white/[0.02] px-6 py-10 md:px-12 md:py-14">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">{eyebrow}</p>
              <h1 className="mt-4 text-4xl font-black uppercase tracking-tight md:text-6xl">{title}</h1>
              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-lg">{description}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {primaryAction ? (
                <Link
                  href={primaryAction.href}
                  className="rounded-full bg-yellow-400 px-6 py-4 text-center text-[11px] font-black uppercase tracking-[0.22em] text-black transition hover:bg-white"
                >
                  {primaryAction.label}
                </Link>
              ) : null}
              {secondaryAction ? (
                <Link
                  href={secondaryAction.href}
                  className="rounded-full border border-yellow-400/35 px-6 py-4 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-yellow-400 transition hover:bg-yellow-400/10"
                >
                  {secondaryAction.label}
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-8 max-w-7xl">{children}</section>
      </main>
      <footer className="border-t border-white/5 px-4 py-10 md:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
          <FabrickLogo className="pointer-events-none" />
          <p className="text-center text-[10px] uppercase tracking-[0.25em] text-zinc-500">
            Soluciones Fabrick · Cada experiencia tiene su propio espacio.
          </p>
        </div>
      </footer>
    </div>
  );
}
