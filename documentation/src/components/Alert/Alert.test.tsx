import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Alert from './Alert';
import styles from './Alert.module.css';

describe('Alert Component', () => {
  it('renders successfully with default props', () => {
    render(<Alert>Default Alert Message</Alert>);
    const alertElement = screen.getByRole('alert');
    expect(alertElement).toBeInTheDocument();
    expect(screen.getByText('Default Alert Message')).toBeInTheDocument();
    expect(alertElement).toHaveClass(styles.alert, styles['alert--info'], styles['alert--block']);
  });

  it('renders different variants correctly', () => {
    const { rerender } = render(<Alert variant="warning">Warning message</Alert>);
    let alertElement = screen.getByRole('alert');
    expect(alertElement).toHaveClass(styles['alert--warning']);

    rerender(<Alert variant="error">Error message</Alert>);
    alertElement = screen.getByRole('alert');
    expect(alertElement).toHaveClass(styles['alert--error']);

    rerender(<Alert variant="success">Success message</Alert>);
    alertElement = screen.getByRole('alert');
    expect(alertElement).toHaveClass(styles['alert--success']);
  });

  it('renders different displays correctly', () => {
    render(<Alert display="inline">Inline alert</Alert>);
    const alertElement = screen.getByRole('alert');
    expect(alertElement).toHaveClass(styles['alert--inline']);
  });

  it('renders custom title when provided', () => {
    render(<Alert title="Important Title">Alert body</Alert>);
    expect(screen.getByText('Important Title')).toBeInTheDocument();
    expect(screen.getByText('Alert body')).toBeInTheDocument();
  });

  it('hides icon when icon prop is false', () => {
    const { container } = render(<Alert icon={false}>No Icon Alert</Alert>);
    // The icon container div should not be present
    const iconContainer = container.querySelector(`.${styles.alert__icon}`);
    expect(iconContainer).not.toBeInTheDocument();
  });

  it('renders custom icon when provided', () => {
    render(<Alert icon={<span data-testid="custom-icon">🔥</span>}>Custom Icon Alert</Alert>);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Alert className="my-custom-class">Class Alert</Alert>);
    const alertElement = screen.getByRole('alert');
    expect(alertElement).toHaveClass('my-custom-class');
  });

  it('calls onClose callback when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<Alert onClose={handleClose}>Dismissible Alert</Alert>);

    const closeButton = screen.getByRole('button', { name: /close alert/i });
    expect(closeButton).toBeInTheDocument();

    closeButton.click();
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('has appropriate aria-live attribute for variant', () => {
    const { rerender } = render(<Alert variant="error">Error Alert</Alert>);
    let alertElement = screen.getByRole('alert');
    expect(alertElement).toHaveAttribute('aria-live', 'assertive');

    rerender(<Alert variant="info">Info Alert</Alert>);
    alertElement = screen.getByRole('alert');
    expect(alertElement).toHaveAttribute('aria-live', 'polite');
  });
});
