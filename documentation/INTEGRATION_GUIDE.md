# Integration Guide: Recommendation Widget

## Overview

This guide shows how to integrate the recommendation tracking system into your pattern documentation pages.

## Step 1: Import Components

```typescript
import { RecommendationWidget } from '@/components/recommendations';
import { trackPatternView } from '@/lib/recommendations/tracker';
```

## Step 2: Define Your Patterns

Create a constants file listing all available patterns:

```typescript
// lib/recommendations/patterns.ts
export const SOROBAN_PATTERNS = [
  'hello-world',
  'custom-types',
  'error-handling',
  'error-recovery',
  'lifecycle-upgrades',
  'optimization-playbook',
];
```

## Step 3: Create Pattern Card Component

```typescript
// components/PatternCard.tsx
import { Badge } from '@/components/Badge';
import Link from 'next/link';

export function PatternCard({ patternId }: { patternId: string }) {
  const patternInfo = {
    'hello-world': {
      title: 'Hello World',
      description: 'Start here',
      difficulty: 'beginner',
    },
    'custom-types': {
      title: 'Custom Types',
      description: 'Define custom data structures',
      difficulty: 'intermediate',
    },
    // ... more patterns
  };

  const info = patternInfo[patternId];

  return (
    <Link href={`/patterns/${patternId}`}>
      <div className="pattern-card">
        <h4>{info.title}</h4>
        <p>{info.description}</p>
        <Badge variant={info.difficulty}>{info.difficulty}</Badge>
      </div>
    </Link>
  );
}
```

## Step 4: Integrate Widget on Pattern Pages

### Option A: MDX Pattern (Recommended)

In your MDX files (e.g., `docs/patterns/hello-world.mdx`):

```mdx
---
title: Hello World Pattern
---

import { RecommendationWidget } from '@/components/recommendations';
import { PatternCard } from '@/components/PatternCard';
import { SOROBAN_PATTERNS } from '@/lib/recommendations/patterns';

# Hello World Pattern

[Your pattern content here...]

## Related Patterns

<RecommendationWidget
  currentPatternId="hello-world"
  allPatternIds={SOROBAN_PATTERNS}
  renderPattern={(id) => <PatternCard patternId={id} />}
  maxRecommendations={3}
/>
```

### Option B: React Component

```tsx
// components/PatternPage.tsx
import { RecommendationWidget } from '@/components/recommendations';
import { PatternCard } from './PatternCard';
import { SOROBAN_PATTERNS } from '@/lib/recommendations/patterns';

export function PatternPage({ patternId, children }) {
  return (
    <article>
      <div className="pattern-content">
        {children}
      </div>

      <aside className="pattern-sidebar">
        <RecommendationWidget
          currentPatternId={patternId}
          allPatternIds={SOROBAN_PATTERNS}
          renderPattern={(id) => <PatternCard patternId={id} />}
          maxRecommendations={3}
        />
      </aside>
    </article>
  );
}
```

### Option C: Manual Tracking

If you can't use the widget component, still track views:

```typescript
import { trackPatternView } from '@/lib/recommendations/tracker';

useEffect(() => {
  trackPatternView('hello-world');
}, []);
```

## Step 5: Customize Styling

Override CSS variables or add custom styles:

```css
/* docs/patterns/patterns.css */

:root {
  --color-surface: #ffffff;
  --color-border: #e0e0e0;
  --color-text-primary: #1a1a1a;
  --color-text-muted: #666666;
}

[data-theme='dark'] {
  --color-surface: #1e1e1e;
  --color-border: #404040;
  --color-text-primary: #ffffff;
  --color-text-muted: #aaaaaa;
}

.pattern-sidebar {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
}
```

## Step 6: Test Locally

```bash
# Terminal 1: Run docs server
npm run start

# Terminal 2: Run tests
npm test
```

Visit `http://localhost:3000/patterns/hello-world` and verify:

1. ✅ Widget appears on pattern pages
2. ✅ Console shows no errors
3. ✅ Related patterns section visible (may be empty initially)
4. ✅ Navigation between patterns works
5. ✅ Recommendations improve after viewing multiple patterns

## Testing Recommendations

```typescript
// In your test file
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PatternPage } from '@/components/PatternPage';
import { clearTrackerData } from '@/lib/recommendations/tracker';

describe('Pattern Pages', () => {
  beforeEach(() => {
    clearTrackerData();
  });

  it('displays recommendation widget', () => {
    render(<PatternPage patternId="hello-world">Content</PatternPage>);

    expect(screen.getByText('Related Patterns')).toBeDefined();
  });

  it('shows empty state initially', () => {
    render(<PatternPage patternId="hello-world">Content</PatternPage>);

    expect(
      screen.getByText('No related patterns found yet. Keep exploring!')
    ).toBeDefined();
  });
});
```

