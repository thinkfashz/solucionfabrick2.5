import { NextRequest, NextResponse } from 'next/server';

const META_API_VERSION = 'v20.0';
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// CLP to USD approximate conversion (Meta requires USD in cents for daily budget when
// the ad account currency is USD). Update this rate periodically to reflect current FX.
// 1 USD ≈ 950 CLP (approximate)
const CLP_TO_USD_RATE = 950;

interface CreateAdPayload {
  titulo: string;
  texto: string;
  urlDestino: string;
  presupuestoCLP: number;
  fechaInicio: string;
  fechaFin: string;
  ubicacion: string;
  edadMin: number;
  edadMax: number;
  imageHash: string;
}

// Map Chilean region name to Meta geo key (country_code + region)
const LOCATION_MAP: Record<string, { country: string; region?: string }> = {
  santiago: { country: 'CL', region: 'Santiago Metropolitan Region' },
  valparaiso: { country: 'CL', region: 'Valparaiso' },
  bío_bío: { country: 'CL', region: 'Biobio' },
  maule: { country: 'CL', region: 'Maule' },
  la_araucania: { country: 'CL', region: 'La Araucania' },
  los_lagos: { country: 'CL', region: 'Los Lagos' },
  metropolitana: { country: 'CL', region: 'Santiago Metropolitan Region' },
  chile: { country: 'CL' },
};

async function metaPost(path: string, body: Record<string, unknown>, accessToken: string) {
  const res = await fetch(`${META_GRAPH_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: accessToken }),
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `Meta API error ${res.status} at ${path}`);
  }
  return json as Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;
  const pageId = process.env.META_PAGE_ID;

  if (!accessToken || !adAccountId) {
    return NextResponse.json(
      { error: 'Variables META_ACCESS_TOKEN o META_AD_ACCOUNT_ID no configuradas.' },
      { status: 503 }
    );
  }

  let payload: CreateAdPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  const {
    titulo,
    texto,
    urlDestino,
    presupuestoCLP,
    fechaInicio,
    fechaFin,
    ubicacion,
    edadMin,
    edadMax,
    imageHash,
  } = payload;

  if (!titulo || !texto || !urlDestino || !presupuestoCLP || !imageHash) {
    return NextResponse.json({ error: 'Faltan campos requeridos.' }, { status: 400 });
  }

  // Convert CLP to USD cents. NOTE: This assumes the Meta ad account is configured in USD.
  // For accounts in other currencies, remove this conversion and pass presupuestoCLP directly
  // as the daily_budget in the account currency (Meta accepts whole numbers in the smallest
  // unit of the account currency, e.g. CLP does not use cents).
  const dailyBudgetUsdCents = Math.round((presupuestoCLP / CLP_TO_USD_RATE) * 100);

  // Build targeting spec.
  // NOTE: Meta requires numeric region_id values for sub-country targeting. Since those IDs
  // require a lookup against the Meta Targeting Search API, all options here target at the
  // country level (CL). The UI still shows region labels for future implementation.
  const location = LOCATION_MAP[ubicacion] ?? { country: 'CL' };
  const geoLocations: Record<string, unknown> = { countries: [location.country] };
  if (location.region) {
    // Meta requires region_id for specific regions; using country-level targeting for simplicity
    // when a specific region is selected we still target by country to avoid region ID lookup
    geoLocations.countries = [location.country];
  }

  const targeting = {
    geo_locations: geoLocations,
    age_min: edadMin,
    age_max: edadMax,
  };

  try {
    // 1. Create Campaign
    const campaignName = `Fabrick — ${titulo} — ${new Date().toISOString().split('T')[0]}`;
    const campaign = await metaPost(
      `/act_${adAccountId}/campaigns`,
      {
        name: campaignName,
        objective: 'OUTCOME_TRAFFIC',
        status: 'ACTIVE',
        special_ad_categories: [],
      },
      accessToken
    );
    const campaignId = campaign.id as string;

    // 2. Create Ad Set
    const adSetName = `AdSet — ${titulo}`;
    const adSet = await metaPost(
      `/act_${adAccountId}/adsets`,
      {
        name: adSetName,
        campaign_id: campaignId,
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LINK_CLICKS',
        daily_budget: dailyBudgetUsdCents,
        start_time: new Date(fechaInicio).toISOString(),
        end_time: new Date(fechaFin).toISOString(),
        targeting,
        status: 'ACTIVE',
      },
      accessToken
    );
    const adSetId = adSet.id as string;

    // 3. Create Ad Creative
    const creativePayload: Record<string, unknown> = {
      name: `Creative — ${titulo}`,
      object_story_spec: {
        ...(pageId ? { page_id: pageId } : {}),
        link_data: {
          image_hash: imageHash,
          link: urlDestino,
          message: texto,
          name: titulo,
          call_to_action: { type: 'LEARN_MORE', value: { link: urlDestino } },
        },
      },
    };

    const creative = await metaPost(
      `/act_${adAccountId}/adcreatives`,
      creativePayload,
      accessToken
    );
    const creativeId = creative.id as string;

    // 4. Create Ad
    const ad = await metaPost(
      `/act_${adAccountId}/ads`,
      {
        name: titulo,
        adset_id: adSetId,
        creative: { creative_id: creativeId },
        status: 'ACTIVE',
      },
      accessToken
    );
    const adId = ad.id as string;

    const adLink = `https://www.facebook.com/adsmanager/manage/ads?act=${adAccountId}&selected_ad_ids=${adId}`;

    return NextResponse.json(
      {
        data: { adId, adLink, campaignId, adSetId },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('Meta create ad error:', err);
    const msg = err instanceof Error ? err.message : 'Error desconocido al crear anuncio en Meta';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
