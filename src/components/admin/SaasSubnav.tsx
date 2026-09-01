'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Eye, Rocket } from 'lucide-react';

const items = [
  { href: '/admin/saas', label: 'Plataforma SaaS', icon: Rocket, exact: true },
  { href: '/admin/saas/preview', label: 'Vista previa sin DNS', icon: Eye },
];

export default function SaasSubnav() {
  const pathname = usePathname() || '/admin/saas';
  return (
    <div className="mb-5 border-b border-black/10 pb-4">
      <div className="flex snap-x gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex min-h-9 shrink-0 snap-start items-center gap-2 rounded-full px-3.5 text-[10px] font-black uppercase tracking-[.12em] transition ${
                active
                  ? 'bg-[#171612] text-white shadow-sm'
                  : 'border border-black/10 bg-white/55 text-[#716b60] hover:bg-white hover:text-[#171612]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
