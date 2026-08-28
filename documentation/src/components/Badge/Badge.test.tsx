import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Badge, Tag } from './Badge';

describe('Badge Component', () => {
  it('renders with beginner variant', () => {
    render(<Badge variant="beginner" />);
    const badge = screen.getByText('beginner');
    expect(badge).toHaveClass('sb-badge', 'sb-badge--beginner');
  });

  it('renders with custom children', () => {
    render(<Badge variant="new">New Feature</Badge>);
    expect(screen.getByText('New Feature')).toBeInTheDocument();
  });

  it('applies size classes correctly', () => {
    render(<Badge variant="intermediate" size="sm" />);
    const badge = screen.getByText('intermediate');
    expect(badge).toHaveClass('sb-badge--sm');
  });

  it('applies clickable class when clickable prop is true', () => {
    render(<Badge variant="advanced" clickable />);
    const badge = screen.getByText('advanced');
    expect(badge).toHaveClass('sb-badge--clickable');
  });

  it('renders with status role when asStatus is true', () => {
    const { container } = render(<Badge variant="stable" asStatus />);
    const badge = container.querySelector('[role="status"]');
    expect(badge).toBeInTheDocument();
  });

  it('applies aria-label when provided', () => {
    render(<Badge variant="experimental" aria-label="Experimental Feature" />);
    const badge = screen.getByLabelText('Experimental Feature');
    expect(badge).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Badge variant="deprecated" className="custom-class" />);
    const badge = screen.getByText('deprecated');
    expect(badge).toHaveClass('custom-class');
  });

  it('renders with draft variant', () => {
    render(<Badge variant="draft" />);
    const badge = screen.getByText('draft');
    expect(badge).toHaveClass('sb-badge', 'sb-badge--draft');
  });
});

describe('Tag Component', () => {
  it('renders with token variant', () => {
    render(<Tag variant="token" />);
    const tag = screen.getByText('token');
    expect(tag).toHaveClass('sb-tag', 'sb-tag--token');
  });

  it('renders as span by default', () => {
    const { container } = render(<Tag variant="defi" />);
    const tag = container.querySelector('span.sb-tag');
    expect(tag).toBeInTheDocument();
  });

  it('renders as button when clickable and as prop is button', () => {
    const { container } = render(<Tag variant="nft" clickable as="button" />);
    const button = container.querySelector('button.sb-tag');
    expect(button).toBeInTheDocument();
  });

  it('renders as anchor when href is provided', () => {
    const { container } = render(<Tag variant="security" href="/security" />);
    const link = container.querySelector('a.sb-tag[href="/security"]');
    expect(link).toBeInTheDocument();
  });

  it('renders with custom children', () => {
    render(<Tag variant="storage">Storage Patterns</Tag>);
    expect(screen.getByText('Storage Patterns')).toBeInTheDocument();
  });

  it('applies size classes correctly', () => {
    render(<Tag variant="auth" size="lg" />);
    const tag = screen.getByText('auth');
    expect(tag).toHaveClass('sb-tag--lg');
  });

  it('applies clickable class when clickable prop is true', () => {
    render(<Tag variant="governance" clickable />);
    const tag = screen.getByText('governance');
    expect(tag).toHaveClass('sb-tag--clickable');
  });

  it('calls onClick handler when button is clicked', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <Tag variant="error-handling" clickable as="button" onClick={handleClick} />,
    );
    const button = container.querySelector('button');
    if (button) {
      button.click();
      expect(handleClick).toHaveBeenCalled();
    }
  });

  it('renders with error-handling variant', () => {
    render(<Tag variant="error-handling" />);
    const tag = screen.getByText('error-handling');
    expect(tag).toHaveClass('sb-tag', 'sb-tag--error-handling');
  });
});
