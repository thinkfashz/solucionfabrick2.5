'use client';

import type { ReactNode } from 'react';

export default function AdminResponsiveGlamFrame({ children, variant = 'fabrick' }: { children: ReactNode; variant?: 'fabrick' | 'sessions' | 'colombia' }) {
  return <div className={`sf-admin-glam-frame sf-admin-glam-${variant}`}>
    {children}
    <style jsx global>{`
      .sf-admin-glam-frame { min-height:100dvh; overflow-x:hidden; background:#050403; color:white; }
      .sf-admin-glam-frame::before{content:'';position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(circle at 8% 0%,rgba(250,204,21,.20),transparent 28rem),radial-gradient(circle at 92% 14%,rgba(249,115,22,.18),transparent 30rem),linear-gradient(180deg,#090805,#040302);}
      .sf-admin-glam-sessions::before{background:radial-gradient(circle at 8% 0%,rgba(59,130,246,.18),transparent 28rem),radial-gradient(circle at 92% 14%,rgba(250,204,21,.16),transparent 30rem),linear-gradient(180deg,#07090d,#030303);}
      .sf-admin-glam-frame > * { position:relative; z-index:1; }
      .sf-admin-glam-frame main, .sf-admin-glam-frame section, .sf-admin-glam-frame div { min-width:0; }
      .sf-admin-glam-frame main { max-width:100vw; overflow-x:hidden; }
      .sf-admin-glam-frame [class*='max-w-7xl'], .sf-admin-glam-frame [class*='max-w-6xl'], .sf-admin-glam-frame [class*='max-w-5xl']{max-width:min(1580px,calc(100vw - 24px))!important;margin-inline:auto!important;}
      .sf-admin-glam-frame .rounded-3xl, .sf-admin-glam-frame [class*='rounded-[2rem]'], .sf-admin-glam-frame [class*='rounded-[2.8rem]']{box-shadow:0 24px 90px rgba(0,0,0,.35);backdrop-filter:blur(18px);}
      .sf-admin-glam-frame input, .sf-admin-glam-frame textarea, .sf-admin-glam-frame select{max-width:100%;}
      .sf-admin-glam-frame table{max-width:100%;}
      .sf-admin-glam-frame [class*='grid']{min-width:0;}
      .sf-admin-glam-frame a, .sf-admin-glam-frame p, .sf-admin-glam-frame span, .sf-admin-glam-frame div{word-break:normal;overflow-wrap:anywhere;}
      @media(max-width:760px){.sf-admin-glam-frame [class*='p-8']{padding:1rem!important}.sf-admin-glam-frame [class*='p-6']{padding:1rem!important}.sf-admin-glam-frame [class*='text-7xl']{font-size:2.7rem!important;line-height:.95!important}.sf-admin-glam-frame [class*='text-6xl']{font-size:2.35rem!important;line-height:.98!important}.sf-admin-glam-frame [class*='text-5xl']{font-size:2rem!important}.sf-admin-glam-frame button{max-width:100%;}.sf-admin-glam-frame .overflow-x-auto{max-width:calc(100vw - 28px)!important;}}
    `}</style>
  </div>;
}
