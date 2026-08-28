import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import DocBreadcrumbsStructuredData from '../index';

vi.mock('@docusaurus/useDocusaurusContext', () => ({
  default: () => ({
    siteConfig: {
      url: 'https://soroban-cookbook.dev',
      baseUrl: '/',
    },
  }),
}));

vi.mock('@docusaurus/plugin-content-docs/client', () => ({
  useSidebarBreadcrumbs: () => [
    { label: 'Concepts', href: '/docs/concepts/introduction' },
    { label: 'Gas and Resources', href: '/docs/concepts/gas-and-resources' },
  ],
  useDoc: () => ({
    metadata: {
      title: 'Gas and Resources',
      permalink: '/docs/concepts/gas-and-resources',
    },
  }),
}));

vi.mock('@docusaurus/Head', () => ({
  default: (props: { children?: React.ReactNode }) => (
    <div data-testid="docusaurus-head">{props?.children}</div>
  ),
}));

describe('DocBreadcrumbsStructuredData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders JSON-LD script tag inside Head with BreadcrumbList schema', () => {
    const { getByTestId } = render(<DocBreadcrumbsStructuredData />);

    const head = getByTestId('docusaurus-head');
    expect(head).toBeInTheDocument();

    const script = head.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();

    const schema = JSON.parse(script?.textContent || '{}');
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema.itemListElement).toHaveLength(3);
    expect(schema.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://soroban-cookbook.dev/',
    });
    expect(schema.itemListElement[1].name).toBe('Concepts');
    expect(schema.itemListElement[2].name).toBe('Gas and Resources');
  });

  it('accepts explicit props for breadcrumbs overriding sidebar hook', () => {
    const customBreadcrumbs = [{ label: 'Patterns', href: '/docs/patterns/overview' }];

    const { getByTestId } = render(
      <DocBreadcrumbsStructuredData breadcrumbs={customBreadcrumbs} />,
    );

    const head = getByTestId('docusaurus-head');
    const script = head.querySelector('script[type="application/ld+json"]');
    const schema = JSON.parse(script?.textContent || '{}');

    expect(schema.itemListElement).toHaveLength(2);
    expect(schema.itemListElement[1].name).toBe('Patterns');
    expect(schema.itemListElement[1].item).toBe(
      'https://soroban-cookbook.dev/docs/patterns/overview',
    );
  });
});
