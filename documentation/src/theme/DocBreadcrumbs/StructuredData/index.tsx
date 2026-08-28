import React, { type ReactNode } from 'react';
import Head from '@docusaurus/Head';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useSidebarBreadcrumbs, useDoc } from '@docusaurus/plugin-content-docs/client';
import { generateBreadcrumbSchema, type BreadcrumbItem } from '@site/src/utils/breadcrumbSchema';

export type Props = {
  breadcrumbs?: BreadcrumbItem[] | null;
};

/**
 * Custom theme swizzle for DocBreadcrumbs/StructuredData.
 * Injects BreadcrumbList JSON-LD schema into documentation page head tags.
 */
export default function DocBreadcrumbsStructuredData(props: Props): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const sidebarFromHook = useSidebarBreadcrumbs() as BreadcrumbItem[] | null | undefined;
  const docObj = useDoc();

  const sidebarBreadcrumbs =
    props.breadcrumbs !== undefined ? props.breadcrumbs : (sidebarFromHook ?? null);

  const docMetadata = docObj?.metadata
    ? {
        title: docObj.metadata.title,
        permalink: docObj.metadata.permalink,
      }
    : undefined;

  const schema = generateBreadcrumbSchema({
    breadcrumbs: sidebarBreadcrumbs,
    siteUrl: siteConfig.url,
    baseUrl: siteConfig.baseUrl,
    docMetadata,
  });

  return (
    <Head>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Head>
  );
}
