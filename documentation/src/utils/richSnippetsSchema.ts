/**
 * Structured-data (JSON-LD) schema builders for rich snippets (issue #337).
 *
 * Every builder returns a plain JSON-serialisable object following
 * schema.org, ready to be stringified into a
 * `<script type="application/ld+json">` tag by a theme component.
 *
 * Validation notes (Google Rich Results):
 * - `FAQPage` requires at least one `Question`, each with exactly one
 *   non-empty `acceptedAnswer`.
 * - `TechArticle` (an `Article` subtype) requires a headline; `datePublished`
 *   and `dateModified` use ISO 8601 when provided.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqPageSchema {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  mainEntity: Array<{
    '@type': 'Question';
    name: string;
    acceptedAnswer: { '@type': 'Answer'; text: string };
  }>;
}

export interface TechArticleSchema {
  '@context': 'https://schema.org';
  '@type': 'TechArticle';
  headline: string;
  description?: string;
  datePublished?: string;
  dateModified?: string;
  author?: { '@type': 'Organization'; name: string };
  articleSection?: string;
  keywords?: string;
  mainEntityOfPage?: string;
}

/** Site name used for the default TechArticle author organisation. */
export const SITE_NAME = 'Soroban Cookbook';

/**
 * Builds an `FAQPage` schema from question/answer pairs.
 *
 * Empty questions or answers are dropped rather than emitted, so a partially
 * filled frontmatter can never produce Rich-Results errors.
 */
export function generateFaqPageSchema(items: FaqItem[] | undefined | null): FaqPageSchema {
  const mainEntity = (items ?? [])
    .filter((item) => item.question.trim() !== '' && item.answer.trim() !== '')
    .map((item) => ({
      '@type': 'Question' as const,
      name: item.question,
      acceptedAnswer: { '@type': 'Answer' as const, text: item.answer },
    }));

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity,
  };
}

/**
 * Builds a `TechArticle` schema for a documentation page.
 *
 * Dates must already be ISO 8601 (`YYYY-MM-DD`); anything else is dropped so
 * we never emit a malformed date that would fail the Rich Results test.
 */
export function generateTechArticleSchema(options: {
  title: string;
  description?: string;
  date?: string;
  lastUpdated?: string;
  permalink?: string;
  section?: string;
  keywords?: string[];
}): TechArticleSchema {
  const isoDate = (value: string | undefined): string | undefined =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;

  const schema: TechArticleSchema = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: options.title,
    author: { '@type': 'Organization', name: SITE_NAME },
  };

  if (options.description && options.description.trim() !== '') {
    schema.description = options.description;
  }

  const published = isoDate(options.date);
  if (published) {
    schema.datePublished = published;
  }

  const modified = isoDate(options.lastUpdated);
  if (modified) {
    schema.dateModified = modified;
  }

  if (options.section && options.section.trim() !== '') {
    schema.articleSection = options.section;
  }

  if (options.keywords && options.keywords.length > 0) {
    schema.keywords = options.keywords.join(', ');
  }

  if (options.permalink) {
    schema.mainEntityOfPage = toAbsoluteUrl(options.permalink);
  }

  return schema;
}

const DEFAULT_SITE_URL = 'https://soroban-cookbook.dev';

/** Converts a site-relative permalink into an absolute URL. */
export function toAbsoluteUrl(path: string, siteUrl: string = DEFAULT_SITE_URL): string {
  const cleanSite = (siteUrl || DEFAULT_SITE_URL).replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanSite}${cleanPath}`;
}
