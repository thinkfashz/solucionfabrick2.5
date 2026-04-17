'use client';

/**
 * Mounts once in the layout. Provides a full-screen black overlay with the
 * SF gold logo for cinematic page transitions triggered by routeTransition.ts.
 */
export default function PageTransition() {
  return (
    <div
      id="page-transition-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        opacity: 0,
        transition: 'opacity 0.3s cubic-bezier(0.16,1,0.3,1)',
      }}
      aria-hidden="true"
    >
      {/* SF logo dorado */}
      <svg
        viewBox="0 0 160 80"
        style={{ height: '5rem', width: 'auto', filter: 'drop-shadow(0 0 20px rgba(250,204,21,0.6))' }}
      >
        <defs>
          <linearGradient id="ptGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFE17A" />
            <stop offset="60%" stopColor="#FFC700" />
            <stop offset="100%" stopColor="#E2AE00" />
          </linearGradient>
        </defs>
        <text
          x="12"
          y="62"
          fontFamily="Montserrat, Arial, sans-serif"
          fontSize="72"
          fontWeight="900"
          fill="url(#ptGold)"
          letterSpacing="-2"
        >
          SF
        </text>
      </svg>
    </div>
  );
}
