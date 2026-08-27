import React from 'react';
import clsx from 'clsx';
import styles from './OptimizedImage.module.css';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
  /** Optional WebP source. Omit when no WebP asset exists to avoid 404 console noise. */
  webpSrc?: string;
}

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
};

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  loading = 'lazy',
  decoding = 'async',
  webpSrc: webpSrcProp,
}: OptimizedImageProps) {
  const ext = src.split('.').pop()?.toLowerCase() ?? '';
  const isRaster = /\.(jpg|jpeg|png)$/i.test(src);
  const webpSrc = webpSrcProp ?? (isRaster ? src.replace(/\.(jpg|jpeg|png)$/i, '.webp') : null);
  const mimeType = MIME_TYPES[ext] ?? `image/${ext}`;
  const safeAlt = alt && alt.trim().length > 0 ? alt : 'Soroban documentation illustration';

  return (
    <picture className={clsx(styles.picture, className)}>
      {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
      <source srcSet={src} type={mimeType} />
      <img
        src={src}
        alt={safeAlt}
        width={width}
        height={height}
        loading={loading}
        decoding={decoding}
        className={styles.img}
      />
    </picture>
  );
}
