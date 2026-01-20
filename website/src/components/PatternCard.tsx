import React from 'react';
import Link from '@docusaurus/Link';

interface PatternMetadata {
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  prerequisites?: string[];
  solidityEquivalent?: string;
  tags?: string[];
}

interface PatternCardProps {
  metadata: PatternMetadata;
  children: React.ReactNode;
}

const difficultyColors = {
  beginner: 'badge-beginner',
  intermediate: 'badge-intermediate',
  advanced: 'badge-advanced',
};

const difficultyEmojis = {
  beginner: '🟢',
  intermediate: '🟡',
  advanced: '🔴',
};

export default function PatternCard({ metadata, children }: PatternCardProps): JSX.Element {
  return (
    <div className="pattern-card mb-8">
      {/* Header */}
      <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{metadata.title}</h1>
            <p className="text-lg text-gray-700 dark:text-gray-300">{metadata.description}</p>
          </div>
          <div className="flex flex-col gap-2">
            <span className={difficultyColors[metadata.difficulty]}>
              {difficultyEmojis[metadata.difficulty]} {metadata.difficulty}
            </span>
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">⏱️ Estimated Time:</span>
            <span className="text-gray-600 dark:text-gray-400">{metadata.estimatedTime}</span>
          </div>

          {metadata.solidityEquivalent && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">🔄 Solidity Equivalent:</span>
              <span className="text-gray-600 dark:text-gray-400">{metadata.solidityEquivalent}</span>
            </div>
          )}

          {metadata.tags && metadata.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 text-sm">
              {metadata.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Prerequisites */}
        {metadata.prerequisites && metadata.prerequisites.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
            <p className="font-semibold text-sm mb-2">📋 Prerequisites:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {metadata.prerequisites.map((prereq) => (
                <li key={prereq} className="text-gray-700 dark:text-gray-300">{prereq}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="prose dark:prose-invert max-w-none">
        {children}
      </div>
    </div>
  );
}
