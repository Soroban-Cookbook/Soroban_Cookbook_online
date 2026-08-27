import React, { useEffect, useState } from 'react';
import Link from '@docusaurus/Link';
import { Badge } from '../Badge';
import { getHistory } from '../../../lib/recommendations/tracker';
import {
  getRecommendations,
  RegistryDocument,
} from '../../../lib/recommendations/recommendationEngine';
import registryData from './contentRegistry.json';
import styles from './RecommendationWidget.module.css';

export interface RecommendationWidgetProps {
  currentDocId: string;
}

export default function RecommendationWidget({ currentDocId }: RecommendationWidgetProps) {
  const [recommendations, setRecommendations] = useState<RegistryDocument[]>([]);
  const [preferredCategory, setPreferredCategory] = useState<string>('');

  useEffect(() => {
    const history = getHistory();
    const list = getRecommendations(currentDocId, history.visitedDocs, history.preferences, 3);
    setRecommendations(list);

    let preferred = '';
    let max = 0;
    if (history.preferences?.categoryPreferences) {
      for (const [cat, count] of Object.entries(history.preferences.categoryPreferences)) {
        if (count > max) {
          max = count;
          preferred = cat;
        }
      }
    }
    setPreferredCategory(preferred);
  }, [currentDocId]);

  if (recommendations.length === 0) {
    return null;
  }

  // Find current doc metadata in registry to generate reasons
  const currentDoc = (registryData as RegistryDocument[]).find((doc) => doc.id === currentDocId);

  const getReason = (doc: RegistryDocument) => {
    if (currentDoc && doc.category === currentDoc.category) {
      return `More in ${formatCategory(doc.category)}`;
    }
    if (preferredCategory && doc.category === preferredCategory) {
      return `Based on your interest in ${formatCategory(doc.category)}`;
    }
    if (currentDoc && doc.difficulty === 'intermediate' && currentDoc.difficulty === 'beginner') {
      return 'Next step progression';
    }
    if (currentDoc && doc.difficulty === 'advanced' && currentDoc.difficulty === 'intermediate') {
      return 'Advance your skills';
    }
    return 'Recommended next step';
  };

  const formatCategory = (cat: string) => {
    if (!cat) return '';
    return cat
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className={styles.container} data-testid="recommendations-widget">
      <h2 className={styles.title}>
        <span className={styles.titleIcon} aria-hidden="true">
          💡
        </span>
        Recommended for You
      </h2>
      <div className={styles.grid}>
        {recommendations.map((doc) => (
          <Link
            key={doc.id}
            to={doc.href}
            className={styles.card}
            data-testid={`rec-card-${doc.id}`}>
            <div className={styles.cardHeader}>
              <span className={styles.category}>{formatCategory(doc.category)}</span>
              <Badge
                variant={doc.difficulty as 'beginner' | 'intermediate' | 'advanced'}
                size="sm"
              />
            </div>
            <h3 className={styles.cardTitle}>{doc.title}</h3>
            <p className={styles.cardDescription}>{doc.description}</p>
            <div className={styles.cardFooter}>
              <span className={styles.readTime}>⏱️ {doc.time} min</span>
              <span className={styles.reason}>{getReason(doc)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
