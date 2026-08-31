import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OptimizedImage from '../OptimizedImage';

describe('OptimizedImage', () => {
  const defaultProps = {
    src: 'https://example.com/image.jpg',
    alt: 'A descriptive alt text',
  };

  it('renders the image with correct src and alt', () => {
    render(<OptimizedImage {...defaultProps} />);
    const img = screen.getByAltText('A descriptive alt text');
    expect(img).toHaveAttribute('src', defaultProps.src);
    expect(img).toHaveAttribute('alt', defaultProps.alt);
  });

  it('uses a fallback alt when alt is empty or missing', () => {
    render(<OptimizedImage src="/test.jpg" alt="" />);
    const img = screen.getByAltText('Soroban documentation illustration');
    expect(img).toHaveAttribute('alt', 'Soroban documentation illustration');
  });

  it('applies loading="lazy" by default', () => {
    render(<OptimizedImage {...defaultProps} />);
    const img = screen.getByAltText('A descriptive alt text');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('allows overriding loading attribute', () => {
    render(<OptimizedImage {...defaultProps} loading="eager" />);
    const img = screen.getByAltText('A descriptive alt text');
    expect(img).toHaveAttribute('loading', 'eager');
  });

  it('applies decoding="async" by default', () => {
    render(<OptimizedImage {...defaultProps} />);
    const img = screen.getByAltText('A descriptive alt text');
    expect(img).toHaveAttribute('decoding', 'async');
  });

  it('passes through width, height, and className', () => {
    render(
      <OptimizedImage
        {...defaultProps}
        width={200}
        height={150}
        className="custom-class"
      />
    );
    const img = screen.getByAltText('A descriptive alt text');
    expect(img).toHaveAttribute('width', '200');
    expect(img).toHaveAttribute('height', '150');
    expect(img).toHaveClass('custom-class');
  });

  it('renders WebP source when webpSrc is provided', () => {
    render(<OptimizedImage {...defaultProps} webpSrc="/image.webp" />);
    const sources = document.querySelectorAll('source');
    expect(sources[0]).toHaveAttribute('srcSet', '/image.webp');
    expect(sources[0]).toHaveAttribute('type', 'image/webp');
  });

  it('automatically adds WebP source for raster images (jpg, jpeg, png)', () => {
    render(<OptimizedImage src="/photo.jpg" alt="Photo" />);
    const sources = document.querySelectorAll('source');
    // First source should be auto-generated WebP
    expect(sources[0]).toHaveAttribute('srcSet', '/photo.webp');
    expect(sources[0]).toHaveAttribute('type', 'image/webp');
  });

  it('does not auto-add WebP for non-raster images', () => {
    render(<OptimizedImage src="/diagram.svg" alt="Diagram" />);
    const sources = document.querySelectorAll('source');
    // Only one source (the original mime type) – no auto WebP
    expect(sources.length).toBe(1);
    expect(sources[0]).toHaveAttribute('srcSet', '/diagram.svg');
  });
});