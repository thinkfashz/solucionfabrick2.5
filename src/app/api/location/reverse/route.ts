import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CHILE_BOUNDS = {
  minLat: -56,
  maxLat: -17,
  minLon: -76,
  maxLon: -66,
};

function validCoordinate(value: string | null, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = validCoordinate(url.searchParams.get('lat'), CHILE_BOUNDS.minLat, CHILE_BOUNDS.maxLat);
  const lon = validCoordinate(url.searchParams.get('lon'), CHILE_BOUNDS.minLon, CHILE_BOUNDS.maxLon);

  if (lat === null || lon === null) {
    return NextResponse.json({ error: 'Coordenadas inválidas o fuera de Chile.' }, { status: 400 });
  }

  try {
    const endpoint = new URL('https://nominatim.openstreetmap.org/reverse');
    endpoint.searchParams.set('format', 'jsonv2');
    endpoint.searchParams.set('lat', String(lat));
    endpoint.searchParams.set('lon', String(lon));
    endpoint.searchParams.set('addressdetails', '1');
    endpoint.searchParams.set('accept-language', 'es');

    const response = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SolucionesFabrick/1.0 (contacto@solucionesfabrick.com)',
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) throw new Error(`Reverse geocoding ${response.status}`);
    const data = (await response.json()) as {
      display_name?: string;
      address?: Record<string, string | undefined>;
    };
    const address = data.address ?? {};

    return NextResponse.json({
      displayName: data.display_name ?? '',
      road: address.road || address.pedestrian || address.residential || '',
      houseNumber: address.house_number || '',
      commune: address.city || address.town || address.village || address.municipality || address.county || '',
      region: address.state || address.region || '',
      postcode: address.postcode || '',
      latitude: lat,
      longitude: lon,
    });
  } catch {
    return NextResponse.json(
      {
        displayName: '',
        region: '',
        latitude: lat,
        longitude: lon,
        warning: 'No fue posible convertir la ubicación en una dirección.',
      },
      { status: 200 },
    );
  }
}
