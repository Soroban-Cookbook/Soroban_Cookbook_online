/**
 * Tests for VideoPlayer utility functions
 */

import { describe, it, expect } from 'vitest';
import type { VideoProvider } from './types';
import {
  extractYouTubeId,
  extractVimeoId,
  detectProvider,
  getEmbedUrl,
  parseVideoUrl,
  isValidVideoUrl,
} from './utils';

describe('VideoPlayer utilities', () => {
  describe('extractYouTubeId', () => {
    it('should extract ID from youtube.com watch URL', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from youtu.be short URL', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ';
      expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from youtube.com watch URL with parameters', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=123';
      expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should handle direct video ID', () => {
      expect(extractYouTubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should return null for invalid URL', () => {
      expect(extractYouTubeId('https://example.com')).toBeNull();
    });

    it('should extract ID from youtube.com embed URL', () => {
      const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
      expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
    });
  });

  describe('extractVimeoId', () => {
    it('should extract ID from vimeo.com URL', () => {
      const url = 'https://vimeo.com/123456789';
      expect(extractVimeoId(url)).toBe('123456789');
    });

    it('should extract ID from player.vimeo.com URL', () => {
      const url = 'https://player.vimeo.com/video/123456789';
      expect(extractVimeoId(url)).toBe('123456789');
    });

    it('should handle direct video ID', () => {
      expect(extractVimeoId('123456789')).toBe('123456789');
    });

    it('should return null for invalid URL', () => {
      expect(extractVimeoId('https://example.com')).toBeNull();
    });

    it('should return null for non-numeric Vimeo URL', () => {
      expect(extractVimeoId('https://vimeo.com/invalid')).toBeNull();
    });
  });

  describe('detectProvider', () => {
    it('should detect YouTube from watch URL', () => {
      expect(detectProvider('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube');
    });

    it('should detect YouTube from youtu.be URL', () => {
      expect(detectProvider('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube');
    });

    it('should detect YouTube from direct ID', () => {
      expect(detectProvider('dQw4w9WgXcQ')).toBe('youtube');
    });

    it('should detect Vimeo from vimeo.com URL', () => {
      expect(detectProvider('https://vimeo.com/123456789')).toBe('vimeo');
    });

    it('should detect Vimeo from direct numeric ID', () => {
      expect(detectProvider('123456789')).toBe('vimeo');
    });

    it('should return null for invalid URL', () => {
      expect(detectProvider('https://example.com')).toBeNull();
    });
  });

  describe('getEmbedUrl', () => {
    it('should generate YouTube embed URL', () => {
      const url = getEmbedUrl('youtube', 'dQw4w9WgXcQ');
      expect(url).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    });

    it('should generate Vimeo embed URL', () => {
      const url = getEmbedUrl('vimeo', '123456789');
      expect(url).toBe('https://player.vimeo.com/video/123456789');
    });

    it('should throw error for unknown provider', () => {
      expect(() => {
        getEmbedUrl('unknown' as VideoProvider, '123');
      }).toThrow();
    });
  });

  describe('parseVideoUrl', () => {
    it('should parse YouTube URL with auto-detection', () => {
      const result = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result).toEqual({
        provider: 'youtube',
        videoId: 'dQw4w9WgXcQ',
        embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      });
    });

    it('should parse Vimeo URL with auto-detection', () => {
      const result = parseVideoUrl('https://vimeo.com/123456789');
      expect(result).toEqual({
        provider: 'vimeo',
        videoId: '123456789',
        embedUrl: 'https://player.vimeo.com/video/123456789',
      });
    });

    it('should respect explicit provider parameter', () => {
      const result = parseVideoUrl('dQw4w9WgXcQ', 'youtube');
      expect(result?.provider).toBe('youtube');
    });

    it('should return null for invalid URL', () => {
      expect(parseVideoUrl('https://example.com')).toBeNull();
    });
  });

  describe('isValidVideoUrl', () => {
    it('should return true for valid YouTube URL', () => {
      expect(isValidVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    });

    it('should return true for valid Vimeo URL', () => {
      expect(isValidVideoUrl('https://vimeo.com/123456789')).toBe(true);
    });

    it('should return false for invalid URL', () => {
      expect(isValidVideoUrl('https://example.com')).toBe(false);
    });

    it('should return true for direct YouTube ID', () => {
      expect(isValidVideoUrl('dQw4w9WgXcQ')).toBe(true);
    });

    it('should return true for direct Vimeo ID', () => {
      expect(isValidVideoUrl('123456789')).toBe(true);
    });
  });
});
