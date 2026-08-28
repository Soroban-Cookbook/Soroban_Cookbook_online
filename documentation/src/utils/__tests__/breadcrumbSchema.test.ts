import { describe, it, expect } from 'vitest';
import { toAbsoluteUrl, generateBreadcrumbSchema, type BreadcrumbItem } from '../breadcrumbSchema';

describe('toAbsoluteUrl', () => {
  it('converts a relative path to absolute URL with default siteUrl', () => {
    expect(toAbsoluteUrl('/docs/patterns/authorization')).toBe(
      'https://soroban-cookbook.dev/docs/patterns/authorization',
    );
  });

  it('converts relative path without leading slash', () => {
    expect(toAbsoluteUrl('docs/concepts/gas')).toBe(
      'https://soroban-cookbook.dev/docs/concepts/gas',
    );
  });

  it('preserves existing absolute URLs', () => {
    expect(toAbsoluteUrl('https://example.com/custom-page')).toBe(
      'https://example.com/custom-page',
    );
    expect(toAbsoluteUrl('http://localhost:3000/docs')).toBe('http://localhost:3000/docs');
  });

  it('handles custom siteUrl with and without trailing slashes', () => {
    expect(toAbsoluteUrl('/docs', 'https://my-site.com/')).toBe('https://my-site.com/docs');
    expect(toAbsoluteUrl('/docs', 'https://my-site.com')).toBe('https://my-site.com/docs');
  });

  it('handles empty path or root path', () => {
    expect(toAbsoluteUrl('', 'https://soroban-cookbook.dev')).toBe('https://soroban-cookbook.dev/');
    expect(toAbsoluteUrl('/', 'https://soroban-cookbook.dev')).toBe(
      'https://soroban-cookbook.dev/',
    );
  });
});

describe('generateBreadcrumbSchema', () => {
  it('generates schema with Home as position 1 by default', () => {
    const schema = generateBreadcrumbSchema();
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema.itemListElement).toHaveLength(1);
    expect(schema.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://soroban-cookbook.dev/',
    });
  });

  it('generates multi-level breadcrumb items with correct sequential positions', () => {
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Patterns', href: '/docs/patterns/overview' },
      { label: 'Authorization', href: '/docs/patterns/authorization' },
    ];

    const schema = generateBreadcrumbSchema({
      breadcrumbs,
      siteUrl: 'https://soroban-cookbook.dev',
    });

    expect(schema.itemListElement).toHaveLength(3);
    expect(schema.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://soroban-cookbook.dev/',
    });
    expect(schema.itemListElement[1]).toEqual({
      '@type': 'ListItem',
      position: 2,
      name: 'Patterns',
      item: 'https://soroban-cookbook.dev/docs/patterns/overview',
    });
    expect(schema.itemListElement[2]).toEqual({
      '@type': 'ListItem',
      position: 3,
      name: 'Authorization',
      item: 'https://soroban-cookbook.dev/docs/patterns/authorization',
    });
  });

  it('falls back to docMetadata when breadcrumb array is empty', () => {
    const schema = generateBreadcrumbSchema({
      breadcrumbs: [],
      docMetadata: {
        title: 'Gas and Resources',
        permalink: '/docs/concepts/gas-and-resources',
      },
    });

    expect(schema.itemListElement).toHaveLength(2);
    expect(schema.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://soroban-cookbook.dev/',
    });
    expect(schema.itemListElement[1]).toEqual({
      '@type': 'ListItem',
      position: 2,
      name: 'Gas and Resources',
      item: 'https://soroban-cookbook.dev/docs/concepts/gas-and-resources',
    });
  });

  it('handles category breadcrumb without href using docMetadata permalink as fallback', () => {
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Category Without Link' },
      { label: 'Child Doc', href: '/docs/category/child' },
    ];

    const schema = generateBreadcrumbSchema({
      breadcrumbs,
      docMetadata: {
        title: 'Child Doc',
        permalink: '/docs/category/child',
      },
    });

    expect(schema.itemListElement).toHaveLength(3);
    expect(schema.itemListElement[1].name).toBe('Category Without Link');
    expect(schema.itemListElement[1].item).toBe('https://soroban-cookbook.dev/docs/category/child');
    expect(schema.itemListElement[2].name).toBe('Child Doc');
    expect(schema.itemListElement[2].item).toBe('https://soroban-cookbook.dev/docs/category/child');
  });

  it('supports custom homeLabel, baseUrl, and siteUrl', () => {
    const breadcrumbs: BreadcrumbItem[] = [{ label: 'Guide', href: '/docs/guide' }];

    const schema = generateBreadcrumbSchema({
      breadcrumbs,
      homeLabel: 'Inicio',
      baseUrl: '/docs/',
      siteUrl: 'https://custom-domain.org',
    });

    expect(schema.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'Inicio',
      item: 'https://custom-domain.org/docs/',
    });
    expect(schema.itemListElement[1]).toEqual({
      '@type': 'ListItem',
      position: 2,
      name: 'Guide',
      item: 'https://custom-domain.org/docs/guide',
    });
  });
});
