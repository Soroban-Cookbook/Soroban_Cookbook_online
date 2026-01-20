import React from 'react';
import Link from '@docusaurus/Link';
import clsx from 'clsx';

export default function HeroSection(): JSX.Element {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
            Soroban Cookbook
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8">
            A comprehensive guide to building smart contracts on Stellar with Soroban
          </p>
          <p className="text-lg text-gray-500 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
            From your first "Hello World" to production DeFi protocols.
            Clear examples, best practices, and interactive code playgrounds.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/getting-started/what-is-soroban"
              className={clsx(
                'px-8 py-4 rounded-lg font-semibold text-lg',
                'bg-primary text-white hover:bg-primary-dark hover:text-white',
                'transform hover:scale-105 transition-all duration-200',
                'no-underline'
              )}
            >
              Get Started →
            </Link>
            <Link
              to="/patterns"
              className={clsx(
                'px-8 py-4 rounded-lg font-semibold text-lg',
                'border-2 border-primary text-primary',
                'hover:bg-primary hover:text-white',
                'transform hover:scale-105 transition-all duration-200',
                'no-underline'
              )}
            >
              Browse Patterns
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚀</span>
              <span>Sub-second finality</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">💰</span>
              <span>Minimal transaction costs</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🦀</span>
              <span>Powered by Rust</span>
            </div>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl" />
      </div>
    </section>
  );
}
