import { themes as prismThemes } from 'prism-react-renderer';
import type { PrismTheme } from 'prism-react-renderer';

/**
 * prism-react-renderer's `github` light theme fails WCAG AA on its own
 * #f6f8fa code background — several token colours land between 2.6:1 and
 * 4.5:1, which axe-core reports as serious `color-contrast` violations on
 * every page containing a Rust snippet.
 *
 * This keeps the theme's hues and only darkens the offending colours until
 * each clears 4.5:1. Ratios below are against #f6f8fa.
 *
 * The dark theme (`vsDark`) already passes and is used unchanged.
 */
const ACCESSIBLE_COLORS: Record<string, string> = {
  '#999988': '#5d5d57', // comment            2.7 → 6.2
  '#e3116c': '#b3005a', // string, attr-value 4.3 → 6.4
  '#36acaa': '#116e6c', // number, property…  2.6 → 5.7
  '#00a4db': '#0a6c8f', // keyword, attr-name 2.7 → 5.6
  '#d73a49': '#b31d28', // function, tag      4.3 → 6.3
};

const accessibleGithub: PrismTheme = {
  ...prismThemes.github,
  styles: prismThemes.github.styles.map((entry) => {
    const style = { ...entry.style };

    if (typeof style.color === 'string') {
      const replacement = ACCESSIBLE_COLORS[style.color.toLowerCase()];
      if (replacement) style.color = replacement;
    }

    // `namespace` is dimmed to 0.7, which drops the plain colour to 4.5:1.
    // Full opacity keeps it legible; it stays visually distinct via its hue.
    if (typeof style.opacity === 'number' && style.opacity < 1) {
      style.opacity = 1;
    }

    return { ...entry, style };
  }),
};

export default accessibleGithub;
