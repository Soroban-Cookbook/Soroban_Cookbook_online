import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Layout from '@theme/Layout';

// Simulates a compiled MDX doc page React tree, representing `docs/concepts/introduction.md`
const MockCompiledMdxDocPage = () => {
  return (
    <Layout
      title="What is Soroban? - Soroban Cookbook"
      description="Introduction to Soroban, Stellar's smart contract platform.">
      <article className="markdown-body">
        <header>
          <h1>What is Soroban?</h1>
        </header>

        <section>
          <p>
            Welcome to Soroban, Stellar&apos;s smart contract platform. This guide introduces you to
            Soroban and explains why it matters in the Stellar ecosystem.
          </p>

          <h2>The Basics</h2>
          <p>
            <strong>Soroban</strong> is a smart contract platform built on the Stellar network that
            lets you write, deploy, and execute smart contracts using Rust. Think of smart contracts
            as programs that run on a blockchain—they execute automatically when conditions are met,
            and their results are permanently recorded.
          </p>
        </section>

        <section>
          <h2>Why Soroban Matters</h2>
          <ul>
            <li>
              <strong>Built for Real-World Use</strong>: Sub-second finality and very low fees.
            </li>
            <li>
              <strong>Developer-Friendly</strong>: Rust-powered memory safety and standard Cargo
              tools.
            </li>
          </ul>
        </section>

        <section>
          <h2>Your Learning Path</h2>
          <p>Ready to start building? Here is the recommended path:</p>
          <ol>
            <li>
              <a href="/docs/getting-started/setup">Environment Setup</a> - Get your development
              tools ready
            </li>
            <li>
              <a href="/docs/getting-started/first-contract">Your First Contract</a> - Build and
              test a simple contract
            </li>
          </ol>
        </section>
      </article>
    </Layout>
  );
};

describe('MDX Documentation Page Simulation Integration Test', () => {
  it('renders a compiled MDX documentation page correctly inside the Docusaurus React tree', () => {
    render(<MockCompiledMdxDocPage />);

    // 1. Verify Docusaurus layout is initialized and rendered with correct title and description
    const layout = screen.getByTestId('layout');
    expect(layout).toBeInTheDocument();
    expect(layout).toHaveAttribute('data-title', 'What is Soroban? - Soroban Cookbook');
    expect(layout).toHaveAttribute(
      'data-description',
      "Introduction to Soroban, Stellar's smart contract platform.",
    );

    // 2. Verify navigation header is present
    expect(screen.getByTestId('mock-navbar')).toBeInTheDocument();
    expect(screen.getByText('Soroban Cookbook')).toBeInTheDocument();
    expect(screen.getByText('Docs')).toBeInTheDocument();

    // 3. Verify main headings exist
    expect(screen.getByRole('heading', { name: 'What is Soroban?', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The Basics', level: 2 })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Why Soroban Matters', level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Your Learning Path', level: 2 }),
    ).toBeInTheDocument();

    // 4. Verify MDX content and structures are loaded successfully
    expect(
      screen.getByText(/Welcome to Soroban, Stellar's smart contract platform./i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Sub-second finality and very low fees./i)).toBeInTheDocument();

    // 5. Verify links inside MDX load and point to appropriate documentation paths
    const setupLink = screen.getByRole('link', { name: 'Environment Setup' });
    expect(setupLink).toBeInTheDocument();
    expect(setupLink).toHaveAttribute('href', '/docs/getting-started/setup');

    const firstContractLink = screen.getByRole('link', { name: 'Your First Contract' });
    expect(firstContractLink).toBeInTheDocument();
    expect(firstContractLink).toHaveAttribute('href', '/docs/getting-started/first-contract');

    // 6. Verify footer
    expect(screen.getByTestId('mock-footer')).toBeInTheDocument();
  });
});
