'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = { children?: ReactNode };

export default function AdminColombiaGradientBackground({ children }: Props) {
  const blobRef = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState({ x: 0, y: 0 });
  const [current, setCurrent] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let raf = 0;
    const move = () => {
      setCurrent((prev) => {
        const next = { x: prev.x + (target.x - prev.x) / 18, y: prev.y + (target.y - prev.y) / 18 };
        if (blobRef.current) blobRef.current.style.transform = `translate3d(${Math.round(next.x)}px, ${Math.round(next.y)}px, 0)`;
        return next;
      });
      raf = requestAnimationFrame(move);
    };
    raf = requestAnimationFrame(move);
    return () => cancelAnimationFrame(raf);
  }, [target.x, target.y]);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    setTarget({ x: event.clientX - window.innerWidth / 2, y: event.clientY - window.innerHeight / 2 });
  }

  return <div className="sf-admin-colombia-bg" onPointerMove={handlePointerMove}>
    <svg className="absolute h-0 w-0" aria-hidden="true">
      <defs>
        <filter id="sf-admin-gooey-blur">
          <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo" />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
      </defs>
    </svg>
    <div className="sf-admin-colombia-gradients" aria-hidden="true">
      <span className="sf-admin-blob sf-admin-blob-1" />
      <span className="sf-admin-blob sf-admin-blob-2" />
      <span className="sf-admin-blob sf-admin-blob-3" />
      <span className="sf-admin-blob sf-admin-blob-4" />
      <span className="sf-admin-blob sf-admin-blob-5" />
      <span ref={blobRef} className="sf-admin-pointer-blob" />
    </div>
    <div className="sf-admin-colombia-content">{children}</div>
    <style jsx global>{`
      html, body { min-height:100%; }
      .sf-admin-colombia-bg{position:relative;min-height:100dvh;width:100%;overflow-x:hidden;background:linear-gradient(40deg,#070300,#06112e 48%,#1a0203);isolation:isolate;}
      .sf-admin-colombia-bg::before{content:'';position:fixed;inset:0;z-index:-3;background:linear-gradient(115deg,rgba(250,204,21,.28),rgba(250,204,21,.06) 32%,rgba(37,99,235,.20) 52%,rgba(220,38,38,.20));background-size:240% 240%;animation:sf-colombia-sweep 14s ease-in-out infinite;}
      .sf-admin-colombia-bg::after{content:'';position:fixed;inset:0;z-index:-1;background:radial-gradient(circle at 20% 0%,rgba(255,255,255,.11),transparent 30rem),linear-gradient(180deg,rgba(0,0,0,.20),rgba(0,0,0,.72));pointer-events:none;}
      .sf-admin-colombia-gradients{position:fixed;inset:-20%;z-index:-2;filter:url(#sf-admin-gooey-blur) blur(36px);opacity:.72;pointer-events:none;}
      .sf-admin-blob,.sf-admin-pointer-blob{position:absolute;left:50%;top:50%;width:70vmax;height:70vmax;border-radius:9999px;mix-blend-mode:hard-light;opacity:.82;}
      .sf-admin-blob-1{background:radial-gradient(circle,#facc15 0%,rgba(250,204,21,0) 55%);transform-origin:center;animation:sf-admin-first 19s ease-in-out infinite;}
      .sf-admin-blob-2{background:radial-gradient(circle,rgba(37,99,235,.9) 0%,rgba(37,99,235,0) 55%);transform-origin:calc(50% - 360px);animation:sf-admin-second 21s ease-in-out infinite;}
      .sf-admin-blob-3{background:radial-gradient(circle,rgba(220,38,38,.88) 0%,rgba(220,38,38,0) 55%);transform-origin:calc(50% + 360px);animation:sf-admin-third 24s ease-in-out infinite;}
      .sf-admin-blob-4{background:radial-gradient(circle,rgba(255,181,0,.72) 0%,rgba(255,181,0,0) 50%);transform-origin:calc(50% - 160px);animation:sf-admin-fourth 18s ease-in-out infinite;}
      .sf-admin-blob-5{background:radial-gradient(circle,rgba(59,130,246,.64) 0%,rgba(59,130,246,0) 55%);transform-origin:calc(50% - 700px) calc(50% + 700px);animation:sf-admin-fifth 28s ease-in-out infinite;}
      .sf-admin-pointer-blob{width:42vmax;height:42vmax;background:radial-gradient(circle,rgba(255,255,255,.46) 0%,rgba(255,255,255,0) 55%);opacity:.34;left:20%;top:20%;}
      .sf-admin-colombia-content{position:relative;z-index:1;min-height:100dvh;}
      .sf-admin-colombia-content main,.sf-admin-colombia-content section,.sf-admin-colombia-content div{min-width:0;}
      @keyframes sf-colombia-sweep{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
      @keyframes sf-admin-first{0%,100%{transform:translate(-50%,-50%) rotate(0deg)}50%{transform:translate(-42%,-58%) rotate(180deg)}}
      @keyframes sf-admin-second{0%,100%{transform:translate(-50%,-50%) rotate(0deg)}50%{transform:translate(-65%,-35%) rotate(220deg)}}
      @keyframes sf-admin-third{0%,100%{transform:translate(-50%,-50%) rotate(0deg)}50%{transform:translate(-30%,-62%) rotate(-210deg)}}
      @keyframes sf-admin-fourth{0%,100%{transform:translate(-50%,-50%) rotate(0deg)}50%{transform:translate(-56%,-65%) rotate(200deg)}}
      @keyframes sf-admin-fifth{0%,100%{transform:translate(-50%,-50%) rotate(0deg)}50%{transform:translate(-38%,-38%) rotate(-260deg)}}
      @media(max-width:768px){.sf-admin-colombia-gradients{opacity:.58;filter:blur(38px)}.sf-admin-blob,.sf-admin-pointer-blob{width:80vmax;height:80vmax}}
    `}</style>
  </div>;
}
