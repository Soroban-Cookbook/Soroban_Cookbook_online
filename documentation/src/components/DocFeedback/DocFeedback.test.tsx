import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DocFeedback from './DocFeedback';

const { location, trackFeedback } = vi.hoisted(() => ({
  location: { pathname: '/docs/first' },
  trackFeedback: vi.fn(),
}));
vi.mock('@docusaurus/router', () => ({ useLocation: () => location }));
vi.mock('@site/src/utils/analytics', () => ({
  trackFeedback,
  trackFeedbackDetail: vi.fn(),
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear();
  vi.clearAllMocks();
  location.pathname = '/docs/first';
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderFeedback() {
  act(() => root.render(<DocFeedback />));
}

function button(label: string): HTMLButtonElement {
  const result = Array.from(container.querySelectorAll('button')).find((element) =>
    element.textContent?.trim().endsWith(label),
  );
  if (!result) throw new Error(`Missing ${label} vote button`);
  return result;
}

describe('DocFeedback vote storage', () => {
  it.each([
    ['Yes', 'Yes', 'yes'],
    ['Yes', 'No', 'no'],
    ['No', 'Yes', 'yes'],
  ])('overwrites two quick %s/%s votes with one %s value', (first, second, value) => {
    renderFeedback();
    const firstButton = button(first);
    const secondButton = button(second);
    act(() => {
      firstButton.click();
      secondButton.click();
    });
    expect(trackFeedback).toHaveBeenCalledTimes(2);
    expect(localStorage.length).toBe(1);
    expect(localStorage.getItem('sc-doc-feedback:/docs/first')).toBe(value);
    expect(container.querySelector('[role="status"]')).not.toBeNull();
  });

  it('keeps votes separate by pathname and restores them when returning to a page', () => {
    renderFeedback();
    act(() => button('Yes').click());
    location.pathname = '/docs/second';
    renderFeedback();
    act(() => button('No').click());
    expect(localStorage.length).toBe(2);
    expect(localStorage.getItem('sc-doc-feedback:/docs/first')).toBe('yes');
    expect(localStorage.getItem('sc-doc-feedback:/docs/second')).toBe('no');

    location.pathname = '/docs/first';
    renderFeedback();
    expect(container.textContent).toContain('Thanks for the feedback!');
    expect(container.querySelector('button')).toBeNull();
    expect(trackFeedback).toHaveBeenCalledTimes(2);
  });

  it('reads an existing vote without adding another stored value', () => {
    localStorage.setItem('sc-doc-feedback:/docs/first', 'no');
    renderFeedback();
    expect(container.textContent).toContain('sorry this page missed the mark');
    expect(container.querySelector('button')).toBeNull();
    expect(localStorage.length).toBe(1);
    expect(trackFeedback).not.toHaveBeenCalled();
  });
});
