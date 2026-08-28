import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TokensPage from '../patterns/tokens';

describe('Tokens Landing/Doc Page Integration Test', () => {
  it('renders the complete tokens pattern documentation page successfully within Docusaurus layout', () => {
    render(<TokensPage />);

    // 1. Verify Layout is mounted with proper meta title & description
    const layout = screen.getByTestId('layout');
    expect(layout).toBeInTheDocument();
    expect(layout).toHaveAttribute('data-title', 'Token Patterns - Soroban Cookbook');
    expect(layout).toHaveAttribute(
      'data-description',
      'Fungible token standards, wrappers, and vaults for Soroban smart contracts.',
    );

    // 2. Verify navigation and header elements are present
    expect(screen.getByTestId('mock-navbar')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Token Standards & Patterns/i, level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Master fungible token implementation, wrappers, and vault mechanisms for Soroban./i,
      ),
    ).toBeInTheDocument();

    // 3. Verify Back navigation link
    const backBtn = screen.getByRole('link', { name: /Back to Patterns/i });
    expect(backBtn).toBeInTheDocument();
    expect(backBtn).toHaveAttribute('href', '/docs/patterns/overview');

    // 4. Verify PatternPreview section and patterns (token_contract, token_wrapper, token_vault)
    expect(screen.getByText(/Token Patterns/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Explore production-ready token contract implementations/i),
    ).toBeInTheDocument();

    expect(screen.getByText('token_contract')).toBeInTheDocument();
    expect(screen.getByText('token_wrapper')).toBeInTheDocument();
    expect(screen.getByText('token_vault')).toBeInTheDocument();

    // 5. Expand pattern code blocks and verify code snippets render
    const showBtns = screen.getAllByRole('button', { name: /Show.*example/i });
    expect(showBtns.length).toBe(3);

    // Click the show buttons to expand code blocks
    fireEvent.click(showBtns[0]);
    fireEvent.click(showBtns[1]);
    fireEvent.click(showBtns[2]);

    // Now verify code snippets are visible on the page
    expect(screen.getByText(/pub fn mint/)).toBeInTheDocument();
    expect(screen.getByText(/pub fn wrap_token/)).toBeInTheDocument();
    expect(screen.getByText(/pub fn deposit/)).toBeInTheDocument();

    // 6. Verify footer
    expect(screen.getByTestId('mock-footer')).toBeInTheDocument();
  });
});
