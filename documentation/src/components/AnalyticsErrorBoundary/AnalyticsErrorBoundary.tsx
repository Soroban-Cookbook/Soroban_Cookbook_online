import React, { type ErrorInfo, type ReactNode } from 'react';

/**
 * Error boundary specifically for analytics/tracking components.
 * Catches errors from non-critical components and logs them to Sentry
 * without crashing the entire page.
 */
interface AnalyticsErrorBoundaryProps {
  /** Name of the component being wrapped, for logging purposes */
  componentName: string;
  children: ReactNode;
  /** Optional fallback UI to show when an error occurs (defaults to null) */
  fallback?: ReactNode;
}

interface AnalyticsErrorBoundaryState {
  hasError: boolean;
}

export default class AnalyticsErrorBoundary extends React.Component<
  AnalyticsErrorBoundaryProps,
  AnalyticsErrorBoundaryState
> {
  constructor(props: AnalyticsErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): AnalyticsErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(
      `[AnalyticsErrorBoundary] Error in ${this.props.componentName}:`,
      error,
      errorInfo,
    );

    // Report to Sentry if available
    this.reportToSentry(error, errorInfo).catch(() => {
      // Sentry reporting failed - this is expected if Sentry is not configured
      console.warn(
        `[AnalyticsErrorBoundary] Failed to report error to Sentry for ${this.props.componentName}`,
      );
    });
  }

  private async reportToSentry(error: Error, errorInfo: ErrorInfo): Promise<void> {
    // Try to import Sentry dynamically (matches the pattern in Root.tsx)
    try {
      const Sentry = await import('@sentry/react');
      
      // Check if Sentry was initialized (has DSN configured)
      // The init() call in Root.tsx sets up Sentry only when SENTRY_DSN is present
      if (Sentry.getClient()) {
        Sentry.captureException(error, {
          extra: {
            componentName: this.props.componentName,
            componentStack: errorInfo.componentStack,
          },
          tags: { errorBoundary: 'analytics' },
        });
      }
    } catch (importError) {
      // Sentry failed to load (network issue, ad-blocker, etc.)
      // Silently swallow - error monitoring must never break the page
      throw importError; // Re-throw so the outer catch can log appropriately
    }
  }

  render(): React.JSX.Element | null {
    if (this.state.hasError) {
      // Render fallback UI or null
      return (this.props.fallback ?? null) as React.JSX.Element | null;
    }

    return this.props.children as React.JSX.Element | null;
  }
}