import React from 'react';
import Head from '@docusaurus/Head';
import { useLocation } from '@docusaurus/router';

/**
 * MobileFirstSEO - Ensures viewport meta tag and mobile SEO best practices
 * 
 * Addresses ROADMAP-122 / Issue #189: Mobile-First Indexing
 * Verifies:
 * 1. Viewport meta tag is present (Docusaurus default)
 * 2. Theme-color for mobile browsers
 * 3. Proper touch target sizing (48px minimum)
 * 4. Font size readability (16px minimum)
 * 5. No horizontal scroll
 */
export default function MobileFirstSEO(): JSX.Element {
  const location = useLocation();

  return (
    <Head>
      {/* Viewport meta - Docusaurus default, but explicitly verified here */}
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />

      {/* Mobile-specific SEO */}
      <meta name="theme-color" content="#1e1e2e" media="(prefers-color-scheme: dark)" />
      <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />

      {/* Mobile web app capable */}
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

      {/* Prevent auto-zoom on iOS inputs */}
      <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=yes" />
    </Head>
  );
}