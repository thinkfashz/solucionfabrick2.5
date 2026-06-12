'use client';

import { useEffect, useState } from 'react';
import FabrickPoemAnimation from '@/components/brand/FabrickPoemAnimation';

export default function AdminFabrickTransition() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setVisible(false), 1450);
    return () => window.clearTimeout(id);
  }, []);

  if (!visible) return null;
  return <div className="fixed inset-0 z-[9999] bg-black">
    <style jsx global>{`
      .admin-fabrick-transition-out{animation:adminFabrickFadeOut .45s ease forwards;animation-delay:1s;}
      @keyframes adminFabrickFadeOut{to{opacity:0;transform:scale(1.015);visibility:hidden}}
    `}</style>
    <div className="admin-fabrick-transition-out h-full w-full">
      <FabrickPoemAnimation compact backgroundImageUrl="/og-image.jpg" accentImageUrl="/icon-512.png" />
    </div>
  </div>;
}