## Analytics & Monitoring

Track recommendation metrics:

```typescript
import { getAllInteractions } from '@/lib/recommendations/tracker';

export function RecommendationAnalytics() {
  const interactions = getAllInteractions();

  const stats = {
    totalPatternViews: interactions.reduce((sum, i) => sum + i.viewCount, 0),
    uniquePatternsViewed: interactions.length,
    mostViewed: interactions.sort((a, b) => b.viewCount - a.viewCount)[0],
    lastUpdated: new Date(Math.max(...interactions.map(i => i.timestamp))),
  };

  return (
    <div>
      <h3>Recommendation Stats</h3>
      <p>Total Views: {stats.totalPatternViews}</p>
      <p>Unique Patterns: {stats.uniquePatternsViewed}</p>
      <p>Most Viewed: {stats.mostViewed?.patternId}</p>
    </div>
  );
}
```

## Clearing History (Admin Function)

```typescript
import { clearTrackerData } from '@/lib/recommendations/tracker';

export function AdminPanel() {
  return (
    <button
      onClick={() => {
        clearTrackerData();
        alert('Recommendation history cleared');
      }}
    >
      Reset Recommendations
    </button>
  );
}
```

## Common Patterns to Track

```typescript
// docs/patterns/patterns.ts
export const PATTERN_STRUCTURE = {
  'hello-world': {
    title: 'Hello World',
    category: 'Getting Started',
    difficulty: 'beginner',
    tags: ['basics', 'introduction'],
  },
  'custom-types': {
    title: 'Custom Types',
    category: 'Advanced',
    difficulty: 'intermediate',
    tags: ['types', 'contracts'],
  },
  'error-handling': {
    title: 'Error Handling',
    category: 'Patterns',
    difficulty: 'intermediate',
    tags: ['error', 'recovery'],
  },
  'error-recovery': {
    title: 'Error Recovery',
    category: 'Patterns',
    difficulty: 'advanced',
    tags: ['error', 'recovery'],
  },
  'lifecycle-upgrades': {
    title: 'Lifecycle & Upgrades',
    category: 'Advanced',
    difficulty: 'advanced',
    tags: ['lifecycle', 'upgrade'],
  },
  'optimization-playbook': {
    title: 'Optimization Playbook',
    category: 'Advanced',
    difficulty: 'advanced',
    tags: ['optimization', 'performance'],
  },
};
```

## Troubleshooting

### Recommendations Not Appearing

```typescript
// Check if tracking is working
import { hasTrackerData, getAllInteractions } from '@/lib/recommendations/tracker';

console.log('Has data:', hasTrackerData());
console.log('Interactions:', getAllInteractions());
```

### localStorage Issues

```typescript
// Check localStorage is accessible
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
  console.log('localStorage OK');
} catch (e) {
  console.error('localStorage unavailable:', e);
}
```

### Performance Issues

If widget renders too often:

```typescript
// Use React.memo to prevent unnecessary rerenders
export const PatternCard = React.memo(({ patternId }: { patternId: string }) => {
  // ... component
});
```

## Metrics to Track

```typescript
// Log recommendation quality
import { getRecommendationScores } from '@/lib/recommendations/tracker';

const scores = getRecommendationScores(['pattern1', 'pattern2']);
console.log('Top recommendation score:', scores[0].score);

// Scores should range from 0-1
// If all scores are 0, no patterns have been viewed yet
// If top score < 0.3, recommendations may be stale
```

## Best Practices

1. **Always track on page load** - Even if not showing recommendations
2. **Exclude current pattern** - Widget handles this automatically
3. **Limit to top 3** - Default is sensible, more = visual clutter
4. **Test with multiple patterns** - Recommendations need 5+ views to appear good
5. **Monitor localStorage** - Check quota usage in production
6. **Privacy-aware** - Tracking is client-side only, no analytics sent

## Production Checklist

- [ ] Widget renders without errors
- [ ] localStorage working (test in DevTools)
- [ ] Recommendations update after viewing patterns
- [ ] Empty state shows initially
- [ ] Recommendations improve over time
- [ ] All links work correctly
- [ ] Mobile responsive
- [ ] Dark mode styling correct
- [ ] Accessibility: ARIA labels present
- [ ] Performance: No slow renders

## Support

For issues or questions:

1. Check `TEST_SETUP.md` for testing guidance
2. Review `TEST_SUMMARY.md` for API reference
3. Run tests: `npm run test:run`
4. Check tracker module: `lib/recommendations/tracker.ts`
