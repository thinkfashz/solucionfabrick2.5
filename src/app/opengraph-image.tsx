import { ImageResponse } from 'next/og';

export const alt = 'Soluciones Fabrick — construcción, remodelación y reparación del hogar';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'stretch',
          background: 'radial-gradient(circle at 86% 12%, rgba(255,176,0,0.30), transparent 26%), radial-gradient(circle at 7% 96%, rgba(245,135,31,0.24), transparent 34%), #08090A',
          color: '#FFF9EE',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'space-between',
          padding: '58px 68px',
          position: 'relative',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ alignItems: 'center', background: '#FFB000', borderRadius: 24, color: '#08090A', display: 'flex', fontSize: 42, fontWeight: 900, height: 92, justifyContent: 'center', letterSpacing: -4, width: 92 }}>SF</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ color: '#FFF9EE', fontSize: 31, fontWeight: 800, letterSpacing: 3 }}>SOLUCIONES</div>
            <div style={{ color: '#FFB000', fontSize: 48, fontWeight: 900, letterSpacing: 5 }}>FABRICK</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 930 }}>
          <div style={{ color: '#FFF9EE', fontSize: 72, fontWeight: 900, letterSpacing: -3, lineHeight: 1.02 }}>Construye, remodela y transforma con claridad.</div>
          <div style={{ color: '#D6CFC2', fontSize: 29, lineHeight: 1.35 }}>Construcción · Remodelación · Reparación · Región del Maule y Chile</div>
        </div>

        <div style={{ alignItems: 'center', borderTop: '2px solid rgba(255,176,0,0.48)', display: 'flex', justifyContent: 'space-between', paddingTop: 22 }}>
          <div style={{ color: '#FFB000', fontSize: 21, fontWeight: 800, letterSpacing: 3 }}>SOLUCIONESFABRICK.COM</div>
          <div style={{ color: '#FFF9EE', fontSize: 21, fontWeight: 700 }}>Construimos casas, Dios construye hogares.</div>
        </div>
      </div>
    ),
    size,
  );
}
