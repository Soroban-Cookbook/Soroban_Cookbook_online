import { describe, it, expect } from 'vitest';
import {
  generateFaqPageSchema,
  generateTechArticleSchema,
  toAbsoluteUrl,
  type FaqItem,
} from '../richSnippetsSchema';

describe('generateFaqPageSchema', () => {
  it('builds a valid FAQPage with question/answer pairs', () => {
    const items: FaqItem[] = [
      { question: 'How do I install Rust?', answer: 'Run the rustup installer script.' },
      { question: 'Which target is required?', answer: 'wasm32v1-none.' },
    ];

    const schema = generateFaqPageSchema(items);

    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('FAQPage');
    expect(schema.mainEntity).toHaveLength(2);
    expect(schema.mainEntity[0]).toEqual({
      '@type': 'Question',
      name: 'How do I install Rust?',
      acceptedAnswer: { '@type': 'Answer', text: 'Run the rustup installer script.' },
    });
  });

  it('drops empty questions and answers', () => {
    const items: FaqItem[] = [
      { question: '', answer: 'orphan answer' },
      { question: 'valid question', answer: '' },
      { question: '   ', answer: 'whitespace question' },
      { question: 'kept', answer: 'kept answer' },
    ];

    const schema = generateFaqPageSchema(items);
    expect(schema.mainEntity).toHaveLength(1);
    expect(schema.mainEntity[0].name).toBe('kept');
  });

  it('returns an empty mainEntity for undefined input', () => {
    const schema = generateFaqPageSchema(undefined);
    expect(schema['@type']).toBe('FAQPage');
    expect(schema.mainEntity).toEqual([]);
  });

  it('returns an empty mainEntity for null input', () => {
    const schema = generateFaqPageSchema(null);
    expect(schema.mainEntity).toEqual([]);
  });

  it('is JSON-serialisable', () => {
    const schema = generateFaqPageSchema([{ question: 'q?', answer: 'a.' }]);
    expect(() => JSON.stringify(schema)).not.toThrow();
    const round = JSON.parse(JSON.stringify(schema));
    expect(round).toEqual(schema);
  });
});

describe('generateTechArticleSchema', () => {
  it('builds a TechArticle with headline and default author', () => {
    const schema = generateTechArticleSchema({ title: 'Environment Setup' });

    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('TechArticle');
    expect(schema.headline).toBe('Environment Setup');
    expect(schema.author).toEqual({ '@type': 'Organization', name: 'Soroban Cookbook' });
  });

  it('includes description, section and keywords', () => {
    const schema = generateTechArticleSchema({
      title: 'Storage',
      description: 'How Soroban storage works',
      section: 'concepts',
      keywords: ['storage', 'ttl'],
    });

    expect(schema.description).toBe('How Soroban storage works');
    expect(schema.articleSection).toBe('concepts');
    expect(schema.keywords).toBe('storage, ttl');
  });

  it('keeps well-formed ISO dates', () => {
    const schema = generateTechArticleSchema({
      title: 't',
      date: '2026-09-30',
      lastUpdated: '2026-10-01',
    });
    expect(schema.datePublished).toBe('2026-09-30');
    expect(schema.dateModified).toBe('2026-10-01');
  });

  it('drops malformed dates instead of emitting them', () => {
    const schema = generateTechArticleSchema({
      title: 't',
      date: 'September 30, 2026',
      lastUpdated: '30/09/2026',
    });
    expect(schema.datePublished).toBeUndefined();
    expect(schema.dateModified).toBeUndefined();
  });

  it('drops empty description and section', () => {
    const schema = generateTechArticleSchema({ title: 't', description: '   ', section: '' });
    expect(schema.description).toBeUndefined();
    expect(schema.articleSection).toBeUndefined();
  });

  it('resolves mainEntityOfPage to an absolute URL', () => {
    const schema = generateTechArticleSchema({
      title: 't',
      permalink: '/docs/concepts/storage',
    });
    expect(schema.mainEntityOfPage).toBe('https://soroban-cookbook.dev/docs/concepts/storage');
  });
});

describe('toAbsoluteUrl', () => {
  it('prefixes the default site URL', () => {
    expect(toAbsoluteUrl('/docs/getting-started/setup')).toBe(
      'https://soroban-cookbook.dev/docs/getting-started/setup',
    );
  });

  it('adds a leading slash when missing', () => {
    expect(toAbsoluteUrl('docs/index')).toBe('https://soroban-cookbook.dev/docs/index');
  });

  it('uses a custom site URL and strips trailing slashes', () => {
    expect(toAbsoluteUrl('/docs', 'https://my-site.com/')).toBe('https://my-site.com/docs');
  });
});
