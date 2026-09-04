import { NextRequest, NextResponse } from 'next/server';

type Visual = {
  src: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
  photoUrl: string;
  source: 'pexels' | 'fallback';
};

type PexelsPhoto = {
  alt?: string;
  photographer?: string;
  photographer_url?: string;
  url?: string;
  src?: { landscape?: string; large2x?: string; large?: string };
};

const QUERIES: Record<string, string> = {
  'Obra base': 'concrete foundation residential construction worker',
  Construcción: 'house renovation residential construction framing',
  Instalaciones: 'electrician plumber home installation renovation',
  Terminaciones: 'interior renovation tiling painting home',
  Climatización: 'air conditioner technician installation hvac',
  Exterior: 'outdoor house renovation deck fence construction',
  Carpintería: 'carpenter custom furniture woodworking workshop',
};

const FALLBACKS: Record<string, Visual> = {
  'Obra base': {
    src: 'https://images.pexels.com/photos/6473969/pexels-photo-6473969.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1600&h=1000',
    alt: 'Trabajador ejecutando una remodelación residencial',
    photographer: 'Tima Miroshnichenko',
    photographerUrl: 'https://www.pexels.com/@tima-miroshnichenko/',
    photoUrl: 'https://www.pexels.com/photo/man-person-building-construction-6473969/',
    source: 'fallback',
  },
  Construcción: {
    src: 'https://images.pexels.com/photos/4567376/pexels-photo-4567376.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1600&h=1000',
    alt: 'Vivienda moderna en proceso de construcción y renovación',
    photographer: 'Nothing Ahead',
    photographerUrl: 'https://www.pexels.com/',
    photoUrl: 'https://www.pexels.com/photo/home-renovation-4567376/',
    source: 'fallback',
  },
  Instalaciones: {
    src: 'https://images.pexels.com/photos/38171148/pexels-photo-38171148.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1600&h=1000',
    alt: 'Técnico realizando una instalación eléctrica residencial',
    photographer: 'Elite Power Group',
    photographerUrl: 'https://www.pexels.com/',
    photoUrl: 'https://www.pexels.com/photo/electrician-installing-cables-in-home-setup-38171148/',
    source: 'fallback',
  },
  Terminaciones: {
    src: 'https://images.pexels.com/photos/5493654/pexels-photo-5493654.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1600&h=1000',
    alt: 'Trabajadores realizando terminaciones interiores en una vivienda',
    photographer: 'Antoni Shkraba',
    photographerUrl: 'https://www.pexels.com/@shkrabaanthony/',
    photoUrl: 'https://www.pexels.com/photo/construction-workers-renovating-a-house-5493654/',
    source: 'fallback',
  },
  Climatización: {
    src: 'https://images.pexels.com/photos/5463582/pexels-photo-5463582.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1600&h=1000',
    alt: 'Técnico realizando mantenimiento e instalación de climatización',
    photographer: 'José Andrés Pacheco Cortes',
    photographerUrl: 'https://www.pexels.com/',
    photoUrl: 'https://www.pexels.com/photo/technician-fixing-an-aircon-5463582/',
    source: 'fallback',
  },
  Exterior: {
    src: 'https://images.pexels.com/photos/8961555/pexels-photo-8961555.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1600&h=1000',
    alt: 'Equipo trabajando en el exterior de una vivienda',
    photographer: 'Mikael Blomkvist',
    photographerUrl: 'https://www.pexels.com/@mikael-blomkvist/',
    photoUrl: 'https://www.pexels.com/photo/man-in-black-shirt-holding-gray-and-orange-wheelbarrow-8961555/',
    source: 'fallback',
  },
  Carpintería: {
    src: 'https://images.pexels.com/photos/7483049/pexels-photo-7483049.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1600&h=1000',
    alt: 'Carpintero fabricando mobiliario en taller',
    photographer: 'cottonbro studio',
    photographerUrl: 'https://www.pexels.com/@cottonbro/',
    photoUrl: 'https://www.pexels.com/photo/carpenter-making-a-furniture-7483049/',
    source: 'fallback',
  },
};

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key') || 'Construcción';
  const fallback = FALLBACKS[key] || FALLBACKS.Construcción;
  const apiKey = process.env.PEXELS_API_KEY?.trim();

  if (!apiKey) return NextResponse.json({ visual: fallback, provider: 'Pexels' });

  const query = QUERIES[key] || QUERIES.Construcción;
  try {
    const url = new URL('https://api.pexels.com/v1/search');
    url.searchParams.set('query', query);
    url.searchParams.set('orientation', 'landscape');
    url.searchParams.set('per_page', '8');
    url.searchParams.set('page', '1');

    const response = await fetch(url, {
      headers: { Authorization: apiKey },
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!response.ok) return NextResponse.json({ visual: fallback, provider: 'Pexels' });

    const payload = (await response.json()) as { photos?: PexelsPhoto[] };
    const photos = payload.photos || [];
    const photo = photos[0];
    const src = photo?.src?.large2x || photo?.src?.landscape || photo?.src?.large;
    if (!photo || !src) return NextResponse.json({ visual: fallback, provider: 'Pexels' });

    const visual: Visual = {
      src,
      alt: photo.alt || fallback.alt,
      photographer: photo.photographer || 'Pexels',
      photographerUrl: photo.photographer_url || 'https://www.pexels.com/',
      photoUrl: photo.url || 'https://www.pexels.com/',
      source: 'pexels',
    };

    return NextResponse.json({ visual, provider: 'Pexels' });
  } catch {
    return NextResponse.json({ visual: fallback, provider: 'Pexels' });
  }
}
