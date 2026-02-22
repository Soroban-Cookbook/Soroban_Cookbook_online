# Stats Component

An impressive animated statistics section with scroll-triggered counter animations.

## Features

- **Animated Counters**: Numbers count up from 0 when scrolled into view
- **Intersection Observer**: Animation triggers only when visible (performance optimized)
- **Smooth Easing**: Uses easeOutQuart for natural animation feel
- **Fully Responsive**: Adapts from 4 columns to 1 column on mobile
- **Hover Effects**: Interactive cards with gradient borders
- **Customizable**: Easy to update numbers and labels

## Usage

```tsx
import Stats from '@site/src/components/Stats';

<Stats />
```

## Customization

Edit `Stats.tsx` to update the statistics:

```tsx
<StatItem end={50} label="Smart Contract Patterns" suffix="+" />
<StatItem end={120} label="Contributors" suffix="+" />
<StatItem end={2400} label="GitHub Stars" suffix="+" />
<StatItem end={5000} label="Community Members" suffix="+" />
```

### Props

- `end`: Target number to count to
- `label`: Description text below the number
- `suffix`: Optional suffix (e.g., "+", "K", "%")
- `duration`: Animation duration in milliseconds (default: 2000)

## Updating Stats

To keep stats accurate, update the numbers in `Stats.tsx`:

1. Check GitHub stars: https://github.com/your-repo
2. Count patterns in `/docs/patterns/`
3. Check contributor count on GitHub
4. Update community size from Discord/forums
