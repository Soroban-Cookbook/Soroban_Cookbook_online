import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Collapsible from './Collapsible';

describe('Collapsible', () => {
  it('starts closed and exposes the correct aria-expanded state', () => {
    render(
      <Collapsible summary="More details">
        <p>Hidden content</p>
      </Collapsible>,
    );

    const summary = screen.getByText('More details').closest('summary');
    const details = summary?.closest('details');

    expect(details).not.toHaveAttribute('open');
    expect(summary).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles open when clicked', async () => {
    render(
      <Collapsible summary="More details">
        <p>Hidden content</p>
      </Collapsible>,
    );

    const summary = screen.getByText('More details').closest('summary');
    const details = summary?.closest('details');

    fireEvent.click(summary!);

    // jsdom sets the `open` attribute synchronously but dispatches the native
    // `toggle` event asynchronously; wait for React to process it.
    await waitFor(() => {
      expect(summary).toHaveAttribute('aria-expanded', 'true');
    });
    expect(details).toHaveAttribute('open');
  });

  it('toggles open and closed on Enter and Space key presses', () => {
    render(
      <Collapsible summary="More details">
        <p>Hidden content</p>
      </Collapsible>,
    );

    const summary = screen.getByText('More details').closest('summary');
    const details = summary?.closest('details');

    fireEvent.keyDown(summary, { key: 'Enter', code: 'Enter' });
    expect(details).toHaveAttribute('open');
    expect(summary).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(summary, { key: ' ', code: 'Space' });
    expect(details).not.toHaveAttribute('open');
    expect(summary).toHaveAttribute('aria-expanded', 'false');
  });

  it('calls onToggle with the next open state', async () => {
    const onToggle = vi.fn();

    render(
      <Collapsible summary="More details" onToggle={onToggle}>
        <p>Hidden content</p>
      </Collapsible>,
    );

    const summary = screen.getByText('More details').closest('summary');

    fireEvent.click(summary!);
    await waitFor(() => {
      expect(onToggle).toHaveBeenCalledWith(true);
    });

    fireEvent.click(summary!);
    await waitFor(() => {
      expect(onToggle).toHaveBeenLastCalledWith(false);
    });
  });
});
