'use client';

/**
 * HeroHouse3D — Ilustración arquitectónica realista de una casa moderna,
 * usada como pieza central del hero. Reemplaza la casa 3D procedural
 * (low-poly r3f) por un SVG detallado con:
 *   - Cielo en gradiente (noche → amanecer dorado)
 *   - Silueta de cordillera al fondo
 *   - Casa moderna de dos volúmenes (techo a dos aguas + cubo plano)
 *   - Revestimiento oscuro con trim dorado y ventanales iluminados
 *   - Reflejo del agua / piscina
 *   - Vegetación y luna
 *   - Brillo dorado animado y respeto por prefers-reduced-motion
 *
 * No usa WebGL → carga más rápida, mejor accesibilidad y se ve mucho
 * más cercano a una fotografía arquitectónica.
 *
 * Mantiene el nombre del componente para no tocar Hero.tsx.
 */

import { useEffect, useState } from 'react';

export default function HeroHouse3D() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  return (
    <div
      className={[
        'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
        'w-[520px] h-[360px] md:w-[760px] md:h-[520px] lg:w-[920px] lg:h-[620px]',
        'pointer-events-none select-none',
        reducedMotion ? '' : 'hero-house-float',
      ].join(' ')}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 920 620"
        className="w-full h-full drop-shadow-[0_25px_60px_rgba(0,0,0,0.6)]"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Cielo amanecer */}
          <linearGradient id="hh-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#0b0d12" />
            <stop offset="45%" stopColor="#1a1410" />
            <stop offset="78%" stopColor="#3a2a14" />
            <stop offset="92%" stopColor="#a07028" />
            <stop offset="100%" stopColor="#e6b966" />
          </linearGradient>

          {/* Brillo del sol/luna detrás de la casa */}
          <radialGradient id="hh-sunglow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%"   stopColor="#facc15" stopOpacity="0.85" />
            <stop offset="35%"  stopColor="#facc15" stopOpacity="0.35" />
            <stop offset="70%"  stopColor="#c9a96e" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* Fachada principal (gris oscuro tipo metalcon) */}
          <linearGradient id="hh-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#1c1c1f" />
            <stop offset="100%" stopColor="#0a0a0c" />
          </linearGradient>

          {/* Fachada lateral (un toque más claro para dar profundidad) */}
          <linearGradient id="hh-wall-side" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#0a0a0c" />
            <stop offset="100%" stopColor="#222226" />
          </linearGradient>

          {/* Madera dorada del segundo volumen */}
          <linearGradient id="hh-wood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#c9a96e" />
            <stop offset="100%" stopColor="#7a5a2c" />
          </linearGradient>

          {/* Ventanas iluminadas (luz cálida interior) */}
          <linearGradient id="hh-window" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#fff2c2" />
            <stop offset="60%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#c9a96e" />
          </linearGradient>

          {/* Piso exterior / terraza */}
          <linearGradient id="hh-deck" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#3a2a14" />
            <stop offset="100%" stopColor="#0e0a06" />
          </linearGradient>

          {/* Reflejo del agua (piscina) */}
          <linearGradient id="hh-pool" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#c9a96e" stopOpacity="0.55" />
            <stop offset="50%"  stopColor="#1a1410" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.95" />
          </linearGradient>

          {/* Suelo / primer plano */}
          <linearGradient id="hh-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#1a1410" />
            <stop offset="100%" stopColor="#000000" />
          </linearGradient>

          {/* Brillo cálido alrededor de las ventanas */}
          <radialGradient id="hh-winglow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%"   stopColor="#facc15" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
          </radialGradient>

          {/* Filtro suave para drop shadow interno */}
          <filter id="hh-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* Cielo */}
        <rect x="0" y="0" width="920" height="620" fill="url(#hh-sky)" />

        {/* Halo de sol detrás de la casa */}
        <ellipse cx="640" cy="430" rx="320" ry="220" fill="url(#hh-sunglow)" />

        {/* Cordillera lejana (silueta suave) */}
        <path
          d="M 0,420 L 60,400 L 130,415 L 210,380 L 300,400 L 390,365 L 480,395 L 580,360 L 690,390 L 780,370 L 870,395 L 920,385 L 920,460 L 0,460 Z"
          fill="#0a0a0c"
          opacity="0.75"
        />

        {/* Cordillera cercana */}
        <path
          d="M 0,455 L 90,430 L 180,450 L 290,425 L 410,452 L 530,430 L 660,455 L 790,438 L 920,452 L 920,520 L 0,520 Z"
          fill="#050505"
          opacity="0.9"
        />

        {/* Vegetación oscura izquierda (siluetas de árboles) */}
        <g opacity="0.95">
          <ellipse cx="80"  cy="480" rx="55" ry="34" fill="#000" />
          <ellipse cx="135" cy="478" rx="38" ry="26" fill="#000" />
          <ellipse cx="40"  cy="490" rx="60" ry="28" fill="#000" />
        </g>

        {/* Vegetación oscura derecha */}
        <g opacity="0.95">
          <ellipse cx="850" cy="478" rx="55" ry="32" fill="#000" />
          <ellipse cx="800" cy="485" rx="40" ry="24" fill="#000" />
          <ellipse cx="900" cy="490" rx="40" ry="22" fill="#000" />
        </g>

        {/* === CASA === */}
        {/* Volumen 1: bloque rectangular de la izquierda (techo a dos aguas) */}
        {/* Techo a dos aguas */}
        <polygon
          points="170,360 360,300 550,360"
          fill="#0a0a0c"
          stroke="#c9a96e"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Sub-sombra del alero */}
        <polygon points="170,360 550,360 540,366 180,366" fill="#000" opacity="0.85" />

        {/* Cuerpo principal (fachada frontal) */}
        <rect x="200" y="360" width="320" height="120" fill="url(#hh-wall)" />

        {/* Línea horizontal de plancha (detalle metalcon) */}
        <line x1="200" y1="395" x2="520" y2="395" stroke="#c9a96e" strokeWidth="0.5" opacity="0.35" />
        <line x1="200" y1="430" x2="520" y2="430" stroke="#c9a96e" strokeWidth="0.5" opacity="0.35" />
        <line x1="200" y1="465" x2="520" y2="465" stroke="#c9a96e" strokeWidth="0.5" opacity="0.35" />

        {/* Lateral derecho del bloque 1 (perspectiva sutil) */}
        <polygon points="520,360 560,360 560,476 520,480" fill="url(#hh-wall-side)" />

        {/* Halo cálido detrás de las ventanas grandes */}
        <ellipse cx="290" cy="425" rx="80" ry="40" fill="url(#hh-winglow)" />
        <ellipse cx="450" cy="425" rx="80" ry="40" fill="url(#hh-winglow)" />

        {/* Ventanal grande izquierdo (4 paneles) */}
        <g>
          <rect x="225" y="385" width="130" height="80" fill="url(#hh-window)" />
          <line x1="290" y1="385" x2="290" y2="465" stroke="#0a0a0c" strokeWidth="2" />
          <line x1="225" y1="425" x2="355" y2="425" stroke="#0a0a0c" strokeWidth="2" />
          {/* marco dorado */}
          <rect x="225" y="385" width="130" height="80" fill="none" stroke="#c9a96e" strokeWidth="1.5" />
        </g>

        {/* Ventanal grande derecho */}
        <g>
          <rect x="385" y="385" width="130" height="80" fill="url(#hh-window)" />
          <line x1="450" y1="385" x2="450" y2="465" stroke="#0a0a0c" strokeWidth="2" />
          <line x1="385" y1="425" x2="515" y2="425" stroke="#0a0a0c" strokeWidth="2" />
          <rect x="385" y="385" width="130" height="80" fill="none" stroke="#c9a96e" strokeWidth="1.5" />
        </g>

        {/* Ventana ático en techo (lucarna iluminada) */}
        <g>
          <rect x="335" y="328" width="50" height="22" fill="url(#hh-window)" />
          <rect x="335" y="328" width="50" height="22" fill="none" stroke="#c9a96e" strokeWidth="1" />
        </g>

        {/* Volumen 2: módulo cúbico moderno a la derecha (madera dorada) */}
        {/* Cuerpo */}
        <rect x="560" y="330" width="200" height="150" fill="url(#hh-wood)" />
        {/* Techo plano (línea horizontal con voladizo) */}
        <rect x="555" y="324" width="210" height="8" fill="#0a0a0c" />
        {/* Costuras verticales del revestimiento de madera */}
        <g stroke="#5a3f1a" strokeWidth="0.6" opacity="0.65">
          <line x1="585" y1="332" x2="585" y2="478" />
          <line x1="610" y1="332" x2="610" y2="478" />
          <line x1="635" y1="332" x2="635" y2="478" />
          <line x1="660" y1="332" x2="660" y2="478" />
          <line x1="685" y1="332" x2="685" y2="478" />
          <line x1="710" y1="332" x2="710" y2="478" />
          <line x1="735" y1="332" x2="735" y2="478" />
        </g>

        {/* Halo cálido del módulo derecho */}
        <ellipse cx="660" cy="395" rx="90" ry="45" fill="url(#hh-winglow)" />

        {/* Ventanal vertical gigante (doble altura) */}
        <g>
          <rect x="585" y="350" width="150" height="125" fill="url(#hh-window)" opacity="0.95" />
          <line x1="660" y1="350" x2="660" y2="475" stroke="#0a0a0c" strokeWidth="2" />
          <line x1="585" y1="412" x2="735" y2="412" stroke="#0a0a0c" strokeWidth="1.5" />
          <rect x="585" y="350" width="150" height="125" fill="none" stroke="#0a0a0c" strokeWidth="2" />
        </g>

        {/* Puerta principal (en el bloque 1) */}
        <g>
          <rect x="475" y="408" width="38" height="72" fill="#0a0a0c" />
          <rect x="475" y="408" width="38" height="72" fill="none" stroke="#c9a96e" strokeWidth="1" />
          {/* Manilla dorada */}
          <circle cx="505" cy="446" r="1.5" fill="#facc15" />
          {/* Luz cálida bajo la puerta */}
          <rect x="475" y="476" width="38" height="4" fill="#facc15" opacity="0.7" />
        </g>

        {/* Lámpara colgante exterior (acento dorado) */}
        <g>
          <line x1="540" y1="360" x2="540" y2="385" stroke="#c9a96e" strokeWidth="0.8" />
          <circle cx="540" cy="390" r="3" fill="#facc15">
            {!reducedMotion && (
              <animate
                attributeName="r"
                values="3;3.6;3"
                dur="3s"
                repeatCount="indefinite"
              />
            )}
          </circle>
          <circle cx="540" cy="390" r="8" fill="#facc15" opacity="0.25" />
        </g>

        {/* Terraza / deck delante de la casa */}
        <rect x="170" y="478" width="610" height="14" fill="url(#hh-deck)" />
        <line x1="170" y1="478" x2="780" y2="478" stroke="#c9a96e" strokeWidth="0.8" opacity="0.55" />

        {/* Piscina con reflejo dorado */}
        <rect x="220" y="498" width="520" height="52" rx="3" fill="url(#hh-pool)" />
        {/* Reflejo de las ventanas en el agua */}
        <g opacity="0.35">
          <rect x="230"  y="502" width="120" height="6" fill="#facc15" />
          <rect x="385"  y="502" width="125" height="6" fill="#facc15" />
          <rect x="585"  y="502" width="148" height="6" fill="#facc15" />
        </g>
        {/* Pequeñas ondas */}
        <g opacity="0.25" stroke="#c9a96e" strokeWidth="0.5" fill="none">
          <path d="M 240,520 q 20,-2 40,0 t 40,0 t 40,0" />
          <path d="M 400,535 q 20,-2 40,0 t 40,0 t 40,0" />
          <path d="M 560,525 q 20,-2 40,0 t 40,0 t 40,0" />
        </g>

        {/* Suelo / primer plano */}
        <rect x="0" y="550" width="920" height="70" fill="url(#hh-ground)" />

        {/* Línea de horizonte dorada sutil (acento de marca) */}
        <line
          x1="0" y1="478" x2="920" y2="478"
          stroke="#c9a96e" strokeWidth="0.6" opacity="0.25"
        />

        {/* Pequeñas luces de jardín */}
        <g>
          <circle cx="195" cy="488" r="1.6" fill="#facc15" />
          <circle cx="195" cy="488" r="5"   fill="#facc15" opacity="0.25" />
          <circle cx="755" cy="488" r="1.6" fill="#facc15" />
          <circle cx="755" cy="488" r="5"   fill="#facc15" opacity="0.25" />
        </g>

        {/* Luna sutil */}
        <circle cx="780" cy="135" r="22" fill="#f5e6c2" opacity="0.85" />
        <circle cx="780" cy="135" r="34" fill="#facc15" opacity="0.12" />

        {/* Estrellas suaves */}
        <g fill="#fff" opacity="0.55">
          <circle cx="120" cy="80"  r="0.8" />
          <circle cx="220" cy="140" r="0.6" />
          <circle cx="350" cy="100" r="0.9" />
          <circle cx="500" cy="60"  r="0.7" />
          <circle cx="620" cy="150" r="0.6" />
          <circle cx="700" cy="90"  r="0.8" />
          <circle cx="850" cy="200" r="0.6" />
          <circle cx="60"  cy="200" r="0.7" />
        </g>
      </svg>

      <style jsx>{`
        .hero-house-float {
          animation: hh-float 9s ease-in-out infinite;
        }
        @keyframes hh-float {
          0%, 100% {
            transform: translate(-50%, -50%) translateY(0);
          }
          50% {
            transform: translate(-50%, -50%) translateY(-8px);
          }
        }
      `}</style>
    </div>
  );
}
