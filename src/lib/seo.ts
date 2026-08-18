export const SITE_URL = 'https://www.solucionesfabrick.com';

export const FABRICK_KEYWORD_CLUSTERS = {
  marca: [
    'Soluciones Fabrick',
    'Fabrick Construcción',
    'Fabrick remodelación',
  ],
  construccion: [
    'construcción de casas Maule',
    'construcción de casas Linares',
    'construcción de viviendas Talca',
    'construcción llave en mano Chile',
    'construir casa por etapas',
    'ampliación de vivienda Maule',
    'estructura Metalcon Linares',
  ],
  remodelacion: [
    'remodelación de casas Maule',
    'remodelar baño Linares',
    'remodelar cocina Talca',
    'transformar espacios del hogar',
    'renovación de vivienda Chile',
    'cambio de piso y porcelanato',
    'cambio de techumbre',
  ],
  reparacion: [
    'reparaciones del hogar Maule',
    'reparar filtraciones y techumbre',
    'reparación de radier',
    'reparar instalación eléctrica domiciliaria',
    'reparar gasfitería Linares',
    'reemplazar revestimiento exterior',
    'renovar y reparar casa',
  ],
  especialidades: [
    'radier Maule',
    'fundaciones Linares',
    'gasfitería Maule',
    'electricista Linares',
    'instalación aire acondicionado Maule',
    'techumbre y canaletas Talca',
    'revestimiento y aislación térmica',
  ],
  local: [
    'construcción Región del Maule',
    'remodelación Linares',
    'maestro constructor Longaví',
    'reparaciones Talca',
    'construcción Santiago',
  ],
} as const;

export const FABRICK_SEO_KEYWORDS = Array.from(
  new Set(Object.values(FABRICK_KEYWORD_CLUSTERS).flat()),
);

type SocialLinks = {
  facebook?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
};

function validExternalUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function buildFabrickHomeJsonLd({ socialLinks = {} }: { socialLinks?: SocialLinks } = {}) {
  const sameAs = Array.from(new Set([
    'https://www.instagram.com/solucionesfabrick/',
    validExternalUrl(socialLinks.facebook),
    validExternalUrl(socialLinks.instagram),
    validExternalUrl(socialLinks.tiktok),
  ].filter((value): value is string => Boolean(value))));

  const organizationId = `${SITE_URL}/#organization`;
  const businessId = `${SITE_URL}/#local-business`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: 'Soluciones Fabrick',
        url: SITE_URL,
        logo: `${SITE_URL}/brand/soluciones-fabrick.svg`,
        image: `${SITE_URL}/opengraph-image`,
        description: 'Construcción, remodelación, reparación e instalaciones para viviendas y espacios del hogar.',
        sameAs,
      },
      {
        '@type': 'HomeAndConstructionBusiness',
        '@id': businessId,
        name: 'Soluciones Fabrick',
        url: SITE_URL,
        parentOrganization: { '@id': organizationId },
        image: `${SITE_URL}/opengraph-image`,
        telephone: '+56930121625',
        priceRange: '$$',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Linares',
          addressRegion: 'Maule',
          addressCountry: 'CL',
        },
        areaServed: [
          { '@type': 'AdministrativeArea', name: 'Región del Maule, Chile' },
          { '@type': 'City', name: 'Linares, Chile' },
          { '@type': 'City', name: 'Talca, Chile' },
          { '@type': 'City', name: 'Santiago, Chile' },
        ],
        openingHoursSpecification: [{
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '08:00',
          closes: '18:00',
        }],
        knowsAbout: FABRICK_SEO_KEYWORDS,
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Servicios de Soluciones Fabrick',
          itemListElement: [
            'Construcción de viviendas',
            'Remodelación de casas, baños y cocinas',
            'Ampliaciones y estructuras Metalcon',
            'Radier, fundaciones y techumbre',
            'Gasfitería, electricidad y climatización',
            'Reparaciones, revestimientos y terminaciones',
          ].map((name) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name } })),
        },
      },
    ],
  };
}
