import { ImageResponse } from 'next/og';
import { getPublicFounderProfile } from '@/lib/founderProfileServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const alt = 'Fundador de Soluciones Fabrick';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function FounderOpenGraphImage() {
  const founder = await getPublicFounderProfile();
  const avatar = founder.avatarUrl;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: '#f7f1e7',
          color: '#151515',
          fontFamily: 'Arial, Helvetica, sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 520,
            height: 520,
            borderRadius: 999,
            background: '#ffd88c',
            opacity: 0.42,
            left: -180,
            top: -230,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 440,
            height: 440,
            borderRadius: 999,
            background: '#ffb000',
            opacity: 0.12,
            right: 120,
            bottom: -250,
          }}
        />

        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            padding: '58px 62px',
            gap: 56,
            alignItems: 'stretch',
          }}
        >
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 18,
                  background: '#151515',
                  color: '#ffb000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 21,
                  fontWeight: 900,
                  letterSpacing: '-0.06em',
                }}
              >
                SB
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9a6814' }}>
                  Soluciones Fabrick
                </span>
                <span style={{ marginTop: 6, fontSize: 16, color: '#6c665f' }}>Perfil del fundador</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 700 }}>
              <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9a6814' }}>
                Construcción · Tecnología · Automatización
              </span>
              <div
                style={{
                  marginTop: 18,
                  fontSize: founder.displayName.length > 24 ? 56 : 66,
                  lineHeight: 0.96,
                  fontWeight: 900,
                  letterSpacing: '-0.055em',
                  color: '#161513',
                }}
              >
                {founder.displayName}
              </div>
              <div style={{ marginTop: 20, fontSize: 25, lineHeight: 1.35, color: '#504c46', maxWidth: 650 }}>
                {founder.profile.headline}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 15, color: '#756f66' }}>
              <span style={{ width: 52, height: 3, borderRadius: 99, background: '#ffb000' }} />
              solucionesfabrick.com/fundador
            </div>
          </div>

          <div
            style={{
              width: 330,
              minWidth: 330,
              height: '100%',
              borderRadius: 34,
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#171717',
              border: '1px solid rgba(20,20,20,.08)',
            }}
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" width="330" height="514" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ display: 'flex', color: '#ffb000', fontSize: 78, fontWeight: 900, letterSpacing: '-0.08em' }}>SB</div>
            )}
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                left: 20,
                right: 20,
                bottom: 20,
                borderRadius: 18,
                padding: '13px 16px',
                background: 'rgba(15,15,15,.80)',
                color: '#fff8ea',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Fundador · Soluciones Fabrick
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
