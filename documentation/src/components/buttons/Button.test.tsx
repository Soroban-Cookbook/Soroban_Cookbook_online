import React, { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Button from './Button';
import styles from './buttons.module.css';

describe('Button Component', () => {
  it('renders successfully with default props', () => {
    render(<Button>Click me</Button>);
    const buttonElement = screen.getByRole('button', { name: /click me/i });
    expect(buttonElement).toBeInTheDocument();
    expect(buttonElement).toHaveAttribute('type', 'button');
    expect(buttonElement).toHaveClass(styles.btn, styles.btnPrimary, styles.btnMedium);
  });

  it('renders different variants correctly', () => {
    const { rerender } = render(<Button variant="secondary">Secondary</Button>);
    let buttonElement = screen.getByRole('button');
    expect(buttonElement).toHaveClass(styles.btnSecondary);

    rerender(<Button variant="tertiary">Tertiary</Button>);
    buttonElement = screen.getByRole('button');
    expect(buttonElement).toHaveClass(styles.btnTertiary);

    rerender(<Button variant="ghost">Ghost</Button>);
    buttonElement = screen.getByRole('button');
    expect(buttonElement).toHaveClass(styles.btnGhost);

    rerender(<Button variant="danger">Danger</Button>);
    buttonElement = screen.getByRole('button');
    expect(buttonElement).toHaveClass(styles.btnDanger);
  });

  it('renders different sizes correctly', () => {
    const { rerender } = render(<Button size="small">Small</Button>);
    let buttonElement = screen.getByRole('button');
    expect(buttonElement).toHaveClass(styles.btnSmall);

    rerender(<Button size="large">Large</Button>);
    buttonElement = screen.getByRole('button');
    expect(buttonElement).toHaveClass(styles.btnLarge);
  });

  it('supports custom type prop', () => {
    render(<Button type="submit">Submit</Button>);
    const buttonElement = screen.getByRole('button');
    expect(buttonElement).toHaveAttribute('type', 'submit');
  });

  it('applies fullWidth and iconOnly classes when props are true', () => {
    const { rerender } = render(<Button fullWidth>Full Width</Button>);
    let buttonElement = screen.getByRole('button');
    expect(buttonElement).toHaveClass(styles.btnFullWidth);

    rerender(
      <Button iconOnly aria-label="Icon Only">
        Icon Only
      </Button>,
    );
    buttonElement = screen.getByRole('button');
    expect(buttonElement).toHaveClass(styles.btnIcon, styles.btnIconOnly);
  });

  it('handles loading state with a spinner', () => {
    render(<Button loading>Loading state</Button>);
    const buttonElement = screen.getByRole('button');
    expect(buttonElement).toBeDisabled();
    expect(buttonElement).toHaveAttribute('aria-busy', 'true');
    expect(buttonElement).toHaveClass(styles.btnLoading);

    // Should have loading spinner element
    const spinner = buttonElement.querySelector(`.${styles.loadingSpinner}`);
    expect(spinner).toBeInTheDocument();
  });

  it('handles loading state with loading text', () => {
    render(
      <Button loading loadingText="Saving...">
        Save
      </Button>,
    );
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.queryByText('Save')).not.toBeInTheDocument();

    // Spinner should NOT be shown if loadingText is provided
    const buttonElement = screen.getByRole('button');
    const spinner = buttonElement.querySelector(`.${styles.loadingSpinner}`);
    expect(spinner).not.toBeInTheDocument();
  });

  it('renders start and end icons correctly', () => {
    render(
      <Button
        startIcon={<span data-testid="start-icon">◀</span>}
        endIcon={<span data-testid="end-icon">▶</span>}>
        With Icons
      </Button>,
    );
    expect(screen.getByTestId('start-icon')).toBeInTheDocument();
    expect(screen.getByTestId('end-icon')).toBeInTheDocument();
  });

  it('disables button and handles click events', () => {
    const handleClick = vi.fn();
    const { rerender } = render(<Button onClick={handleClick}>Click me</Button>);

    const buttonElement = screen.getByRole('button');
    buttonElement.click();
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Disable button
    rerender(
      <Button onClick={handleClick} disabled>
        Disabled Button
      </Button>,
    );
    expect(buttonElement).toBeDisabled();
    expect(buttonElement).toHaveAttribute('aria-disabled', 'true');
    buttonElement.click();
    expect(handleClick).toHaveBeenCalledTimes(1); // Click should not have triggered again
  });

  it('correctly forwards refs to the HTML button element', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref Button</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('applies custom className and forwards other attributes', () => {
    render(
      <Button className="my-custom-btn" data-testid="btn" aria-expanded="true">
        Test
      </Button>,
    );
    const buttonElement = screen.getByTestId('btn');
    expect(buttonElement).toHaveClass('my-custom-btn');
    expect(buttonElement).toHaveAttribute('aria-expanded', 'true');
  });
});
