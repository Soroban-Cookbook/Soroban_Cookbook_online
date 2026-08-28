import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Callout from './Callout';
import styles from './Callout.module.css';

describe('Callout Component', () => {
  it('renders successfully with default props', () => {
    render(<Callout>This is some callout content</Callout>);
    const calloutElement = screen.getByRole('note');
    expect(calloutElement).toBeInTheDocument();
    expect(screen.getByText('This is some callout content')).toBeInTheDocument();
    // Default title is "Info" for info variant
    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(calloutElement).toHaveClass(styles.callout, styles['callout--info']);
  });

  it('renders different variants with appropriate default titles and styles', () => {
    const { rerender } = render(<Callout variant="warning">Warning callout</Callout>);
    let calloutElement = screen.getByRole('note');
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(calloutElement).toHaveClass(styles['callout--warning']);

    rerender(<Callout variant="error">Error callout</Callout>);
    calloutElement = screen.getByRole('note');
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(calloutElement).toHaveClass(styles['callout--error']);

    rerender(<Callout variant="success">Success callout</Callout>);
    calloutElement = screen.getByRole('note');
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(calloutElement).toHaveClass(styles['callout--success']);

    rerender(<Callout variant="tip">Tip callout</Callout>);
    calloutElement = screen.getByRole('note');
    expect(screen.getByText('Tip')).toBeInTheDocument();
    expect(calloutElement).toHaveClass(styles['callout--tip']);
  });

  it('renders custom title when provided', () => {
    render(
      <Callout variant="info" title="Custom Title">
        Callout content
      </Callout>,
    );
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.queryByText('Info')).not.toBeInTheDocument();
  });

  it('hides icon when icon prop is false', () => {
    const { container } = render(<Callout icon={false}>No Icon Callout</Callout>);
    const iconContainer = container.querySelector(`.${styles.callout__icon}`);
    expect(iconContainer).not.toBeInTheDocument();
  });

  it('renders custom icon when provided', () => {
    render(<Callout icon={<span data-testid="custom-icon">⚡</span>}>Custom Icon Callout</Callout>);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Callout className="custom-callout-class">Class Callout</Callout>);
    const calloutElement = screen.getByRole('note');
    expect(calloutElement).toHaveClass('custom-callout-class');
  });

  it('applies appropriate accessibility labels', () => {
    render(
      <Callout variant="tip" title="Pro Tip">
        A tip for you
      </Callout>,
    );
    const calloutElement = screen.getByRole('note');
    expect(calloutElement).toHaveAttribute('aria-label', 'Pro Tip');
  });
});
