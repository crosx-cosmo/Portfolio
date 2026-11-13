import React from 'react';
import { listCmsProjects } from '@/lib/cms-store';
import { SELECTED_PROJECTS, type ProjectCaseStudy } from '@/lib/studio-data';
import { StudioClient } from '@/components/StudioClient';

export const dynamic = 'force-dynamic';

export default async function CrosxDevStudioPage() {
  let projects: ProjectCaseStudy[] = SELECTED_PROJECTS;
  try {
    const cmsProjects = await listCmsProjects({ includeUnpublished: false });
    if (cmsProjects.length > 0) {
      projects = cmsProjects;
    }
  } catch {
    // Fallback gracefully to SELECTED_PROJECTS if storage is initializing
  }

  const structuredDataJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['ProfessionalService', 'Organization'],
        '@id': 'https://crosx.in/#organization',
        name: 'CROSX DEV STUDIO®',
        alternateName: 'CrosX Dev Studio',
        url: 'https://crosx.in',
        description:
          'Flagship full-stack web, mobile & cloud engineering agency founded by IRON CLAD. Architecting high-velocity Next.js 15, React Native + Expo, NestJS, and Neon Serverless PostgreSQL platforms.',
        founder: {
          '@type': 'Person',
          name: 'IRON CLAD',
          jobTitle: 'Founder & Principal Systems Architect',
        },
        knowsAbout: [
          'Next.js 15 App Router',
          'React 19 & TypeScript',
          'React Native & Expo SDK 52',
          'NestJS & Node.js Microservices',
          'Neon Serverless PostgreSQL & Drizzle ORM',
          'Enterprise SaaS Architecture',
        ],
        sameAs: ['https://crosx.in', 'https://rca.crosx.in', 'https://sohanpipeline.in'],
      },
      {
        '@type': 'WebSite',
        '@id': 'https://crosx.in/#website',
        url: 'https://crosx.in',
        name: 'CROSX DEV STUDIO® — Full-Stack Web, Mobile & Cloud Engineering',
        publisher: { '@id': 'https://crosx.in/#organization' },
        inLanguage: 'en-US',
      },
      {
        '@type': 'ItemList',
        '@id': 'https://crosx.in/#portfolio',
        name: 'CROSX DEV STUDIO® Flagship Production Systems',
        itemListElement: projects.map((proj, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'CreativeWork',
            name: proj.title,
            url: proj.url,
            description: proj.summary,
            keywords: proj.stack.join(', '),
          },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredDataJsonLd) }}
      />
      <StudioClient initialProjects={projects} />
    </>
  );
}
