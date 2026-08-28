import React from 'react';
import { Skeleton } from './primitives';
import styles from './DocSkeleton.module.css';

/**
 * Document-shaped skeleton placeholder for slow/lazy doc routes.
 * Reserves vertical space so content swap does not cause layout shift.
 */
export default function DocSkeleton() {
  return (
    <div className={styles.container} role="status" aria-busy="true" aria-label="Loading document">
      <Skeleton height="3rem" width="80%" />
      <div className={styles.skeletonGroup}>
        <Skeleton height="1.25rem" width="100%" />
        <Skeleton height="1.25rem" width="90%" />
        <Skeleton height="1.25rem" width="95%" />
        <Skeleton height="150px" width="100%" />
      </div>
    </div>
  );
}
