import React, { Profiler } from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Stats from './Stats';

describe('Stats', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      return window.setTimeout(() => callback(Date.now()), 16);
    });
  });

  it('updates all counters in a single render for each animation frame', () => {
    const frames: FrameRequestCallback[] = [];
    vi.mocked(window.requestAnimationFrame).mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    const onRender = vi.fn();

    render(
      <Profiler id="stats" onRender={onRender}>
        <Stats />
      </Profiler>,
    );

    expect(frames).toHaveLength(1);
    onRender.mockClear();

    act(() => frames.shift()?.(1000));

    expect(onRender).toHaveBeenCalledTimes(1);
    expect(frames).toHaveLength(1);
  });
});
