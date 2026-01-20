import React from 'react';
import CodeBlock from '@theme/CodeBlock';

export default function QuickStart(): JSX.Element {
  return (
    <section className="py-16 bg-gray-50 dark:bg-gray-900/50 rounded-lg my-8">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-4">
          Quick Start
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
          Get up and running with Soroban in under 5 minutes
        </p>

        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">1. Install Rust and Soroban CLI</h3>
            <CodeBlock language="bash">
              {`# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Soroban CLI
cargo install --locked soroban-cli`}
            </CodeBlock>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">2. Create Your First Contract</h3>
            <CodeBlock language="bash">
              {`# Create new project
soroban contract init hello-soroban
cd hello-soroban

# Build the contract
soroban contract build

# Run tests
cargo test`}
            </CodeBlock>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">3. Deploy to Testnet</h3>
            <CodeBlock language="bash">
              {`# Deploy to testnet
soroban contract deploy \\
  --wasm target/wasm32-unknown-unknown/release/hello_soroban.wasm \\
  --network testnet

# Invoke the contract
soroban contract invoke \\
  --id <CONTRACT_ID> \\
  --network testnet \\
  -- hello --to friend`}
            </CodeBlock>
          </div>

          <div className="text-center pt-4">
            <a
              href="/getting-started/environment-setup"
              className="text-primary hover:text-primary-dark font-semibold"
            >
              View detailed setup guide →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
