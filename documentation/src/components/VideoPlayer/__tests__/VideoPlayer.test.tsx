import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import VideoPlayer from '../VideoPlayer';
import styles from '../VideoPlayer.module.css';

// Mock the utils module to control parseVideoUrl behavior
vi.mock('../utils', () => ({
  parseVideoUrl: vi.fn((url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return {
        provider: 'youtube',
        videoId: 'abc123',
        embedUrl: 'https://www.youtube.com/embed/abc123',
      };
    }
    if (url.includes('vimeo.com')) {
      return {
        provider: 'vimeo',
        videoId: '456def',
        embedUrl: 'https://player.vimeo.com/video/456def',
      };
    }
    return null; // Invalid URL
  }),
}));

describe('VideoPlayer', () => {
  const validYouTubeUrl = 'https://www.youtube.com/watch?v=abc123';
  const validVimeoUrl = 'https://vimeo.com/456def';
  const invalidUrl = 'https://invalid.com/video';

  it('renders an iframe for valid YouTube URLs', () => {
    render(<VideoPlayer url={validYouTubeUrl} />);
    const iframe = screen.getByTitle('Video: abc123');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', expect.stringContaining('youtube.com/embed/abc123'));
    expect(iframe).toHaveAttribute('allow');
    expect(iframe).toHaveAttribute('allowFullScreen');
    expect(iframe).toHaveAttribute('loading', 'lazy');
  });

  it('renders an iframe for valid Vimeo URLs', () => {
    render(<VideoPlayer url={validVimeoUrl} />);
    const iframe = screen.getByTitle('Video: 456def');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', expect.stringContaining('player.vimeo.com/video/456def'));
  });

  it('shows error state for invalid URLs', () => {
    render(<VideoPlayer url={invalidUrl} />);
    expect(screen.getByText('Invalid video URL')).toBeInTheDocument();
    expect(screen.getByText('Supported: YouTube, Vimeo')).toBeInTheDocument();
    expect(screen.queryByTitle(/Video:/)).not.toBeInTheDocument();
  });

  it('applies sandbox and allow attributes for security', () => {
    render(<VideoPlayer url={validYouTubeUrl} />);
    const iframe = screen.getByTitle('Video: abc123');
    expect(iframe).toHaveAttribute('allow', expect.stringContaining('accelerometer'));
    expect(iframe).toHaveAttribute('allow', expect.stringContaining('encrypted-media'));
    expect(iframe).toHaveAttribute('allow', expect.stringContaining('gyroscope'));
  });

  it('includes fullscreen in allow when allowFullscreen is true', () => {
    render(<VideoPlayer url={validYouTubeUrl} allowFullscreen={true} />);
    const iframe = screen.getByTitle('Video: abc123');
    expect(iframe).toHaveAttribute('allow', expect.stringContaining('fullscreen'));
  });

  it('does not include fullscreen in allow when allowFullscreen is false', () => {
    render(<VideoPlayer url={validYouTubeUrl} allowFullscreen={false} />);
    const iframe = screen.getByTitle('Video: abc123');
    expect(iframe.getAttribute('allow')).not.toContain('fullscreen');
  });

  it('adds controls=0 when showControls is false', () => {
    render(<VideoPlayer url={validYouTubeUrl} showControls={false} />);
    const iframe = screen.getByTitle('Video: abc123');
    expect(iframe).toHaveAttribute('src', expect.stringContaining('controls=0'));
  });

  it('renders title and description when provided', () => {
    render(
      <VideoPlayer url={validYouTubeUrl} title="Getting Started" description="Learn the basics" />,
    );
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText('Learn the basics')).toBeInTheDocument();
  });

  it('applies custom aspect ratio class', () => {
    const { container } = render(<VideoPlayer url={validYouTubeUrl} aspectRatio={4 / 3} />);
    const wrapper = container.querySelector(`.${styles.wrapper}`);
    expect(wrapper).toBeInTheDocument();
    // CSS module classes are hashed at build time, so compare against the
    // same module the component imports rather than literal class names.
    expect(wrapper).toHaveClass(styles.ratio4x3);
  });

  it('uses 16:9 as default aspect ratio', () => {
    const { container } = render(<VideoPlayer url={validYouTubeUrl} />);
    const wrapper = container.querySelector(`.${styles.wrapper}`);
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveClass(styles.ratio16x9);
  });

  it('sets loading="lazy" on iframe', () => {
    render(<VideoPlayer url={validYouTubeUrl} />);
    const iframe = screen.getByTitle('Video: abc123');
    expect(iframe).toHaveAttribute('loading', 'lazy');
  });
});
