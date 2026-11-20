/**
 * DocItem/DocStructuredData — injects JSON-LD rich-snippet schema into every
 * documentation page head (issue #337):
 *
 * - `TechArticle` from doc metadata and frontmatter (`date`, `keywords`).
 * - `FAQPage` from `faq` frontmatter, when present.
 *
 * This component is rendered by the swizzled `DocItem/Content` wrapper, so
 * it needs no separate swizzle registration.
 */

import React, { type ReactNode } from 'react';
import Head from '@docusaurus/Head';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import {
  generateFaqPageSchema,
  generateTechArticleSchema,
  type FaqItem,
} from '@site/src/utils/richSnippetsSchema';

type DocFrontMatter = {
  date?: string;
  last_updated?: string;
  keywords?: string[];
  faq?: FaqItem[];
};

/**
 * Renders one or two JSON-LD script tags: TechArticle always (doc pages are
 * technical articles), FAQPage only when the page declares `faq` frontmatter
 * with at least one non-empty question/answer pair.
 */
export default function DocStructuredData(): ReactNode {
  const docObj = useDoc();
  const metadata = docObj?.metadata;
  const frontMatter = (docObj?.frontMatter ?? {}) as DocFrontMatter;

  if (!metadata?.title) {
    return null;
  }

  const articleSchema = generateTechArticleSchema({
    title: metadata.title,
    description: metadata.description,
    date: frontMatter.date,
    lastUpdated: frontMatter.last_updated,
    permalink: metadata.permalink,
    section: metadata.sidebar,
    keywords: frontMatter.keywords,
  });

  const faqSchema = generateFaqPageSchema(frontMatter.faq);
  const hasFaq = faqSchema.mainEntity.length > 0;

  return (
    <Head>
      <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
      {hasFaq ? <script type="application/ld+json">{JSON.stringify(faqSchema)}</script> : null}
    </Head>
  );
}
