/**
 * VideoPlayer Component Export
 * Main export for responsive video embedding component
 */

export { default as VideoPlayer } from './VideoPlayer';
export type { VideoPlayerProps, VideoProvider, VideoMetadata } from './types';
export {
  extractYouTubeId,
  extractVimeoId,
  detectProvider,
  getEmbedUrl,
  parseVideoUrl,
  isValidVideoUrl,
} from './utils';
