/**
 * Recommendation Widget
 * ----------------------
 * Displays recommended patterns based on user viewing history.
 * Uses the tracker module to score and suggest related patterns.
 */

import React, { useEffect, useState } from 'react';
import { getTopRecommendations, trackPatternView } from '../../lib/recommendations/tracker';
import styles from './RecommendationWidget.module.css';

export interface RecommendationWidgetProps {
  currentPatternId: string;
  allPatternIds: string[];
  renderPattern: (patternId: string) => React.ReactNode;
  maxRecommendations?: number;
  className?: string;
}

export function RecommendationWidget({
  currentPatternId,
  allPatternIds,
  renderPattern,
  maxRecommendations = 3,
  className = '',
}: RecommendationWidgetProps): React.ReactElement {
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    // Track the current pattern view
    trackPatternView(currentPatternId);

    // Get recommendations excluding current pattern
    const topRecs = getTopRecommendations(allPatternIds, maxRecommendations, currentPatternId);
    setRecommendations(topRecs);
  }, [currentPatternId, allPatternIds, maxRecommendations]);

  if (recommendations.length === 0) {
    return (
      <div className={`${styles.widget} ${styles.empty} ${className}`}>
        <p>No related patterns found yet. Keep exploring!</p>
      </div>
    );
  }

  return (
    <div className={`${styles.widget} ${className}`}>
      <h3 className={styles.title}>Related Patterns</h3>
      <div className={styles.recommendations}>
        {recommendations.map((patternId) => (
          <div key={patternId} className={styles.item}>
            {renderPattern(patternId)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecommendationWidget;
