'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { HomeVisualSectionStyle } from '@/lib/homeVisualCms';

export default function CmsSectionMotion({ style, children }: { style?: HomeVisualSectionStyle; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(style?.animation === 'none' || !style?.animation);
  const animation = style?.animation || 'none';
  const duration = Math.max(0.1, Math.min(3, Number(style?.duration || 0.6)));

  useEffect(() => {
    if (animation === 'none') {
      setVisible(true);
      return;
    }
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.08, rootMargin: '80px 0px -20px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [animation]);

  const hiddenTransform = animation === 'fade-up'
    ? 'translate3d(0,28px,0)'
    : animation === 'scale'
      ? 'scale(.975)'
      : animation === 'slide-left'
        ? 'translate3d(-34px,0,0)'
        : animation === 'slide-right'
          ? 'translate3d(34px,0,0)'
          : 'none';

  return (
    <div
      ref={ref}
      data-cms-motion={animation}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : hiddenTransform,
        transition: `opacity ${duration}s cubic-bezier(.2,.7,.2,1), transform ${duration}s cubic-bezier(.2,.7,.2,1)`,
      }}
    >
      {children}
    </div>
  );
}
