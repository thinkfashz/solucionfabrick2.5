'use client';

import { useEffect } from 'react';
import FabrickPoemAnimation from '@/components/brand/FabrickPoemAnimation';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="min-h-screen bg-black text-white">
    <FabrickPoemAnimation compact backgroundImageUrl="/og-image.jpg" accentImageUrl="/icon-512.png">
      <button onClick={reset} className="rounded-full bg-white px-5 py-3 text-sm font-black text-black shadow-2xl transition hover:scale-105">Reintentar módulo</button>
      <a href="/admin" className="rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur-xl transition hover:bg-white/20">Volver al admin</a>
    </FabrickPoemAnimation>
  </main>;
}
