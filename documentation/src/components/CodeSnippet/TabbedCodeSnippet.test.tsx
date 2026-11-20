import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TabbedCodeSnippet from './TabbedCodeSnippet';

describe('CodeSnippet copy feedback', () => {
  const writeText = vi.fn<(text: string) => Promise<void>>();

  beforeEach(() => {
    vi.useFakeTimers();
    writeText.mockReset().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function copy() {
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy code snippet' }));
    });
  }

  it('shows feedback for 1200ms after copying the current code', async () => {
    render(<TabbedCodeSnippet code="first" />);
    await copy();
    expect(writeText).toHaveBeenCalledWith('first');
    expect(screen.getByText('Copied!')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1199));
    expect(screen.getByText('Copied!')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText('Copy')).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('restarts the feedback timer after a second copy', async () => {
    render(<TabbedCodeSnippet code="first" />);
    await copy();
    act(() => vi.advanceTimersByTime(800));
    await copy();
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByText('Copied!')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(800));
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('clears the pending timer on unmount without warnings', async () => {
    const error = vi.spyOn(console, 'error');
    const { unmount } = render(<TabbedCodeSnippet code="first" />);
    await copy();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.advanceTimersByTime(1200));
    expect(error).not.toHaveBeenCalled();
  });

  it('clears feedback and the old timer when code changes', async () => {
    const { rerender } = render(<TabbedCodeSnippet code="first" />);
    await copy();
    rerender(<TabbedCodeSnippet code="second" />);
    expect(screen.getByText('Copy')).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
    await copy();
    expect(writeText).toHaveBeenLastCalledWith('second');
  });

  it('clears feedback when switching to a tab with different code', async () => {
    render(
      <TabbedCodeSnippet
        tabs={[
          { label: 'First', code: 'one' },
          { label: 'Second', code: 'two' },
        ]}
      />,
    );
    await copy();
    fireEvent.click(screen.getByRole('tab', { name: 'Second' }));
    expect(screen.getByText('Copy')).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
    await copy();
    expect(writeText).toHaveBeenLastCalledWith('two');
  });

  it.each(['unmount', 'code change'])('ignores clipboard completion after %s', async (change) => {
    let finish!: () => void;
    writeText.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const { unmount, rerender } = render(<TabbedCodeSnippet code="first" />);
    await copy();
    if (change === 'unmount') unmount();
    else rerender(<TabbedCodeSnippet code="second" />);
    await act(async () => {
      finish();
    });
    expect(vi.getTimerCount()).toBe(0);
    if (change === 'code change') expect(screen.getByText('Copy')).toBeInTheDocument();
  });
});
