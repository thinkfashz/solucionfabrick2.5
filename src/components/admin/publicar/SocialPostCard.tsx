'use client';

import { forwardRef } from 'react';
/* eslint-disable @next/next/no-img-element */

export type SocialPostTheme = 'amarillo' | 'claro';

export interface SocialPostData {
  titulo: string;
  descripcion: string;
  tag: string;
  fecha: string;
  cta: string;
  hashtags: string[];
  image: string | null;
  tema: SocialPostTheme;
}

const PALETTE: Record<
  SocialPostTheme,
  {
    bg: string;
    card: string;
    title: string;
    text: string;
    muted: string;
    accentBg: string;
    accentText: string;
    border: string;
    chip: string;
    chipText: string;
  }
> = {
  amarillo: {
    bg: 'linear-gradient(135deg, #FFD05A 0%, #FFB000 55%, #eab308 100%)',
    card: 'rgba(0, 0, 0, 0.88)',
    title: '#FFF9EE',
    text: '#F2DFBB',
    muted: 'rgba(255, 176, 0, 0.85)',
    accentBg: '#FFB000',
    accentText: '#111214',
    border: 'rgba(255, 176, 0, 0.45)',
    chip: 'rgba(255, 176, 0, 0.18)',
    chipText: '#FFB000',
  },
  claro: {
    bg: 'linear-gradient(135deg, #FFF9EE 0%, #FFF9EE 55%, #F2DFBB 100%)',
    card: '#FFF9EE',
    title: '#08090A',
    text: '#3f3f46',
    muted: '#BFB8AC',
    accentBg: '#111214',
    accentText: '#FFB000',
    border: 'rgba(17, 17, 17, 0.08)',
    chip: 'rgba(17, 17, 17, 0.06)',
    chipText: '#111214',
  },
};

export interface SocialPostCardProps {
  post: SocialPostData;
  /**
   * Render at the native 1080×1080 resolution for PNG export. When false (the
   * default) the card scales to its container so it can be used as a live
   * preview inside the editor.
   */
  exportMode?: boolean;
}

const SocialPostCard = forwardRef<HTMLDivElement, SocialPostCardProps>(function SocialPostCard(
  { post, exportMode = false },
  ref,
) {
  const palette = PALETTE[post.tema] ?? PALETTE.amarillo;

  const baseStyle: React.CSSProperties = exportMode
    ? { width: 1080, height: 1080 }
    : {
        width: '100%',
        aspectRatio: '1 / 1',
      };

  return (
    <div
      ref={ref}
      data-social-post-card
      data-theme={post.tema}
      style={{
        ...baseStyle,
        position: 'relative',
        overflow: 'hidden',
        background: palette.bg,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Helvetica, Arial, sans-serif',
      }}
    >
      {/* Logo mark */}
      <div
        style={{
          position: 'absolute',
          top: '6%',
          left: '6%',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: post.tema === 'amarillo' ? '#111214' : '#111214',
          fontWeight: 900,
          letterSpacing: '0.3em',
          fontSize: exportMode ? 22 : '1.1vw',
          textTransform: 'uppercase',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: exportMode ? 40 : '2.2vw',
            height: exportMode ? 40 : '2.2vw',
            borderRadius: '50%',
            background: palette.accentText === '#FFB000' ? '#FFB000' : '#111214',
            boxShadow:
              post.tema === 'amarillo'
                ? '0 4px 12px rgba(0,0,0,0.25)'
                : '0 4px 12px rgba(0,0,0,0.08)',
          }}
        />
        <span>Soluciones Fabrick</span>
      </div>

      {/* Tag pill */}
      {post.tag ? (
        <div
          style={{
            position: 'absolute',
            top: '6%',
            right: '6%',
            background: palette.accentBg,
            color: palette.accentText,
            padding: exportMode ? '10px 22px' : '0.6vw 1.2vw',
            borderRadius: 999,
            fontSize: exportMode ? 18 : '0.95vw',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
          }}
        >
          {post.tag}
        </div>
      ) : null}

      {/* Image or placeholder */}
      <div
        style={{
          position: 'absolute',
          top: '18%',
          left: '8%',
          right: '8%',
          height: '46%',
          borderRadius: exportMode ? 28 : '1.8vw',
          overflow: 'hidden',
          background: palette.card,
          border: `1px solid ${palette.border}`,
          boxShadow:
            post.tema === 'amarillo'
              ? '0 20px 60px rgba(0,0,0,0.28)'
              : '0 20px 60px rgba(17,17,17,0.12)',
        }}
      >
        {post.image ? (
          <img
            src={post.image}
            alt={post.titulo || 'Imagen del post'}
            crossOrigin="anonymous"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: post.tema === 'amarillo' ? 'rgba(255, 176, 0,0.7)' : 'rgba(17,17,17,0.35)',
              fontSize: exportMode ? 20 : '1vw',
              textTransform: 'uppercase',
              letterSpacing: '0.3em',
              fontWeight: 700,
            }}
          >
            Sube una imagen
          </div>
        )}
      </div>

      {/* Text block */}
      <div
        style={{
          position: 'absolute',
          bottom: '6%',
          left: '8%',
          right: '8%',
          color: post.tema === 'amarillo' ? '#111214' : '#111214',
        }}
      >
        {post.fecha ? (
          <p
            style={{
              fontSize: exportMode ? 18 : '0.9vw',
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              fontWeight: 700,
              opacity: 0.7,
              margin: 0,
              marginBottom: exportMode ? 10 : '0.5vw',
            }}
          >
            {post.fecha}
          </p>
        ) : null}
        <h2
          style={{
            fontSize: exportMode ? 58 : '2.9vw',
            fontWeight: 900,
            lineHeight: 1.05,
            margin: 0,
            color: post.tema === 'amarillo' ? '#111214' : '#08090A',
          }}
        >
          {post.titulo || 'Título del post'}
        </h2>
        {post.descripcion ? (
          <p
            style={{
              fontSize: exportMode ? 26 : '1.3vw',
              lineHeight: 1.35,
              marginTop: exportMode ? 14 : '0.7vw',
              marginBottom: 0,
              color:
                post.tema === 'amarillo'
                  ? 'rgba(17, 17, 17, 0.82)'
                  : 'rgba(17, 17, 17, 0.7)',
              maxWidth: '95%',
            }}
          >
            {post.descripcion}
          </p>
        ) : null}

        {/* CTA + hashtags */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: exportMode ? 28 : '1.4vw',
            gap: exportMode ? 20 : '1vw',
            flexWrap: 'wrap',
          }}
        >
          {post.cta ? (
            <span
              style={{
                background: post.tema === 'amarillo' ? '#111214' : '#FFB000',
                color: post.tema === 'amarillo' ? '#FFB000' : '#111214',
                padding: exportMode ? '16px 28px' : '0.8vw 1.4vw',
                borderRadius: 999,
                fontSize: exportMode ? 20 : '1vw',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
              }}
            >
              {post.cta}
            </span>
          ) : null}
          {post.hashtags.length > 0 ? (
            <div
              style={{
                display: 'flex',
                gap: exportMode ? 10 : '0.5vw',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
              }}
            >
              {post.hashtags.slice(0, 4).map((h) => (
                <span
                  key={h}
                  style={{
                    background: palette.chip,
                    color: palette.chipText,
                    padding: exportMode ? '8px 16px' : '0.4vw 0.8vw',
                    borderRadius: 999,
                    fontSize: exportMode ? 16 : '0.85vw',
                    fontWeight: 700,
                  }}
                >
                  #{h.replace(/^#/, '')}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
});

export default SocialPostCard;
