'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { Images, Megaphone, Sparkles } from 'lucide-react';

export default function AdminInspirationSidebarShortcut() {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    function findTarget() {
      const sidebar = document.querySelector<HTMLElement>('[data-admin-sidebar]');
      const root = sidebar?.firstElementChild;
      const panel = root?.lastElementChild;
      if (!cancelled && panel instanceof HTMLElement) setTarget(panel);
    }

    findTarget();
    const observer = new MutationObserver(findTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  if (!target) return null;

  return createPortal(
    <div className="shrink-0 border-t border-white/10 bg-black/25 p-3 backdrop-blur-2xl">
      <p className="mb-2 px-1 text-[8px] font-black uppercase tracking-[.18em] text-white/35">Accesos rápidos</p>
      <div className="grid gap-2">
        <QuickLink
          href="/admin/proyectos"
          title="Estudio de Inspiraciones"
          subtitle="Álbumes · Cloudinary · IA"
          icon={Images}
        />
        <QuickLink
          href="/admin/publicidad/creador"
          title="Creador de Anuncios IA"
          subtitle="Copy · Preview · Meta Ads"
          icon={Megaphone}
        />
      </div>
    </div>,
    target,
  );
}

function QuickLink({ href, title, subtitle, icon: Icon }: { href: string; title: string; subtitle: string; icon: typeof Images }) {
  return (
    <Link
      href={href}
      className="group flex min-h-16 items-center gap-3 rounded-[1.35rem] bg-[linear-gradient(135deg,rgba(182,144,108,.2),rgba(255,255,255,.055))] px-3.5 py-3 text-left shadow-[0_16px_45px_rgba(0,0,0,.22)] transition hover:-translate-y-0.5 hover:bg-[#B6906C]/20"
    >
      <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#B6906C] text-[#171820] shadow-[0_10px_28px_rgba(182,144,108,.28)]">
        <Icon className="h-5 w-5" />
        <Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-[#171820] p-0.5 text-[#E5CFBA]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-black text-[#F8F0E9]">{title}</span>
        <span className="mt-1 block truncate text-[9px] font-bold uppercase tracking-[.12em] text-[#CCB196]">{subtitle}</span>
      </span>
      <span className="rounded-full bg-[#F8F0E9]/8 px-2 py-1 text-[8px] font-black uppercase tracking-[.12em] text-[#E5CFBA] transition group-hover:bg-[#B6906C] group-hover:text-[#171820]">Abrir</span>
    </Link>
  );
}
