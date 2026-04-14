import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get('lat');
  const lon = request.nextUrl.searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat y lon son requeridos' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&addressdetails=1`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'fabrick-store-checkout/1.0',
        },
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'No fue posible resolver la dirección.' }, { status: 502 });
    }

    const data = await response.json();
    const address = data?.address ?? {};

    return NextResponse.json(
      {
        data: {
          displayName: data?.display_name ?? '',
          city: address?.city ?? address?.town ?? address?.village ?? '',
          region: address?.state ?? '',
          country: address?.country ?? '',
          postcode: address?.postcode ?? '',
          road: address?.road ?? '',
          houseNumber: address?.house_number ?? '',
          lat,
          lon,
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ error: 'Error consultando servicio de geolocalización.' }, { status: 500 });
  }
}
