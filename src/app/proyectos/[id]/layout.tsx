import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getPublicProject } from '@/lib/projectsServer';

const BASE_URL = 'https://www.solucionesfabrick.com';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

function projectImages(project: Awaited<ReturnType<typeof getPublicProject>>) {
  if (!project) return [];
  return Array.from(new Set([project.hero_image, ...(project.gallery || [])].filter(Boolean)));
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getPublicProject(id);
  const canonical = `${BASE_URL}/proyectos/${encodeURIComponent(id)}`;

  if (!project) {
    return {
      title: 'Proyecto no encontrado | Soluciones Fabrick',
      robots: { index: false, follow: false },
      alternates: { canonical },
    };
  }

  const title = `${project.title} | Proyectos Soluciones Fabrick`;
  const description = project.summary || project.description || `Proyecto ${project.category} en ${project.location}.`;
  const images = projectImages(project);

  return {
    title,
    description,
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
      siteName: 'Soluciones Fabrick',
      locale: 'es_CL',
      images: images.slice(0, 6).map((url, index) => ({
        url,
        alt: `${project.title}${index ? ` — imagen ${index + 1}` : ''}`,
      })),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: images[0] ? [images[0]] : undefined,
    },
    other: {
      'pinterest-rich-pin': 'true',
    },
  };
}

function projectJsonLd(project: NonNullable<Awaited<ReturnType<typeof getPublicProject>>>) {
  const canonical = `${BASE_URL}/proyectos/${encodeURIComponent(project.id)}`;
  const images = projectImages(project);

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: 'Proyectos', item: `${BASE_URL}/proyectos` },
          { '@type': 'ListItem', position: 3, name: project.title, item: canonical },
        ],
      },
      {
        '@type': 'CreativeWork',
        '@id': `${canonical}#proyecto`,
        url: canonical,
        name: project.title,
        headline: project.title,
        description: project.description || project.summary,
        abstract: project.summary,
        image: images,
        dateCreated: project.created_at || String(project.year || ''),
        dateModified: project.updated_at || project.created_at || undefined,
        inLanguage: 'es-CL',
        genre: project.category,
        spatialCoverage: project.location,
        about: [project.category, ...(project.materials || []).slice(0, 8)],
        creator: {
          '@type': 'Organization',
          name: 'Soluciones Fabrick',
          url: BASE_URL,
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonical,
        },
      },
    ],
  };
}

export default async function ProjectLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  const project = await getPublicProject(id);

  return (
    <>
      {project ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(projectJsonLd(project)).replace(/</g, '\\u003c') }}
        />
      ) : null}
      {children}
    </>
  );
}
