/**
 * Components Demo Page
 * 
 * Showcases all button variants, sizes, states, and dark mode functionality.
 * This page demonstrates the comprehensive button system and theme toggle.
 */

import React, { useState } from 'react';
import Layout from '@theme/Layout';
import { Button, ButtonGroup } from '../components/buttons';
import { ThemeToggle } from '../components/ThemeToggle';
import styles from './components-demo.module.css';

export default function ComponentsDemo(): JSX.Element {
  const [loading, setLoading] = useState(false);

  const handleLoadingDemo = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <Layout
      title="Components Demo"
      description="Showcase of button components and dark mode functionality"
    >
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Components Demo</h1>
          <p>
            Comprehensive button system with dark mode support, WCAG 2.1 AA
            accessibility compliance, and smooth theme transitions.
          </p>
        </header>

        {/* Theme Toggle Section */}
        <section className={styles.section}>
          <h2>Theme Toggle</h2>
          <p>Click to switch between light and dark modes. Preference is persisted.</p>
          <div className={styles.demoRow}>
            <ThemeToggle size="small" />
            <ThemeToggle size="medium" />
            <ThemeToggle size="large" />
            <ThemeToggle showLabel />
          </div>
        </section>

        {/* Button Variants */}
        <section className={styles.section}>
          <h2>Button Variants</h2>
          <div className={styles.demoRow}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="tertiary">Tertiary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
        </section>

        {/* Button Sizes */}
        <section className={styles.section}>
          <h2>Button Sizes</h2>
          <div className={styles.demoRow}>
            <Button variant="primary" size="small">
              Small
            </Button>
            <Button variant="primary" size="medium">
              Medium
            </Button>
            <Button variant="primary" size="large">
              Large
            </Button>
          </div>
        </section>

        {/* Button States */}
        <section className={styles.section}>
          <h2>Button States</h2>
          <div className={styles.demoRow}>
            <Button variant="primary">Default</Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
            <Button variant="primary" loading={loading} onClick={handleLoadingDemo}>
              {loading ? 'Loading...' : 'Click to Load'}
            </Button>
            <Button variant="primary" loading loadingText="Saving...">
              Custom Loading
            </Button>
          </div>
        </section>

        {/* Icon Buttons */}
        <section className={styles.section}>
          <h2>Icon Buttons</h2>
          <div className={styles.demoRow}>
            <Button
              variant="primary"
              startIcon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              }
            >
              With Start Icon
            </Button>
            <Button
              variant="secondary"
              endIcon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              }
            >
              With End Icon
            </Button>
            <Button variant="primary" iconOnly aria-label="Add item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </Button>
            <Button variant="danger" iconOnly aria-label="Delete item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </Button>
          </div>
        </section>

        {/* Button Groups */}
        <section className={styles.section}>
          <h2>Button Groups</h2>
          <div className={styles.demoColumn}>
            <div className={styles.demoRow}>
              <ButtonGroup ariaLabel="View options">
                <Button variant="secondary">List</Button>
                <Button variant="secondary">Grid</Button>
                <Button variant="secondary">Table</Button>
              </ButtonGroup>
            </div>
            <div className={styles.demoRow}>
              <ButtonGroup variant="connected" ariaLabel="File actions">
                <Button variant="primary">Save</Button>
                <Button variant="primary">Save As</Button>
              </ButtonGroup>
            </div>
            <div className={styles.demoRow}>
              <ButtonGroup variant="segmented" ariaLabel="View mode">
                <Button variant="ghost">Day</Button>
                <Button variant="ghost">Week</Button>
                <Button variant="ghost">Month</Button>
              </ButtonGroup>
            </div>
          </div>
        </section>

        {/* Full Width */}
        <section className={styles.section}>
          <h2>Full Width Button</h2>
          <Button variant="primary" fullWidth>
            Full Width Button
          </Button>
        </section>

        {/* Accessibility Info */}
        <section className={styles.section}>
          <h2>Accessibility Features</h2>
          <ul className={styles.featureList}>
            <li>✓ WCAG 2.1 AA compliant color contrast</li>
            <li>✓ Keyboard navigation support (Tab, Enter, Space)</li>
            <li>✓ Focus visible indicators</li>
            <li>✓ Screen reader announcements for loading states</li>
            <li>✓ Reduced motion support</li>
            <li>✓ High contrast mode support</li>
            <li>✓ ARIA attributes for interactive states</li>
          </ul>
        </section>

        {/* Dark Mode Features */}
        <section className={styles.section}>
          <h2>Dark Mode Features</h2>
          <ul className={styles.featureList}>
            <li>✓ Smooth toggle animation</li>
            <li>✓ LocalStorage persistence</li>
            <li>✓ Respects system preference (prefers-color-scheme)</li>
            <li>✓ No flash on page load</li>
            <li>✓ Optimized colors and contrast for dark theme</li>
            <li>✓ Meta theme-color for mobile browsers</li>
          </ul>
        </section>
      </div>
    </Layout>
  );
}
