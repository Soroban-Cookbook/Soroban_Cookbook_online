import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Stats from './Stats';

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  observe = vi.fn<(target: Element) => void>();
  disconnect = vi.fn();

  constructor(private readonly callback: IntersectionObserverCallback) {
    MockIntersectionObserver.instances.push(this);
  }

  emit(...intersections: boolean[]) {
    const target = this.observe.mock.calls[0][0];
    const entries = intersections.map(
      (isIntersecting) => ({ target, isIntersecting }) as IntersectionObserverEntry,
    );
    this.callback(entries, this as unknown as IntersectionObserver);
  }
}

describe('Stats', () => {
  const requestFrame = vi.fn<(callback: FrameRequestCallback) => number>();
  const cancelFrame = vi.fn();

  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    requestFrame.mockReset().mockImplementation(() => requestFrame.mock.calls.length);
    cancelFrame.mockClear();
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('disconnects at the first intersection and still animates to the final value', () => {
    render(<Stats />);
    const observer = MockIntersectionObserver.instances[0];

    act(() => observer.emit(false));
    expect(observer.disconnect).not.toHaveBeenCalled();
    expect(requestFrame).not.toHaveBeenCalled();

    act(() => observer.emit(false, true));
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
    expect(requestFrame).toHaveBeenCalledTimes(1);

    // A callback already queued before disconnection must not trigger again.
    act(() => observer.emit(true));
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
    expect(requestFrame).toHaveBeenCalledTimes(1);

    act(() => requestFrame.mock.calls[0][0](100));
    act(() => requestFrame.mock.calls[1][0](2100));
    expect(screen.getByText('50+')).toBeInTheDocument();
    expect(requestFrame).toHaveBeenCalledTimes(2);
  });

  it('disconnects all observers when unmounting before any intersection', () => {
    const { unmount } = render(<Stats />);
    const observers = MockIntersectionObserver.instances;
    expect(observers).toHaveLength(4);
    unmount();
    for (const observer of observers) {
      expect(observer.disconnect).toHaveBeenCalledTimes(1);
    }
    expect(requestFrame).not.toHaveBeenCalled();
  });
});
