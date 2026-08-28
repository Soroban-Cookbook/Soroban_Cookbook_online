import React from 'react';
import { useProgress } from '@site/src/contexts/ProgressContext';
import styles from './ProgressToggleButton.module.css';

interface ProgressToggleButtonProps {
  path: string;
}

export default function ProgressToggleButton({
  path,
}: ProgressToggleButtonProps): React.JSX.Element | null {
  const { isCompleted, toggleComplete } = useProgress();
  const completed = isCompleted(path);

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.button}
        data-completed={completed}
        onClick={() => toggleComplete(path)}
        aria-pressed={completed}>
        {completed ? (
          <>
            <span aria-hidden="true">✅</span> Marked as Completed
          </>
        ) : (
          <>
            <span aria-hidden="true">✓</span> Mark as Complete
          </>
        )}
      </button>
    </div>
  );
}
