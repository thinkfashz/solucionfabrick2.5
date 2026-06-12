'use client';

import { useEffect, useRef, type ReactNode } from 'react';

type Props = {
  compact?: boolean;
  children?: ReactNode;
  backgroundImageUrl?: string;
  accentImageUrl?: string;
  className?: string;
};

const poemHTML = `
  <strong>Soluciones Fabrick</strong><br/>
  tu obra en buenas manos<br/>
  diseño · cálculo · construcción<br/>
  propuesta digital · confianza real
`;

export default function FabrickPoemAnimation({ compact = false, children, backgroundImageUrl = '/og-image.jpg', accentImageUrl = '/icon-512.png', className = '' }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function adjustContentSize() {
      if (!contentRef.current) return;
      const viewportWidth = window.innerWidth;
      const baseWidth = 1000;
      const scaleFactor = viewportWidth < baseWidth ? Math.max(0.42, (viewportWidth / baseWidth) * 0.94) : 1;
      contentRef.current.style.transform = `scale(${scaleFactor})`;
    }
    adjustContentSize();
    window.addEventListener('resize', adjustContentSize);
    return () => window.removeEventListener('resize', adjustContentSize);
  }, []);

  return <section className={`fabrick-poem-hero ${compact ? 'fabrick-poem-compact' : ''} ${className}`}>
    <style jsx global>{`
      .fabrick-poem-hero{position:relative;display:grid;place-items:center;min-height:100dvh;width:100%;overflow:hidden;background:#050403;color:#fff7e8;isolation:isolate;}
      .fabrick-poem-compact{min-height:100dvh;}
      .fabrick-poem-hero::before{content:'';position:absolute;inset:0;z-index:-4;background:linear-gradient(115deg,#facc15 0%,#facc15 28%,#2563eb 48%,#dc2626 75%,#080503 100%);background-size:240% 240%;animation:fabrickColombiaSweep 16s ease-in-out infinite;opacity:.42;}
      .fabrick-poem-hero::after{content:'';position:absolute;inset:0;z-index:-1;background:radial-gradient(circle at 50% 30%,rgba(255,255,255,.16),transparent 28rem),linear-gradient(180deg,rgba(0,0,0,.06),rgba(0,0,0,.78));pointer-events:none;}
      .fabrick-poem-wrap{position:relative;display:grid;place-items:center;width:100%;min-height:inherit;padding:clamp(1rem,3vw,3rem);}
      .fabrick-poem-content{position:relative;width:1000px;height:562px;transform-origin:center center;transform-style:preserve-3d;}
      .fabrick-poem-full{position:absolute;inset:0;overflow:hidden;border-radius:46px;border:1px solid rgba(255,255,255,.18);background:rgba(5,5,5,.28);box-shadow:0 40px 140px rgba(0,0,0,.52),inset 0 1px 0 rgba(255,255,255,.12);backdrop-filter:blur(20px);transform-style:preserve-3d;}
      .fabrick-poem-hue{position:absolute;inset:-30%;z-index:0;background:radial-gradient(circle at 20% 20%,rgba(250,204,21,.55),transparent 32%),radial-gradient(circle at 72% 24%,rgba(37,99,235,.48),transparent 34%),radial-gradient(circle at 70% 78%,rgba(220,38,38,.45),transparent 36%);filter:blur(42px);mix-blend-mode:screen;animation:fabrickHue 10s ease-in-out infinite alternate;}
      .fabrick-poem-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.32;filter:saturate(1.18) contrast(1.12);}
      .fabrick-poem-accent{position:absolute;right:46px;bottom:42px;width:176px;height:176px;object-fit:contain;opacity:.82;filter:drop-shadow(0 30px 80px rgba(0,0,0,.65));animation:fabrickFloat 4.8s ease-in-out infinite;}
      .fabrick-poem-title{position:absolute;left:54px;top:56px;z-index:5;max-width:520px;}
      .fabrick-poem-title p{font-size:12px;font-weight:1000;letter-spacing:.32em;text-transform:uppercase;color:#fde68a;}
      .fabrick-poem-title h1{margin-top:18px;font-size:82px;line-height:.86;font-weight:1000;letter-spacing:-.08em;color:white;text-shadow:0 24px 90px rgba(0,0,0,.72);}
      .fabrick-poem-title span{display:block;margin-top:20px;max-width:460px;font-size:19px;line-height:1.65;color:rgba(255,247,232,.78);}
      .fabrick-poem-cube-container{position:absolute;left:50%;top:50%;width:280px;height:280px;perspective:900px;transform:translate(-18%,-42%);z-index:4;}
      .fabrick-poem-cube{position:relative;width:100%;height:100%;transform-style:preserve-3d;animation:fabrickCubeRotate 13s linear infinite;}
      .fabrick-poem-face{position:absolute;display:grid;place-items:center;width:280px;height:280px;border:1px solid rgba(255,255,255,.18);background:linear-gradient(135deg,rgba(255,255,255,.12),rgba(255,255,255,.025));box-shadow:inset 0 0 44px rgba(250,204,21,.12),0 20px 70px rgba(0,0,0,.35);backdrop-filter:blur(14px);overflow:hidden;}
      .fabrick-poem-face.text{padding:26px;text-align:center;font-size:19px;line-height:1.65;font-weight:800;color:#fff7e8;text-transform:uppercase;letter-spacing:.05em;}
      .fabrick-poem-face.text strong{font-size:24px;color:#facc15;}
      .fabrick-poem-face.top{transform:rotateX(90deg) translateZ(140px);background:rgba(250,204,21,.18)}
      .fabrick-poem-face.bottom{transform:rotateX(-90deg) translateZ(140px);background:rgba(37,99,235,.18)}
      .fabrick-poem-face.left{transform:rotateY(-90deg) translateZ(140px)}
      .fabrick-poem-face.right{transform:rotateY(90deg) translateZ(140px)}
      .fabrick-poem-face.front{transform:translateZ(140px);background:linear-gradient(135deg,rgba(250,204,21,.24),rgba(220,38,38,.12));}
      .fabrick-poem-face.back{transform:rotateY(180deg) translateZ(140px)}
      .fabrick-poem-reflect{position:absolute;left:50%;top:72%;width:280px;height:280px;perspective:900px;transform:translate(-18%,-20%) scaleY(-.36);opacity:.18;filter:blur(1px);z-index:2;}
      .fabrick-poem-reflect .fabrick-poem-cube{animation:fabrickCubeRotate 13s linear infinite;}
      .fabrick-poem-children{position:absolute;left:54px;bottom:54px;z-index:7;display:flex;flex-wrap:wrap;gap:12px;max-width:560px;}
      @keyframes fabrickColombiaSweep{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
      @keyframes fabrickHue{0%{transform:translate3d(-4%,-3%,0) scale(1)}100%{transform:translate3d(4%,5%,0) scale(1.1)}}
      @keyframes fabrickCubeRotate{0%{transform:rotateX(-20deg) rotateY(0deg) rotateZ(0deg)}100%{transform:rotateX(-20deg) rotateY(360deg) rotateZ(360deg)}}
      @keyframes fabrickFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
      @media(max-width:720px){.fabrick-poem-title{left:42px;top:42px}.fabrick-poem-title h1{font-size:68px}.fabrick-poem-title span{font-size:17px}.fabrick-poem-cube-container{transform:translate(-3%,-28%) scale(.86)}.fabrick-poem-reflect{transform:translate(-3%,-12%) scale(.86) scaleY(-.32)}}
    `}</style>
    <div className="fabrick-poem-wrap">
      <div ref={contentRef} className="fabrick-poem-content">
        <div className="fabrick-poem-full">
          <div className="fabrick-poem-hue" />
          <img className="fabrick-poem-bg" src={backgroundImageUrl} alt="Soluciones Fabrick obra" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <img className="fabrick-poem-accent" src={accentImageUrl} alt="Soluciones Fabrick" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div className="fabrick-poem-title">
            <p>Soluciones Fabrick</p>
            <h1>Tu obra en buenas manos</h1>
            <span>Diseño, cálculo, presupuesto digital y ejecución con presentación profesional para cada cliente.</span>
          </div>
          <div className="fabrick-poem-cube-container"><Cube /></div>
          <div className="fabrick-poem-reflect"><Cube /></div>
          {children && <div className="fabrick-poem-children">{children}</div>}
        </div>
      </div>
    </div>
  </section>;
}

function Cube() {
  return <div className="fabrick-poem-cube">
    <div className="fabrick-poem-face top" />
    <div className="fabrick-poem-face bottom" />
    <div className="fabrick-poem-face left text" dangerouslySetInnerHTML={{ __html: poemHTML }} />
    <div className="fabrick-poem-face right text" dangerouslySetInnerHTML={{ __html: poemHTML }} />
    <div className="fabrick-poem-face front" />
    <div className="fabrick-poem-face back text" dangerouslySetInnerHTML={{ __html: poemHTML }} />
  </div>;
}
