import React, { useState } from 'react';
import Layout from '@theme/Layout';
import { Alert, Callout } from '@site/src/components/Alert';
import { Sparkles } from 'lucide-react';
import styles from './alerts-demo.module.css';

export default function AlertsDemo() {
  const [showDismissible, setShowDismissible] = useState(true);

  return (
    <Layout
      title="Alert & Callout Components"
      description="Demo page for Alert and Callout components">
      <main className={styles.container}>
        <div className={styles.content}>
          <h1>Alert & Callout Components</h1>
          <p className={styles.intro}>
            Standardized components for displaying important information with visual emphasis.
          </p>

          {/* Alert Variants */}
          <section className={styles.section}>
            <h2>Alert Component</h2>
            <p>Interactive notifications for user feedback and system messages.</p>

            <h3>Basic Variants</h3>
            <div className={styles.examples}>
              <Alert variant="info">
                This is an informational alert. Use it for general notices and helpful information.
              </Alert>

              <Alert variant="warning">
                This is a warning alert. Use it for cautions and actions that require attention.
              </Alert>

              <Alert variant="error">
                This is an error alert. Use it for errors, failures, and critical issues.
              </Alert>

              <Alert variant="success">
                This is a success alert. Use it for confirmations and successful operations.
              </Alert>
            </div>

            <h3>With Titles</h3>
            <div className={styles.examples}>
              <Alert variant="info" title="Did You Know?">
                Alerts can have optional titles to provide additional context.
              </Alert>

              <Alert variant="warning" title="Breaking Change">
                This API will be deprecated in version 2.0. Please migrate to the new API.
              </Alert>
            </div>

            <h3>Without Icons</h3>
            <div className={styles.examples}>
              <Alert variant="info" icon={false}>
                This alert has no icon. Use this for cleaner, text-focused messages.
              </Alert>
            </div>

            <h3>Custom Icons</h3>
            <div className={styles.examples}>
              <Alert variant="success" icon={<Sparkles size={20} />}>
                This alert uses a custom icon instead of the default one.
              </Alert>
            </div>

            <h3>Dismissible Alert</h3>
            <div className={styles.examples}>
              {showDismissible && (
                <Alert
                  variant="info"
                  title="Dismissible"
                  onClose={() => setShowDismissible(false)}>
                  Click the close button to dismiss this alert.
                </Alert>
              )}
              {!showDismissible && (
                <button
                  onClick={() => setShowDismissible(true)}
                  className={styles.resetButton}>
                  Show Dismissible Alert Again
                </button>
              )}
            </div>

            <h3>Inline Display</h3>
            <div className={styles.examples}>
              <p>
                Here is some text with an{' '}
                <Alert variant="warning" display="inline">
                  inline alert
                </Alert>{' '}
                embedded within it.
              </p>
            </div>
          </section>

          {/* Callout Variants */}
          <section className={styles.section}>
            <h2>Callout Component</h2>
            <p>Static emphasis blocks for documentation content.</p>

            <h3>Basic Variants</h3>
            <div className={styles.examples}>
              <Callout variant="info">
                This is an informational callout. Use it to highlight important documentation
                details.
              </Callout>

              <Callout variant="warning">
                This is a warning callout. Use it for cautions, gotchas, and important
                considerations.
              </Callout>

              <Callout variant="error">
                This is an error callout. Use it to document common errors and how to avoid them.
              </Callout>

              <Callout variant="success">
                This is a success callout. Use it to highlight best practices and successful
                patterns.
              </Callout>

              <Callout variant="tip">
                This is a tip callout. Use it for helpful suggestions, pro tips, and optimization
                advice.
              </Callout>
            </div>

            <h3>With Titles</h3>
            <div className={styles.examples}>
              <Callout variant="info" title="Prerequisites">
                Before you begin, ensure you have Node.js 20+ and npm installed on your system.
              </Callout>

              <Callout variant="tip" title="Pro Tip">
                Use the <code>--release</code> flag when building for production to enable
                optimizations.
              </Callout>
            </div>

            <h3>Rich Content</h3>
            <div className={styles.examples}>
              <Callout variant="warning" title="Important Considerations">
                <p>When using this feature, keep in mind:</p>
                <ul>
                  <li>It requires additional dependencies</li>
                  <li>Performance may vary based on data size</li>
                  <li>Not supported in older browsers</li>
                </ul>
                <p>
                  See the <a href="/docs">documentation</a> for more details.
                </p>
              </Callout>
            </div>

            <h3>Without Icons</h3>
            <div className={styles.examples}>
              <Callout variant="info" icon={false}>
                This callout has no icon for a cleaner, text-focused appearance.
              </Callout>
            </div>

            <h3>Inline Display</h3>
            <div className={styles.examples}>
              <p>
                You can also use{' '}
                <Callout variant="tip" display="inline">
                  inline callouts
                </Callout>{' '}
                within your text content.
              </p>
            </div>
          </section>

          {/* Comparison */}
          <section className={styles.section}>
            <h2>Alert vs Callout</h2>
            <div className={styles.comparison}>
              <div>
                <h3>Use Alert for:</h3>
                <ul>
                  <li>System notifications</li>
                  <li>User feedback messages</li>
                  <li>Validation errors</li>
                  <li>Dismissible messages</li>
                  <li>Dynamic content</li>
                </ul>
              </div>
              <div>
                <h3>Use Callout for:</h3>
                <ul>
                  <li>Documentation emphasis</li>
                  <li>Static warnings</li>
                  <li>Tips and best practices</li>
                  <li>Prerequisites</li>
                  <li>Important notes</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Accessibility */}
          <section className={styles.section}>
            <h2>Accessibility</h2>
            <ul>
              <li>
                <strong>ARIA Roles:</strong> Alert uses <code>role="alert"</code>, Callout uses{' '}
                <code>role="note"</code>
              </li>
              <li>
                <strong>Live Regions:</strong> Alerts have <code>aria-live</code> for screen
                readers
              </li>
              <li>
                <strong>Color Contrast:</strong> All variants meet WCAG AA standards
              </li>
              <li>
                <strong>Keyboard Navigation:</strong> Close buttons are keyboard accessible
              </li>
              <li>
                <strong>Reduced Motion:</strong> Respects <code>prefers-reduced-motion</code>
              </li>
            </ul>
          </section>
        </div>
      </main>
    </Layout>
  );
}
