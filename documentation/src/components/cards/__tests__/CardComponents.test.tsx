import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BaseCard, FeatureCard, ActionCard, GradientCard, PatternCard } from '..';

// ── BaseCard tests ───────────────────────────────────────────────

describe('BaseCard', () => {
  it('renders children correctly', () => {
    render(<BaseCard>Hello world</BaseCard>);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders as <a> when href is provided', () => {
    render(<BaseCard href="/test">Link card</BaseCard>);
    const link = screen.getByRole('link', { name: 'Link card' });
    expect(link).toHaveAttribute('href', '/test');
  });

  it('renders as <button> when onClick is provided', () => {
    const handleClick = vi.fn();
    render(<BaseCard onClick={handleClick}>Button card</BaseCard>);
    const button = screen.getByRole('button', { name: 'Button card' });
    button.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('accepts aria-label and custom className', () => {
    render(
      <BaseCard ariaLabel="My card" className="custom-class">
        Content
      </BaseCard>,
    );
    const card = screen.getByLabelText('My card');
    expect(card).toHaveClass('custom-class');
  });
});

// ── FeatureCard tests ─────────────────────────────────────────────

describe('FeatureCard', () => {
  const defaultProps = {
    icon: '⚡',
    title: 'Fast Performance',
    description: 'Optimized rendering',
    accent: '#6366f1',
  };

  it('renders title, description and icon', () => {
    render(<FeatureCard {...defaultProps} />);
    expect(screen.getByText('Fast Performance')).toBeInTheDocument();
    expect(screen.getByText('Optimized rendering')).toBeInTheDocument();
    expect(screen.getByText('⚡')).toBeInTheDocument();
  });

  it('renders as a link when href is provided', () => {
    render(<FeatureCard {...defaultProps} href="/features" />);
    const link = screen.getByRole('link', { name: 'Fast Performance' });
    expect(link).toHaveAttribute('href', '/features');
  });

  it('has accessible name from title when href exists', () => {
    render(<FeatureCard {...defaultProps} href="/features" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAccessibleName('Fast Performance');
  });
});

// ── ActionCard tests ──────────────────────────────────────────────

describe('ActionCard', () => {
  const defaultProps = {
    title: 'Deploy Ready',
    description: 'All checks passed',
    cta: 'Deploy now',
    variant: 'success' as const,
  };

  it('renders title, description and CTA', () => {
    render(<ActionCard {...defaultProps} />);
    expect(screen.getByText('Deploy Ready')).toBeInTheDocument();
    expect(screen.getByText('All checks passed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deploy now →' })).toBeInTheDocument();
  });

  it('renders CTA as <a> when ctaHref is provided', () => {
    render(<ActionCard {...defaultProps} ctaHref="/deploy" />);
    const link = screen.getByRole('link', { name: 'Deploy now →' });
    expect(link).toHaveAttribute('href', '/deploy');
  });

  it('calls onCtaClick when button clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<ActionCard {...defaultProps} onCtaClick={handleClick} />);
    const button = screen.getByRole('button', { name: 'Deploy now →' });
    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('fires onCtaClick once when activated with Enter', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<ActionCard {...defaultProps} onCtaClick={handleClick} />);
    await user.tab();
    const button = screen.getByRole('button', { name: 'Deploy now →' });
    expect(button).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('fires onCtaClick once when activated with Space', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<ActionCard {...defaultProps} onCtaClick={handleClick} />);
    await user.tab();
    await user.keyboard(' ');
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire onCtaClick on keyboard activation when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<ActionCard {...defaultProps} onCtaClick={handleClick} disabled />);
    const button = screen.getByRole('button', { name: 'Deploy now →' });
    expect(button).toBeDisabled();
    button.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not fire onCtaClick on click when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<ActionCard {...defaultProps} onCtaClick={handleClick} disabled />);
    await user.click(screen.getByRole('button', { name: 'Deploy now →' }));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('reaches the CTA link with the keyboard', async () => {
    const user = userEvent.setup();
    render(<ActionCard {...defaultProps} ctaHref="/deploy" />);
    await user.tab();
    expect(screen.getByRole('link', { name: 'Deploy now →' })).toHaveFocus();
  });

  it('renders a disabled button instead of a link when disabled with ctaHref', () => {
    render(<ActionCard {...defaultProps} ctaHref="/deploy" disabled />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deploy now →' })).toBeDisabled();
  });
});

// ── GradientCard tests ────────────────────────────────────────────

describe('GradientCard', () => {
  const defaultProps = {
    gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
    icon: '🚀',
    stat: '12k',
    label: 'Total deploys',
    title: 'Deployments',
  };

  it('renders stat, label, title and icon', () => {
    render(<GradientCard {...defaultProps} />);
    expect(screen.getByText('12k')).toBeInTheDocument();
    expect(screen.getByText('Total deploys')).toBeInTheDocument();
    expect(screen.getByText('Deployments')).toBeInTheDocument();
    expect(screen.getByText('🚀')).toBeInTheDocument();
  });

  it('renders as a link when href is provided', () => {
    render(<GradientCard {...defaultProps} href="/stats" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/stats');
    expect(link).toHaveAccessibleName('Deployments: 12k');
  });
});

// ── PatternCard tests ─────────────────────────────────────────────

describe('PatternCard', () => {
  const defaultProps = {
    contractName: 'hello_world',
    description: 'A minimal contract demonstrating persistent storage.',
    tag: '#storage',
    code: 'pub fn hello(env: Env) -> String { ... }',
  };

  it('renders contract name, description and tag', () => {
    render(<PatternCard {...defaultProps} />);
    expect(screen.getByText('hello_world')).toBeInTheDocument();
    expect(
      screen.getByText('A minimal contract demonstrating persistent storage.'),
    ).toBeInTheDocument();
    expect(screen.getByText('#storage')).toBeInTheDocument();
  });

  it('shows/hides code when toggle button is clicked', async () => {
    const user = userEvent.setup();
    render(<PatternCard {...defaultProps} />);
    const toggleButton = screen.getByRole('button', { name: /Show example/ });
    expect(screen.queryByLabelText('Code example for hello_world')).not.toBeInTheDocument();

    await user.click(toggleButton);
    const codeBlock = screen.getByLabelText('Code example for hello_world');
    expect(codeBlock).toBeInTheDocument();

    await user.click(toggleButton);
    expect(screen.queryByLabelText('Code example for hello_world')).not.toBeInTheDocument();
  });

  it('renders contract name as a link when href is provided', () => {
    render(<PatternCard {...defaultProps} href="/contracts/hello_world" />);
    const link = screen.getByRole('link', { name: 'hello_world' });
    expect(link).toHaveAttribute('href', '/contracts/hello_world');
  });
});
