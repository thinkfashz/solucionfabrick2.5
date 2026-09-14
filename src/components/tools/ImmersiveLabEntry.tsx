import Link from 'next/link';
import { Maximize2 } from 'lucide-react';

export default function ImmersiveLabEntry({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="fixed bottom-[calc(5.4rem+env(safe-area-inset-bottom))] left-3 z-[58] inline-flex min-h-11 items-center gap-2 rounded-full border border-[#F6C64A]/35 bg-[#090B0D]/92 px-4 text-[9px] font-black uppercase tracking-[.11em] text-[#F6C64A] shadow-[0_12px_42px_rgba(0,0,0,.38)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-[#F6C64A] hover:text-black md:bottom-5 md:left-5"
    >
      <Maximize2 className="h-4 w-4" />
      {label}
    </Link>
  );
}
