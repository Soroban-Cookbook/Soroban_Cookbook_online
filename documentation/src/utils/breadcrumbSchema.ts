export interface BreadcrumbItem {
  label: string;
  href?: string;
  type?: string;
  unlisted?: boolean;
}

export interface DocMetadataInput {
  title?: string;
  permalink?: string;
}

export interface GenerateBreadcrumbSchemaOptions {
  breadcrumbs?: BreadcrumbItem[] | null;
  siteUrl?: string;
  baseUrl?: string;
  docMetadata?: DocMetadataInput;
  homeLabel?: string;
}

export interface ListItemSchema {
  '@type': 'ListItem';
  position: number;
  name: string;
  item: string;
}

export interface BreadcrumbListSchema {
  '@context': 'https://schema.org';
  '@type': 'BreadcrumbList';
  itemListElement: ListItemSchema[];
}

const DEFAULT_SITE_URL = 'https://soroban-cookbook.dev';

/**
 * Converts a relative path or full URL into a canonical absolute URL.
 */
export function toAbsoluteUrl(pathOrUrl: string, siteUrl: string = DEFAULT_SITE_URL): string {
  if (!pathOrUrl) {
    const cleanSite = (siteUrl || DEFAULT_SITE_URL).replace(/\/+$/, '');
    return `${cleanSite}/`;
  }

  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }

  const cleanSiteUrl = (siteUrl || DEFAULT_SITE_URL).replace(/\/+$/, '');
  const cleanPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${cleanSiteUrl}${cleanPath}`;
}

/**
 * Generates a Google Rich Results compliant BreadcrumbList JSON-LD schema.
 */
export function generateBreadcrumbSchema(
  options: GenerateBreadcrumbSchemaOptions = {},
): BreadcrumbListSchema {
  const siteUrl = options.siteUrl || DEFAULT_SITE_URL;
  const baseUrl = options.baseUrl || '/';
  const homeLabel = options.homeLabel || 'Home';

  const itemListElement: ListItemSchema[] = [
    {
      '@type': 'ListItem',
      position: 1,
      name: homeLabel,
      item: toAbsoluteUrl(baseUrl, siteUrl),
    },
  ];

  const rawBreadcrumbs = options.breadcrumbs;

  if (rawBreadcrumbs && rawBreadcrumbs.length > 0) {
    rawBreadcrumbs.forEach((crumb) => {
      let itemUrl: string | undefined;

      if (crumb.href) {
        itemUrl = toAbsoluteUrl(crumb.href, siteUrl);
      } else if (options.docMetadata?.permalink) {
        itemUrl = toAbsoluteUrl(options.docMetadata.permalink, siteUrl);
      }

      if (itemUrl && crumb.label) {
        itemListElement.push({
          '@type': 'ListItem',
          position: itemListElement.length + 1,
          name: crumb.label,
          item: itemUrl,
        });
      }
    });
  } else if (options.docMetadata?.permalink && options.docMetadata.permalink !== baseUrl) {
    itemListElement.push({
      '@type': 'ListItem',
      position: 2,
      name: options.docMetadata.title || 'Documentation',
      item: toAbsoluteUrl(options.docMetadata.permalink, siteUrl),
    });
  }

  // Ensure 1-based sequential position numbers
  itemListElement.forEach((item, index) => {
    item.position = index + 1;
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  };
}
