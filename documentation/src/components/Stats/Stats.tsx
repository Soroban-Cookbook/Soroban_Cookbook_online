import React, { useEffect, useRef, useState } from 'react';
import styles from './Stats.module.css';

interface StatItemProps {
  end: number;
  label: string;
  suffix?: string;
  duration?: number;
}

const StatItem: React.FC<StatItemProps> = ({ end, label, suffix = '', duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [isVisible, end, duration]);

  return (
    <div ref={ref} className={styles.statItem}>
      <div className={styles.statNumber}>
        {count.toLocaleString()}{suffix}
      </div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
};

export default function Stats() {
  return (
    <section className={styles.statsSection}>
      <div className={styles.container}>
        <h2 className={styles.heading}>Trusted by the Community</h2>
        <div className={styles.statsGrid}>
          <StatItem end={50} label="Smart Contract Patterns" suffix="+" />
          <StatItem end={120} label="Contributors" suffix="+" />
          <StatItem end={2400} label="GitHub Stars" suffix="+" />
          <StatItem end={5000} label="Community Members" suffix="+" />
        </div>
      </div>
    </section>
  );
}
