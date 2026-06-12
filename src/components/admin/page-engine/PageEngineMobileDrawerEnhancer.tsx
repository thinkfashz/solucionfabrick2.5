'use client';

import { useEffect } from 'react';

export default function PageEngineMobileDrawerEnhancer() {
  useEffect(() => {
    const close = () => document.documentElement.classList.remove('sf-page-engine-drawer-open');
    const toggle = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const menuButton = target?.closest('header button, [data-page-engine-menu]');
      const overlay = target?.closest('[data-page-engine-overlay]');
      if (overlay) close();
      if (menuButton && window.innerWidth < 1280) {
        event.preventDefault();
        document.documentElement.classList.toggle('sf-page-engine-drawer-open');
      }
    };
    document.addEventListener('click', toggle);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('click', toggle);
      window.removeEventListener('resize', close);
    };
  }, []);

  return <>
    <div data-page-engine-overlay="" className="sf-page-engine-overlay" />
    <style jsx global>{`
      @media (max-width: 1279px) {
        .sf-page-engine-overlay {
          position: fixed;
          inset: 0;
          z-index: 70;
          display: none;
          background: rgba(0, 0, 0, .62);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        html.sf-page-engine-drawer-open .sf-page-engine-overlay { display: block; }
        html.sf-page-engine-drawer-open body { overflow: hidden; }
        html.sf-page-engine-drawer-open main aside.hidden {
          display: block !important;
          position: fixed !important;
          z-index: 80 !important;
          top: 10px !important;
          bottom: 10px !important;
          left: 10px !important;
          width: min(88vw, 330px) !important;
          max-height: calc(100dvh - 20px) !important;
          overflow: auto !important;
          border-radius: 28px !important;
          background: linear-gradient(180deg, rgba(10, 8, 5, .92), rgba(0, 0, 0, .96)) !important;
          box-shadow: 0 30px 90px rgba(0,0,0,.75), inset 0 1px 0 rgba(245,158,11,.18) !important;
        }
      }
      @media (max-width: 767px) {
        main { max-width: 100vw; }
        main * { min-width: 0; }
        textarea { font-size: 12px !important; }
        .sf-page-engine-overlay + main,
        body > main { overflow-x: hidden !important; }
        iframe { max-width: 100%; }
      }
      [data-page-engine-status], .sf-live-expiry-pill {
        border: 1px solid rgba(245,158,11,.24);
        background: rgba(245,158,11,.10);
        color: #fde68a;
      }
    `}</style>
  </>;
}
