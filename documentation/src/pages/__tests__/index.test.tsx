import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '../index';

describe('Homepage Integration Test', () => {
  it('renders the complete homepage successfully within Docusaurus layout', () => {
    render(<Home />);

    // 1. Verify Layout is mounted with proper meta title & description
    const layout = screen.getByTestId('layout');
    expect(layout).toBeInTheDocument();
    expect(layout).toHaveAttribute('data-title', 'Soroban Cookbook');
    expect(layout).toHaveAttribute(
      'data-description',
      'Master Soroban smart contracts with practical patterns and production-ready guides.',
    );

    // 2. Verify navigation components render
    expect(screen.getByTestId('mock-navbar')).toBeInTheDocument();
    expect(screen.getByText('Soroban Cookbook')).toBeInTheDocument();

    // 3. Verify Hero section and page content
    expect(
      screen.getByRole('heading', { name: /Build Smart Contracts/i, level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /A modern, practical guide to building secure and optimized Soroban applications on Stellar./i,
      ),
    ).toBeInTheDocument();

    // 4. Verify Call To Action buttons/links
    const getStartedBtn = screen.getByRole('link', { name: /Get Started/i });
    expect(getStartedBtn).toBeInTheDocument();
    expect(getStartedBtn).toHaveAttribute('href', '/docs');

    const viewPatternsBtn = screen.getByRole('link', { name: /View Patterns/i });
    expect(viewPatternsBtn).toBeInTheDocument();
    expect(viewPatternsBtn).toHaveAttribute('href', '/docs/patterns/overview');

    // 5. Verify PatternPreview section is rendered
    expect(screen.getByText(/Popular Patterns/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Explore production-ready smart contract patterns used by developers worldwide/i,
      ),
    ).toBeInTheDocument();

    // 6. Verify sample patterns (e.g. hello_world, token_contract, etc.) render
    expect(screen.getByText('hello_world')).toBeInTheDocument();
    expect(screen.getByText('token_contract')).toBeInTheDocument();
    expect(screen.getByText('voting_contract')).toBeInTheDocument();

    // 7. Verify stats elements are rendered (via Stats component)
    expect(screen.getByText(/Trusted by the Community/i)).toBeInTheDocument();
    expect(screen.getByText('Smart Contract Patterns')).toBeInTheDocument();
    expect(screen.getByText('Contributors')).toBeInTheDocument();
    expect(screen.getByText('GitHub Stars')).toBeInTheDocument();

    // 8. Verify QuickStartSection
    expect(screen.getByRole('heading', { name: /Quick Start/i, level: 2 })).toBeInTheDocument();
    expect(screen.getAllByText(/HelloContract/)[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy code/i })).toBeInTheDocument();

    // 9. Verify NewsletterSignup section
    expect(
      screen.getByRole('heading', { name: /Stay in the loop/i, level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeInTheDocument();

    // 10. Verify footer is rendered
    expect(screen.getByTestId('mock-footer')).toBeInTheDocument();
  });

  it('allows interaction with CTA buttons', () => {
    render(<Home />);

    const getStartedBtn = screen.getByRole('link', { name: /Get Started/i });
    fireEvent.click(getStartedBtn);
    // Verified that navigation/action can be triggered without errors
  });
});
