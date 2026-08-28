import React, { useEffect, useState } from 'react';
import styles from './OfflineNotice.module.css';

/**
 * Site-wide banner when the browser reports offline (Phase 6 / issue #350).
 * Does not replace a service worker — it documents and surfaces the current
 * pre-PWA offline state so users see a clear message instead of a blank failure.
 */
export default function OfflineNotice(): React.JSX.Element | null {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className={styles.banner} role="status" aria-live="polite" data-testid="offline-notice">
      <strong className={styles.title}>You are offline</strong>
      <span className={styles.detail}>
        Previously loaded pages may still work in this tab. New pages and search need a network
        connection until a Progressive Web App (PWA) cache is available.
      </span>
    </div>
  );
}
