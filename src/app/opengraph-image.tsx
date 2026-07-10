import { ImageResponse } from 'next/og';

export const alt = 'Soluciones Fabrick — construcción, remodelación y equipamiento del hogar';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ background: 'linear-gradient(135deg,#070706,#241b05)', color: 'white', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', padding: '62px 76px 52px', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <svg width="67" height="82" viewBox="0 0 38 46" fill="none">
          <path d="M2 42 19 4l17 38h-6L19 12 8 42Z" fill="#FACC15" />
          <path d="M8 42 19 12v6l-7 24Z" fill="#B37E00" opacity=".8" />
          <rect x="23" y="10" width="7" height="18" rx="1.5" fill="#FFC700" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 18, letterSpacing: 7, color: '#A8A59D' }}>SOLUCIONES</span>
          <span style={{ fontSize: 38, fontWeight: 900, letterSpacing: 3 }}>FABRICK</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 960 }}>
        <div style={{ display: 'flex', fontSize: 72, fontWeight: 900, letterSpacing: -4 }}>Construye con claridad</div>
        <div style={{ display: 'flex', color: '#FACC15', fontSize: 72, fontWeight: 900, letterSpacing: -4 }}>desde el inicio.</div>
        <div style={{ display: 'flex', color: '#C7C4BC', fontSize: 25, marginTop: 28 }}>Kits · Cabañas · Ampliaciones · Casas llave en mano</div>
      </div>
      <div style={{ alignItems: 'center', borderTop: '1px solid rgba(255,255,255,.15)', display: 'flex', justifyContent: 'space-between', paddingTop: 24 }}>
        <span style={{ color: '#FACC15', fontSize: 22, fontWeight: 800 }}>Calcula tu proyecto</span>
        <span style={{ color: '#8E8B83', fontSize: 17, letterSpacing: 3 }}>MAULE · SANTIAGO · CHILE</span>
      </div>
    </div>,
    size,
  );
}
