import React, { useEffect, useRef, useState } from 'react';
import styles from './Stats.module.css';

interface StatItem {
  end: number;
  label: string;
  suffix?: string;
}

const STATS: StatItem[] = [
  { end: 50, label: 'Smart Contract Patterns', suffix: '+' },
  { end: 120, label: 'Contributors', suffix: '+' },
  { end: 2400, label: 'GitHub Stars', suffix: '+' },
  { end: 5000, label: 'Community Members', suffix: '+' },
];

export default function Stats() {
  const [counts, setCounts] = useState<number[]>(() => STATS.map(() => 0));
  const [isVisible, setIsVisible] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    if (gridRef.current) {
      observer.observe(gridRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 2000;
    let startTime: number | undefined;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (startTime === undefined) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);

      setCounts(STATS.map(({ end }) => Math.floor(easeOutQuart * end)));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [isVisible]);

  return (
    <section className={styles.statsSection}>
      <div className={styles.container}>
        <h2 className={styles.heading}>Trusted by the Community</h2>
        <div ref={gridRef} className={styles.statsGrid}>
          {STATS.map(({ label, suffix = '' }, index) => (
            <div key={label} className={styles.statItem}>
              <div className={styles.statNumber}>
                {counts[index].toLocaleString()}
                {suffix}
              </div>
              <div className={styles.statLabel}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
