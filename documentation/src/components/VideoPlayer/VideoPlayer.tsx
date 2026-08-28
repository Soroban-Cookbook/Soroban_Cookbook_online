import React, { useMemo } from 'react';
import clsx from 'clsx';
import styles from './VideoPlayer.module.css';
import { VideoPlayerProps } from './types';
import { parseVideoUrl } from './utils';

/**
 * VideoPlayer Component
 *
 * Renders responsive video embeds for YouTube and Vimeo videos.
 * Supports responsive 16:9 (default) and other aspect ratios.
 * Automatically detects video provider from URL.
 *
 * @example
 * ```tsx
 * <VideoPlayer
 *   url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
 *   title="Getting Started with Soroban"
 *   description="Learn the basics of Soroban development"
 * />
 * ```
 */
export default function VideoPlayer({
  url,
  provider,
  title,
  description,
  width = '100%',
  aspectRatio = 16 / 9,
  allowFullscreen = true,
  className,
  showControls = true,
}: VideoPlayerProps) {
  // Parse video URL and extract metadata
  const videoMetadata = useMemo(() => {
    return parseVideoUrl(url, provider);
  }, [url, provider]);

  // Determine aspect ratio class
  const getAspectRatioClass = (ratio: number) => {
    if (Math.abs(ratio - 16 / 9) < 0.01) return styles.ratio16x9;
    if (Math.abs(ratio - 4 / 3) < 0.01) return styles.ratio4x3;
    if (Math.abs(ratio - 1) < 0.01) return styles.ratio1x1;
    if (Math.abs(ratio - 21 / 9) < 0.01) return styles.ratio21x9;
    return styles.ratio16x9; // Default fallback
  };

  if (!videoMetadata) {
    return (
      <div className={clsx(styles.container, className)} style={{ width }}>
        <div className={clsx(styles.wrapper, getAspectRatioClass(aspectRatio))}>
          <div className={styles.error}>
            <span className={styles.errorIcon}>⚠️</span>
            <span>Invalid video URL</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Supported: YouTube, Vimeo</span>
          </div>
        </div>
      </div>
    );
  }

  // Build iframe URL with parameters
  const iframeUrl = new URL(videoMetadata.embedUrl);
  const params = new URLSearchParams();

  if (!showControls) {
    params.append('controls', '0');
  }

  // Add provider-specific parameters
  if (videoMetadata.provider === 'youtube') {
    params.append('rel', '0'); // Don't show related videos
    params.append('modestbranding', '1'); // Minimal YouTube branding
  }

  if (params.toString()) {
    iframeUrl.search = params.toString();
  }

  return (
    <div className={clsx(styles.container, className)} style={{ width }}>
      <div
        className={clsx(styles.wrapper, getAspectRatioClass(aspectRatio))}
        role="region"
        aria-label={title || 'Video player'}>
        <iframe
          className={styles.iframe}
          src={iframeUrl.toString()}
          title={title || `Video: ${videoMetadata.videoId}`}
          allow={
            allowFullscreen
              ? 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen'
              : 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
          }
          allowFullScreen={allowFullscreen}
          loading="lazy"
        />
      </div>

      {/* Caption/Description */}
      {(title || description) && (
        <div className={styles.caption}>
          {title && <strong>{title}</strong>}
          {title && description && <br />}
          {description && <span>{description}</span>}
        </div>
      )}
    </div>
  );
}
