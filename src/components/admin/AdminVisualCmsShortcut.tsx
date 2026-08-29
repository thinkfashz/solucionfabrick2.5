'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Paintbrush } from 'lucide-react';

export default function AdminVisualCmsShortcut() {
  const pathname = usePathname() || '';
  if (pathname === '/admin/login' || pathname.startsWith('/admin/editor')) return null;

  return (
    <Link
      href="/admin/editor"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+18px)] right-4 z-[80] inline-flex min-h-11 items-center gap-2 rounded-full border border-black/10 bg-[#171612] px-4 text-[11px] font-black text-[#ffb000] shadow-[0_16px_50px_rgba(0,0,0,.24)] transition hover:-translate-y-0.5 sm:right-6"
      aria-label="Abrir Fabrick Visual CMS"
    >
      <Paintbrush className="h-4 w-4" />
      <span>Visual CMS</span>
    </Link>
  );
}
