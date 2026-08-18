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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
          <div style={{ display: 'flex', height: 82, position: 'relative', width: 350 }}>
            <div style={{ backgroundColor: '#D4D7D4', borderRadius: 8, height: 7, left: 18, position: 'absolute', top: 45, transform: 'rotate(-20deg)', transformOrigin: 'right center', width: 170 }} />
            <div style={{ backgroundColor: '#8C9290', borderRadius: 8, height: 7, left: 177, position: 'absolute', top: 45, transform: 'rotate(20deg)', transformOrigin: 'left center', width: 170 }} />
            <div style={{ backgroundColor: '#F5F6F3', borderRadius: 8, height: 4, left: 28, position: 'absolute', top: 51, transform: 'rotate(-20deg)', transformOrigin: 'right center', width: 160 }} />
            <div style={{ backgroundColor: '#B8BDBA', borderRadius: 8, height: 4, left: 177, position: 'absolute', top: 51, transform: 'rotate(20deg)', transformOrigin: 'left center', width: 160 }} />
            <div style={{ backgroundColor: '#B6BBB8', borderRadius: 4, height: 42, left: 240, position: 'absolute', top: 7, width: 30 }} />
            <div style={{ backgroundColor: '#EFF1EE', borderRadius: 3, height: 34, left: 246, position: 'absolute', top: 10, width: 7 }} />
          </div>
          <div style={{ color: '#E8B43C', fontSize: 37, fontWeight: 900, letterSpacing: 1.2, lineHeight: 1 }}>SOLUCIONES FABRICK</div>
          <div style={{ color: '#C1C4C1', fontSize: 17, fontWeight: 800, letterSpacing: 4 }}>CONSTRUCCIÓN · REMODELACIÓN · REPARACIÓN</div>
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
