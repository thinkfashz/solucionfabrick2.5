'use client';

import Link from 'next/link';
import { useSiteContent } from '@/hooks/useSiteContent';

export default function NotFound() {
  const content = useSiteContent('error-404');
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-xl text-center space-y-6">
        <p className="text-yellow-400 text-xs tracking-[0.35em] uppercase">404</p>
        {content.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={content.imageUrl}
            alt=""
            className="mx-auto max-h-48 w-auto rounded-2xl border border-white/10"
          />
        ) : null}
        <h1 className="text-4xl md:text-6xl font-black tracking-tight">{content.title}</h1>
        <p className="text-white/65 text-sm md:text-base">{content.subtitle}</p>
        <Link
          href={content.ctaHref || '/'}
          className="inline-flex items-center justify-center rounded-full border border-yellow-400/50 bg-yellow-400 px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-black transition-colors hover:bg-yellow-300"
        >
          {content.ctaLabel}
        </Link>
      </div>
    </main>
  );
}