/**
 * VideoPlayer component types
 * Defines props and utility types for embedding video tutorials
 */

export type VideoProvider = 'youtube' | 'vimeo';

export interface VideoPlayerProps {
  /** Video URL (YouTube or Vimeo) */
  url: string;
  /** Video provider type (youtube or vimeo) - auto-detected if not provided */
  provider?: VideoProvider;
  /** Video title for accessibility */
  title?: string;
  /** Video description */
  description?: string;
  /** Width of the video container (default: 100%) */
  width?: string | number;
  /** Custom aspect ratio (default: 16/9) */
  aspectRatio?: number;
  /** Whether to allow fullscreen (default: true) */
  allowFullscreen?: boolean;
  /** Custom CSS class name */
  className?: string;
  /** Whether to show video controls (default: true) */
  showControls?: boolean;
}

export interface VideoMetadata {
  /** Video provider */
  provider: VideoProvider;
  /** Video ID for the provider */
  videoId: string;
  /** Embed URL */
  embedUrl: string;
}
