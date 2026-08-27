# Recommendation Tracker Test Suite

## Overview

This document describes the comprehensive test suite for the recommendation tracking system that prevents bad tracking from polluting pattern suggestions.

## Project Structure

```
documentation/
├── lib/
│   └── recommendations/
│       ├── tracker.ts              # Core tracker module
│       └── tracker.test.ts          # Tracker unit tests
├── src/
│   └── components/
│       └── recommendations/
│           ├── RecommendationWidget.tsx      # Widget component
│           ├── RecommendationWidget.test.tsx # Widget tests
│           ├── RecommendationWidget.module.css
│           └── index.ts
├── vitest.config.ts                # Vitest configuration
└── vitest.setup.ts                 # Test environment setup
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd documentation
npm install
```

This installs:
- **vitest** - Fast unit test framework with TypeScript support
- **@testing-library/react** - React component testing utilities
- **jsdom** - Browser environment simulation
- **@vitest/ui** - Visual test runner dashboard

### 2. Run Tests

```bash
# Run all tests once
npm run test:run

# Run tests in watch mode (for development)
npm test

# Run with UI dashboard
npm run test:ui
```

## Test Coverage

### Tracker Module (`tracker.test.ts`)

The tracker module maintains a localStorage-based history of pattern interactions and provides scoring for recommendations.

#### Core Functionality Tests
- **State Management**: Getting and saving tracker state, handling corrupted data
- **Pattern Tracking**: Incremental view counting, timestamp updates, history bounding
- **Scoring Algorithm**: Recency decay (60% weight), frequency (40% weight), view count capping
- **Recommendations**: Top-N filtering, pattern exclusion, default limits

#### Edge Cases & Contamination Tests
- **Bad Tracking Pollution**: Prevents spam patterns (100+ views) from drowning out legitimate patterns
- **Large View Counts**: Handles extreme view counts gracefully with bounded scores
- **Mixed Old/New Data**: Properly applies recency decay (30+ day old patterns score < 0.3)
- **History Integrity**: Maintains data consistency after 250+ operations
- **Empty History**: All functions handle empty/no-data states

#### Server-Side Rendering
- Gracefully handles SSR (no `window` object)
- localStorage unavailable scenarios

### Widget Component (`RecommendationWidget.test.tsx`)

The widget consumes tracker data and displays recommendations to users.

#### Rendering Tests
- Empty state (no recommendations yet)
- Populated state with multiple recommendations
- Custom styling and className support
- Correct title and structure

#### Tracking Integration Tests
- Tracks current pattern view on mount
- Tracks on pattern changes
- Fetches recommendations for current pattern
- Excludes current pattern from suggestions
- Updates recommendations when pattern list changes

#### Props & Configuration Tests
- Custom `maxRecommendations` limit
- Default limit of 3 recommendations
- Custom render functions for pattern items
- Proper prop passing to tracker functions

#### Edge Cases
- Empty pattern list
- Single pattern (no recommendations possible)
- Rapid pattern changes (stress test)
- Different recommendations for different patterns

## Key Features

### Scoring Algorithm

```typescript
// Formula: 60% recency + 40% frequency
score = (recencyDecay * 0.6) + (viewScore * 0.4)

// Recency decay over 7 days
recencyDecay = max(0, 1 - daysSinceView/7)

// Frequency capped at 10 views
viewScore = min(viewCount, 10) / 10
```

**Benefits:**
- Recent patterns score higher (encourages current workflows)
- View frequency matters but is capped (prevents domination by outliers)
- Old patterns decay to near-zero (clears stale suggestions)

### History Management

- Maximum 50 interactions stored
- When limit exceeded, oldest interactions are pruned
- Each interaction tracks: pattern ID, view count, last viewed timestamp

### Contamination Prevention

The system resists "polluted" tracking through:

1. **View Count Capping** - Max 10 views = 100% frequency score
   - 1,000 views doesn't beat 10 views with high recency
   
2. **Recency Weighting** - 60% of score
   - Patterns unseen for 1 week score near zero
   - Forces recent patterns to be relevant
   
3. **History Pruning** - Maximum 50 patterns
   - Spam patterns get rotated out if user explores other areas
   - Fresh patterns naturally emerge

## Testing Best Practices

### Before Tests
```bash
npm run lint:fix    # Fix linting issues
npm run format      # Format code
```

### Test Execution
```bash
npm run test:run    # CI/CD mode (single run)
npm test            # Development mode (watch)
npm run test:ui     # Interactive dashboard
```

### Debugging Failed Tests
```bash
# Run specific test file
npm run test:run -- tracker.test.ts

# Run tests matching pattern
npm run test:run -- --grep "contamination"

# Verbose output
npm run test:run -- --reporter=verbose
```

## Integration Examples

### Basic Usage

```typescript
// Track a pattern view
trackPatternView('hello-world');

// Get recommendations
const topPatterns = getTopRecommendations(
  ['hello-world', 'custom-types', 'error-handling'],
  3, // max recommendations
  'hello-world' // exclude current
);
```

### Widget Component

```tsx
<RecommendationWidget
  currentPatternId="hello-world"
  allPatternIds={PATTERN_IDS}
  renderPattern={(id) => <PatternCard patternId={id} />}
  maxRecommendations={3}
/>
```

## Verification Checklist

- [ ] All tests pass: `npm run test:run`
- [ ] No type errors: `npm run typecheck`
- [ ] Code formatted: `npm run format:check`
- [ ] Linting passes: `npm run lint`
- [ ] Widget still renders: Manual component check
- [ ] Tracker data persists: localStorage working
- [ ] Empty history case works: Clear data, test suggestions

## Future Improvements

1. **Pattern Tags** - Weight recommendations by tag similarity
2. **User Cohorts** - Track patterns popular in similar user segments
3. **Time Decay** - Seasonal decay for patterns (e.g., less DeFi in bear markets)
4. **Manual Feedback** - User can mark recommendations as useful/not useful
5. **Export Analytics** - Dashboard showing top patterns and trends

## Files Modified

- `documentation/package.json` - Added test dependencies
- `documentation/vitest.config.ts` - Created test configuration
- `documentation/vitest.setup.ts` - Created test environment setup

## Files Created

- `documentation/lib/recommendations/tracker.ts` - Core tracking module (300+ LOC)
- `documentation/lib/recommendations/tracker.test.ts` - Unit tests (500+ LOC, 50+ test cases)
- `documentation/src/components/recommendations/RecommendationWidget.tsx` - React component
- `documentation/src/components/recommendations/RecommendationWidget.test.tsx` - Component tests (350+ LOC)
- `documentation/src/components/recommendations/RecommendationWidget.module.css` - Component styles
- `documentation/src/components/recommendations/index.ts` - Barrel export
