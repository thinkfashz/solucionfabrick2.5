import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getPublicProjectEntry, type PublicProjectSource } from '@/lib/projectsServer';
import type { FabrickProject } from '@/lib/projects';

const BASE_URL = 'https://www.solucionesfabrick.com';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

function projectImages(project: FabrickProject | null) {
  if (!project) return [];
  return Array.from(new Set([project.hero_image, ...(project.gallery || [])].filter(Boolean)));
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { id } = await params;
  const { project, source } = await getPublicProjectEntry(id);
  const canonical = `${BASE_URL}/proyectos/${encodeURIComponent(id)}`;

  if (!project) {
    return {
      title: 'Proyecto no encontrado | Soluciones Fabrick',
      robots: { index: false, follow: false },
      alternates: { canonical },
    };
  }

  const verified = source === 'db';
  const title = verified
    ? `${project.title} | Proyectos Soluciones Fabrick`
    : `Ejemplo referencial: ${project.title} | Soluciones Fabrick`;
  const baseDescription = project.summary || project.description || `Proyecto ${project.category}.`;
  const description = verified
    ? baseDescription
    : `Ficha demostrativa y referencia visual. No corresponde a una obra verificada de Soluciones Fabrick. ${baseDescription}`;
  const images = projectImages(project);

  return {
    title,
    description,
    alternates: { canonical },
    robots: verified
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        }
      : {
          index: false,
          follow: true,
          googleBot: {
            index: false,
            follow: true,
            'max-image-preview': 'none',
            'max-snippet': 0,
          },
        },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
      siteName: 'Soluciones Fabrick',
      locale: 'es_CL',
      images: images.slice(0, verified ? 6 : 1).map((url, index) => ({
        url,
        alt: verified
          ? `${project.title}${index ? ` — imagen ${index + 1}` : ''}`
          : `${project.title} — imagen referencial`,
      })),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: images[0] ? [images[0]] : undefined,
    },
    other: {
      'pinterest-rich-pin': verified ? 'true' : 'false',
      'fabrick-portfolio-source': verified ? 'verified' : 'demo',
    },
  };
}

function projectJsonLd(project: FabrickProject, source: PublicProjectSource) {
  const canonical = `${BASE_URL}/proyectos/${encodeURIComponent(project.id)}`;
  const images = projectImages(project);
  const verified = source === 'db';

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: 'Proyectos', item: `${BASE_URL}/proyectos` },
          { '@type': 'ListItem', position: 3, name: verified ? project.title : `Referencia: ${project.title}`, item: canonical },
        ],
      },
      {
        '@type': 'CreativeWork',
        '@id': `${canonical}#proyecto`,
        url: canonical,
        name: verified ? project.title : `Ejemplo referencial: ${project.title}`,
        headline: verified ? project.title : `Ejemplo referencial: ${project.title}`,
        description: verified
          ? (project.description || project.summary)
          : `Ficha demostrativa y referencia visual. No corresponde a una obra verificada de Soluciones Fabrick. ${project.description || project.summary}`,
        abstract: project.summary,
        image: images,
        dateCreated: verified ? (project.created_at || String(project.year || '')) : undefined,
        dateModified: verified ? (project.updated_at || project.created_at || undefined) : undefined,
        inLanguage: 'es-CL',
        genre: project.category,
        spatialCoverage: verified ? project.location : undefined,
        about: [project.category, ...(project.materials || []).slice(0, 8)],
        educationalUse: verified ? undefined : 'Demonstration',
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
  const { project, source } = await getPublicProjectEntry(id);

  return (
    <>
      {project ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(projectJsonLd(project, source)).replace(/</g, '\\u003c') }}
        />
      ) : null}
      {children}
    </>
  );
}
