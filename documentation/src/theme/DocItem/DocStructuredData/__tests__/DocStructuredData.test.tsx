import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import DocStructuredData from '../index';

vi.mock('@docusaurus/useDocusaurusContext', () => ({
  default: () => ({
    siteConfig: {
      url: 'https://soroban-cookbook.dev',
      baseUrl: '/',
    },
  }),
}));

const mockUseDoc = vi.fn();

vi.mock('@docusaurus/plugin-content-docs/client', () => ({
  useDoc: () => mockUseDoc(),
}));

vi.mock('@docusaurus/Head', () => ({
  default: (props: { children?: React.ReactNode }) => (
    <div data-testid="docusaurus-head">{props?.children}</div>
  ),
}));

function getSchema(head: HTMLElement, type: string): Record<string, unknown> {
  const scripts = Array.from(head.querySelectorAll('script[type="application/ld+json"]'));
  const match = scripts.find((s) => {
    const parsed = JSON.parse(s.textContent || '{}') as Record<string, unknown>;
    return parsed['@type'] === type;
  });
  expect(match, `expected a ${type} script`).toBeDefined();
  return JSON.parse(match!.textContent || '{}') as Record<string, unknown>;
}

describe('DocStructuredData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDoc.mockReturnValue({
      metadata: {
        title: 'Gas and Resources',
        description: 'How computation and storage fees work',
        permalink: '/docs/concepts/gas-and-resources',
        sidebar: 'concepts',
      },
      frontMatter: {},
    });
  });

  it('injects a TechArticle schema derived from doc metadata', () => {
    const { getByTestId } = render(<DocStructuredData />);
    const schema = getSchema(getByTestId('docusaurus-head'), 'TechArticle');

    expect(schema['@context']).toBe('https://schema.org');
    expect(schema.headline).toBe('Gas and Resources');
    expect(schema.description).toBe('How computation and storage fees work');
    expect(schema.articleSection).toBe('concepts');
    expect(schema.mainEntityOfPage).toBe(
      'https://soroban-cookbook.dev/docs/concepts/gas-and-resources',
    );
  });

  it('injects a FAQPage schema when faq frontmatter is present', () => {
    mockUseDoc.mockReturnValue({
      metadata: {
        title: 'Environment Setup',
        description: 'Set up your environment',
        permalink: '/docs/getting-started/setup',
      },
      frontMatter: {
        faq: [{ question: 'How do I install Rust?', answer: 'Use rustup.' }],
      },
    });

    const { getByTestId } = render(<DocStructuredData />);
    const schema = getSchema(getByTestId('docusaurus-head'), 'FAQPage');

    expect(schema['@type']).toBe('FAQPage');
    const mainEntity = schema.mainEntity as Array<Record<string, unknown>>;
    expect(mainEntity).toHaveLength(1);
    expect(mainEntity[0].name).toBe('How do I install Rust?');
  });

  it('omits the FAQPage schema when there is no faq frontmatter', () => {
    const { getByTestId } = render(<DocStructuredData />);
    const head = getByTestId('docusaurus-head');
    const scripts = Array.from(head.querySelectorAll('script[type="application/ld+json"]'));
    const types = scripts.map(
      (s) => (JSON.parse(s.textContent || '{}') as Record<string, unknown>)['@type'],
    );
    expect(types).toContain('TechArticle');
    expect(types).not.toContain('FAQPage');
  });

  it('omits the FAQPage schema when every faq entry is empty', () => {
    mockUseDoc.mockReturnValue({
      metadata: { title: 't', permalink: '/docs/t' },
      frontMatter: { faq: [{ question: '', answer: '' }] },
    });

    const { getByTestId } = render(<DocStructuredData />);
    const scripts = Array.from(
      getByTestId('docusaurus-head').querySelectorAll('script[type="application/ld+json"]'),
    );
    const types = scripts.map(
      (s) => (JSON.parse(s.textContent || '{}') as Record<string, unknown>)['@type'],
    );
    expect(types).not.toContain('FAQPage');
  });

  it('renders nothing without doc metadata', () => {
    mockUseDoc.mockReturnValue({});
    const { container } = render(<DocStructuredData />);
    expect(container).toBeEmptyDOMElement();
  });

  it('emits valid JSON in every script tag', () => {
    mockUseDoc.mockReturnValue({
      metadata: { title: 't', permalink: '/docs/t' },
      frontMatter: { faq: [{ question: 'q?', answer: 'a.' }] },
    });

    const { getByTestId } = render(<DocStructuredData />);
    const scripts = Array.from(
      getByTestId('docusaurus-head').querySelectorAll('script[type="application/ld+json"]'),
    );
    expect(scripts.length).toBeGreaterThan(0);
    for (const script of scripts) {
      expect(() => JSON.parse(script.textContent || '')).not.toThrow();
    }
  });
});
