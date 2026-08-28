/**
 * Utility functions for VideoPlayer component
 * Handles URL parsing, validation, and video metadata extraction
 */

import { VideoProvider, VideoMetadata } from './types';

/**
 * Extract YouTube video ID from various URL formats
 * Supports:
 * - https://youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/watch?v=VIDEO_ID&t=123
 * - VIDEO_ID (direct ID)
 */
export function extractYouTubeId(url: string): string | null {
  try {
    // Direct video ID (11-12 alphanumeric characters)
    if (/^[a-zA-Z0-9_-]{11,}$/.test(url)) {
      return url;
    }

    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // youtube.com or www.youtube.com
    if (hostname.includes('youtube.com')) {
      const videoId = urlObj.searchParams.get('v');
      return videoId;
    }

    // youtu.be short URL
    if (hostname === 'youtu.be') {
      const videoId = urlObj.pathname.slice(1);
      return videoId || null;
    }

    return null;
  } catch {
    // If URL parsing fails, try regex patterns
    const youtubeRegex =
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11,})/;
    const match = url.match(youtubeRegex);
    return match ? match[1] : null;
  }
}

/**
 * Extract Vimeo video ID from various URL formats
 * Supports:
 * - https://vimeo.com/VIDEO_ID
 * - https://player.vimeo.com/video/VIDEO_ID
 * - VIDEO_ID (direct ID)
 */
export function extractVimeoId(url: string): string | null {
  try {
    // Direct video ID (numeric)
    if (/^\d+$/.test(url)) {
      return url;
    }

    const urlObj = new URL(url);

    // vimeo.com or www.vimeo.com
    if (urlObj.hostname.includes('vimeo.com')) {
      const pathParts = urlObj.pathname.split('/').filter((p) => p);
      const videoId = pathParts[0];
      return /^\d+$/.test(videoId) ? videoId : null;
    }

    return null;
  } catch {
    // If URL parsing fails, try regex patterns
    const vimeoRegex = /vimeo\.com\/(\d+)|player\.vimeo\.com\/video\/(\d+)/;
    const match = url.match(vimeoRegex);
    return match ? match[1] || match[2] : null;
  }
}

/**
 * Detect video provider from URL
 */
export function detectProvider(url: string): VideoProvider | null {
  // Check for YouTube patterns
  if (url.includes('youtube.com') || url.includes('youtu.be') || /^[a-zA-Z0-9_-]{11,}$/.test(url)) {
    const youtubeId = extractYouTubeId(url);
    if (youtubeId) return 'youtube';
  }

  // Check for Vimeo patterns
  if (url.includes('vimeo.com') || /^\d+$/.test(url)) {
    const vimeoId = extractVimeoId(url);
    if (vimeoId) return 'vimeo';
  }

  return null;
}

/**
 * Get embed URL for the video provider
 */
export function getEmbedUrl(provider: VideoProvider, videoId: string): string {
  if (provider === 'youtube') {
    return `https://www.youtube.com/embed/${videoId}`;
  } else if (provider === 'vimeo') {
    return `https://player.vimeo.com/video/${videoId}`;
  }
  throw new Error(`Unknown video provider: ${provider}`);
}

/**
 * Validate and extract metadata from video URL
 */
export function parseVideoUrl(url: string, provider?: VideoProvider): VideoMetadata | null {
  // Auto-detect provider if not specified
  const detectedProvider = provider || detectProvider(url);

  if (!detectedProvider) {
    return null;
  }

  let videoId: string | null = null;

  if (detectedProvider === 'youtube') {
    videoId = extractYouTubeId(url);
  } else if (detectedProvider === 'vimeo') {
    videoId = extractVimeoId(url);
  }

  if (!videoId) {
    return null;
  }

  return {
    provider: detectedProvider,
    videoId,
    embedUrl: getEmbedUrl(detectedProvider, videoId),
  };
}

/**
 * Validate if a URL is a valid video URL
 */
export function isValidVideoUrl(url: string): boolean {
  return parseVideoUrl(url) !== null;
}
