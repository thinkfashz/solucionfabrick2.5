import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const FALLBACKS: Record<string, string[]> = {
  'Obra base': [
    'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=82&w=1500&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=82&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?q=82&w=1200&auto=format&fit=crop',
  ],
  Construcción: [
    'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=82&w=1500&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=82&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1541976590-713941681591?q=82&w=1200&auto=format&fit=crop',
  ],
  Instalaciones: [
    'https://images.unsplash.com/photo-1621905251918-48416bd8575a?q=82&w=1500&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?q=82&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=82&w=1200&auto=format&fit=crop',
  ],
  Terminaciones: [
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=82&w=1500&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=82&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1615873968403-89e068629265?q=82&w=1200&auto=format&fit=crop',
  ],
  Climatización: [
    'https://images.unsplash.com/photo-1631545806609-4b2c0697d6f8?q=82&w=1500&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?q=82&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1621905252472-e3f0f7c918f1?q=82&w=1200&auto=format&fit=crop',
  ],
  Exterior: [
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=82&w=1500&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=82&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?q=82&w=1200&auto=format&fit=crop',
  ],
  Carpintería: [
    'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?q=82&w=1500&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1503602642458-232111445657?q=82&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1615874694520-474822394e73?q=82&w=1200&auto=format&fit=crop',
  ],
};

const QUERY_BY_SERVICE: Record<string, string> = {
  albanileria: 'masonry construction wall work',
  cimientos: 'concrete foundation construction',
  radier: 'concrete slab construction',
  metalcon: 'steel frame house construction',
  ampliaciones: 'home extension construction',
  'kit-basico': 'prefabricated house construction',
  'kit-avanzado': 'prefabricated house framing',
  'llave-mano': 'modern house construction',
  techumbre: 'roofing construction installation',
  gasfiteria: 'plumber pipe installation',
  electricidad: 'electrician electrical installation home',
  bano: 'bathroom renovation construction',
  fosa: 'septic tank installation construction',
  revestimiento: 'house siding wall cladding installation',
  terminaciones: 'interior finishing renovation',
  ceramica: 'tile installation interior renovation',
  pintura: 'interior house painting renovation',
  aire: 'air conditioner installation technician',
  climatizacion: 'hvac installation technician',
  terraza: 'wood deck terrace construction',
  cierre: 'fence construction installation',
  porton: 'gate installation house',
  carpinteria: 'carpentry woodworking furniture installation',
};

function fallbackPhotos(category: string) {
  const sources = FALLBACKS[category] || FALLBACKS.Construcción;
  return sources.map((src, index) => ({
    id: `fallback-${index + 1}`,
    src,
    alt: 'Referencia visual del trabajo',
    photographer: '',
    url: '',
    source: 'curated',
  }));
}

export async function GET(request: NextRequest) {
  const service = request.nextUrl.searchParams.get('service')?.trim() || '';
  const category = request.nextUrl.searchParams.get('category')?.trim() || 'Construcción';
  const apiKey = process.env.PEXELS_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json({ photos: fallbackPhotos(category), source: 'curated' });
  }

  const query = QUERY_BY_SERVICE[service] || `${category} construction renovation`;

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=3`,
      {
        headers: { Authorization: apiKey },
        next: { revalidate: 86_400 },
      },
    );

    if (!response.ok) throw new Error(`Pexels ${response.status}`);

    const payload = (await response.json()) as {
      photos?: Array<{
        id: number;
        alt?: string;
        photographer?: string;
        url?: string;
        src?: { large2x?: string; large?: string; landscape?: string };
      }>;
    };

    const photos = (payload.photos || [])
      .map((photo) => ({
        id: String(photo.id),
        src: photo.src?.large2x || photo.src?.large || photo.src?.landscape || '',
        alt: photo.alt || 'Referencia visual del trabajo',
        photographer: photo.photographer || '',
        url: photo.url || '',
        source: 'pexels',
      }))
      .filter((photo) => Boolean(photo.src));

    return NextResponse.json({
      photos: photos.length ? photos : fallbackPhotos(category),
      source: photos.length ? 'pexels' : 'curated',
    });
  } catch {
    return NextResponse.json({ photos: fallbackPhotos(category), source: 'curated' });
  }
}
