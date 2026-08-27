import { useEffect } from 'react';
import { useLocation } from '@docusaurus/router';
import registryData from '../components/recommendations/contentRegistry.json';
import { trackDocVisit } from '../../lib/recommendations/tracker';

const registry = registryData as Array<{
  id: string;
  category: string;
  tags: string[];
  difficulty: string;
}>;

export default function useRecommendationTracker(): void {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Normalize path (remove leading/trailing slashes)
    const normalized = pathname.replace(/^\//, '').replace(/\/$/, '');
    if (!normalized.startsWith('docs/')) return;

    const docId = normalized.substring(5); // Remove "docs/"
    if (!docId) return;

    const doc = registry.find((d) => d.id === docId);
    if (doc) {
      trackDocVisit(doc.id, doc.category, doc.tags, doc.difficulty);
    }
  }, [pathname]);
}
