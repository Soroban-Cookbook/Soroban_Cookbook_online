import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/design-tokens.css'), 'utf8');

describe('design tokens typography scale', () => {
  it('uses clamp-based responsive font tokens with a mobile-safe base size', () => {
    expect(css).toContain('--font-size-base: clamp(1rem');
    expect(css).toContain('--font-size-sm: clamp(0.875rem');
    expect(css).toContain('--font-size-lg: clamp(1.125rem');
    expect(css).toContain('--font-size-xl: clamp(1.25rem');
    expect(css).toContain('--font-size-2xl: clamp(1.5rem');
    expect(css).toContain('--font-size-3xl: clamp(1.875rem');
    expect(css).toContain('--font-size-4xl: clamp(2.25rem');
    expect(css).toContain('--font-size-5xl: clamp(3rem');
    expect(css).toContain('--font-size-6xl: clamp(3.75rem');
    expect(css).toContain('--font-size-7xl: clamp(4.5rem');
  });
});
