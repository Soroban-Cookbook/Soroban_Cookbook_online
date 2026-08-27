import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  TutorialProgress,
  slugify,
  computeProgressPercent,
  pickActiveIndex,
} from './TutorialProgress';

describe('slugify', () => {
  it('lowercases and hyphenates a heading label', () => {
    expect(slugify('Creating a New Project')).toBe('creating-a-new-project');
  });

  it('strips punctuation', () => {
    expect(slugify('Building & Deploying: Your Contract!')).toBe(
      'building-deploying-your-contract',
    );
  });

  it('trims surrounding whitespace', () => {
    expect(slugify('  Testing Your Contract  ')).toBe('testing-your-contract');
  });
});

describe('computeProgressPercent', () => {
  it('returns 0 for an empty step list', () => {
    expect(computeProgressPercent(0, 0)).toBe(0);
  });

  it('computes the fraction complete, 1-indexed', () => {
    expect(computeProgressPercent(0, 4)).toBe(25);
    expect(computeProgressPercent(1, 4)).toBe(50);
    expect(computeProgressPercent(3, 4)).toBe(100);
  });

  it('clamps an out-of-range index', () => {
    expect(computeProgressPercent(-1, 4)).toBe(25);
    expect(computeProgressPercent(99, 4)).toBe(100);
  });
});

describe('pickActiveIndex', () => {
  it('returns 0 when no heading has been reached yet', () => {
    expect(pickActiveIndex([200, 400, 600], 100)).toBe(0);
  });

  it('returns the last heading whose top is at or above the threshold', () => {
    // First two headings have scrolled above the line; the third hasn't.
    expect(pickActiveIndex([-300, -20, 150], 100)).toBe(1);
  });

  it('returns the final index once every heading has been passed', () => {
    expect(pickActiveIndex([-500, -300, -50], 100)).toBe(2);
  });
});

describe('TutorialProgress', () => {
  const steps = ['Creating a New Project', 'Understanding the Code', 'Testing Your Contract'];

  let observedElements: HTMLElement[] = [];
  let observeMock: ReturnType<typeof vi.fn>;
  let disconnectMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    observedElements = [];
    observeMock = vi.fn((el: HTMLElement) => observedElements.push(el));
    disconnectMock = vi.fn();

    // jsdom has no IntersectionObserver; stub it so the component's effect
    // runs without throwing. The scroll-spy recompute logic itself is
    // covered separately by the pure `pickActiveIndex` tests above.
    // Must be a real constructor function (not an arrow function) since the
    // component calls it with `new`.
    class MockIntersectionObserver {
      observe = observeMock;
      disconnect = disconnectMock;
    }
    (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
      MockIntersectionObserver;

    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    delete (globalThis as unknown as { IntersectionObserver?: unknown }).IntersectionObserver;
    document.body.innerHTML = '';
  });

  it('renders nothing when there are no steps', () => {
    const { container } = render(<TutorialProgress steps={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders every step label with the first step marked current', () => {
    render(<TutorialProgress steps={steps} />);

    for (const label of steps) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveAttribute('aria-current', 'step');
    expect(buttons[1]).not.toHaveAttribute('aria-current');
  });

  it('observes the matching heading elements on mount', () => {
    steps.forEach((label) => {
      const heading = document.createElement('h2');
      heading.id = slugify(label);
      document.body.appendChild(heading);
    });

    render(<TutorialProgress steps={steps} />);

    expect(observedElements).toHaveLength(steps.length);
  });

  it('scrolls to and activates a step when clicked', () => {
    const heading = document.createElement('h2');
    heading.id = slugify(steps[2]);
    document.body.appendChild(heading);

    render(<TutorialProgress steps={steps} />);

    fireEvent.click(screen.getByText(steps[2]));

    expect(heading.scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth' }),
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons[2]).toHaveAttribute('aria-current', 'step');
    // Earlier steps are now shown as complete.
    expect(buttons[0]).not.toHaveAttribute('aria-current');
  });

  it('disconnects the observer on unmount', () => {
    steps.forEach((label) => {
      const heading = document.createElement('h2');
      heading.id = slugify(label);
      document.body.appendChild(heading);
    });

    const { unmount } = render(<TutorialProgress steps={steps} />);
    unmount();
    expect(disconnectMock).toHaveBeenCalled();
  });
});
