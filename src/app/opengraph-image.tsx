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
          backgroundColor: '#08090A',
          color: '#FFF9EE',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'space-between',
          overflow: 'hidden',
          padding: '46px 64px',
          position: 'relative',
          width: '100%',
        }}
      >
        <div style={{ backgroundColor: '#121417', bottom: -170, height: 480, opacity: 0.9, position: 'absolute', right: -150, transform: 'rotate(-25deg)', width: 720 }} />
        <div style={{ backgroundColor: '#FFB000', bottom: 74, height: 3, opacity: 0.65, position: 'absolute', right: -80, transform: 'rotate(-25deg)', width: 700 }} />
        <div style={{ backgroundColor: '#F5871F', bottom: 118, height: 2, opacity: 0.55, position: 'absolute', right: -120, transform: 'rotate(-25deg)', width: 730 }} />

        <div style={{ alignItems: 'center', display: 'flex', gap: 19, position: 'relative' }}>
          <div style={{ display: 'flex', height: 104, position: 'relative', width: 100 }}>
            <div style={{ backgroundColor: '#FFB000', borderRadius: 8, height: 9, left: 4, position: 'absolute', top: 83, transform: 'rotate(-61deg)', transformOrigin: 'left center', width: 100 }} />
            <div style={{ backgroundColor: '#F5871F', borderRadius: 8, height: 9, left: 48, position: 'absolute', top: 0, transform: 'rotate(61deg)', transformOrigin: 'left center', width: 100 }} />
            <div style={{ backgroundColor: '#FFF9EE', borderRadius: 8, height: 4, left: 18, position: 'absolute', top: 79, transform: 'rotate(-61deg)', transformOrigin: 'left center', width: 81 }} />
            <div style={{ backgroundColor: '#FFF9EE', borderRadius: 8, height: 4, left: 51, position: 'absolute', top: 17, transform: 'rotate(61deg)', transformOrigin: 'left center', width: 81 }} />
            <div style={{ backgroundColor: '#FFB000', borderRadius: 5, height: 36, left: 46, position: 'absolute', top: 56, width: 9 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ color: '#FFF9EE', fontSize: 30, fontWeight: 800, letterSpacing: 2, lineHeight: 1 }}>SOLUCIONES</div>
            <div style={{ color: '#FFB000', fontSize: 51, fontWeight: 900, letterSpacing: 2.8, lineHeight: 1 }}>FABRICK</div>
            <div style={{ color: '#C9C1B5', fontSize: 13, fontWeight: 800, letterSpacing: 2.8 }}>CONSTRUIMOS CASAS · DIOS CONSTRUYE HOGARES</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 17, maxWidth: 830, position: 'relative' }}>
          <div style={{ color: '#FFF9EE', fontSize: 65, fontWeight: 900, letterSpacing: -2.2, lineHeight: 1.03 }}>Construye y transforma con respaldo técnico.</div>
          <div style={{ color: '#D6D2CB', fontSize: 27, fontWeight: 600, lineHeight: 1.35 }}>Evaluación clara, materiales duraderos y ejecución por etapas para tu proyecto.</div>
        </div>

        <div style={{ alignItems: 'center', borderTop: '2px solid #7D621D', display: 'flex', justifyContent: 'space-between', paddingTop: 20, position: 'relative' }}>
          <div style={{ color: '#FFB000', fontSize: 20, fontWeight: 900, letterSpacing: 3 }}>SOLUCIONESFABRICK.COM</div>
          <div style={{ color: '#FFF9EE', fontSize: 19, fontWeight: 700 }}>Maule · Chile</div>
        </div>
      </div>
    ),
    size,
  );
}
