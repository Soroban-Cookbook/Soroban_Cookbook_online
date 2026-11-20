/**
 * Tests for the touch gesture client module (issue #1540).
 *
 * Simulates touchstart/touchend sequences on `document` and asserts on the
 * resulting clicks against the hamburger toggle / backdrop, since that is
 * how the module opens/closes the sidebar.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './touchGestureModule';

function dispatchTouch(type: 'touchstart' | 'touchend', clientX: number, clientY: number): void {
  const touch = { clientX, clientY } as Touch;
  const event = new Event(type) as TouchEvent & { touches: Touch[]; changedTouches: Touch[] };
  Object.defineProperty(event, 'touches', { value: [touch] });
  Object.defineProperty(event, 'changedTouches', { value: [touch] });
  document.dispatchEvent(event);
}

function swipe(startX: number, startY: number, endX: number, endY: number, durationMs: number) {
  const start = Date.now();
  dispatchTouch('touchstart', startX, startY);
  const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(start + durationMs);
  dispatchTouch('touchend', endX, endY);
  nowSpy.mockRestore();
}

describe('touchGestureModule — swipe detection', () => {
  let toggle: HTMLButtonElement;
  let backdrop: HTMLElement;
  let nav: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <button class="navbar__toggle"></button>
      <nav>
        <div class="navbar-sidebar__backdrop"></div>
      </nav>
    `;
    toggle = document.querySelector('.navbar__toggle')!;
    backdrop = document.querySelector('.navbar-sidebar__backdrop')!;
    nav = document.querySelector('nav')!;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('a right-swipe from the left edge triggers the sidebar-open action', () => {
    let opened = false;
    toggle.addEventListener('click', () => {
      opened = true;
    });

    swipe(10, 100, 100, 100, 100);

    expect(opened).toBe(true);
  });

  it('a left-swipe while the sidebar is open triggers the sidebar-close action', () => {
    nav.classList.add('navbar-sidebar--show');
    let closed = false;
    backdrop.addEventListener('click', () => {
      closed = true;
    });

    swipe(300, 100, 200, 100, 100);

    expect(closed).toBe(true);
  });

  it('a swipe below the velocity threshold does not trigger', () => {
    let opened = false;
    toggle.addEventListener('click', () => {
      opened = true;
    });

    // 60px over 400ms = 0.15 px/ms, below the 0.3 px/ms threshold.
    swipe(10, 100, 70, 100, 400);

    expect(opened).toBe(false);
  });

  it('a mostly-vertical swipe does not trigger the open action', () => {
    let opened = false;
    toggle.addEventListener('click', () => {
      opened = true;
    });

    swipe(10, 100, 60, 300, 50);

    expect(opened).toBe(false);
  });
});
