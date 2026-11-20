import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Collapsible from './Collapsible';

describe('Collapsible', () => {
  it.each([false, true])(
    'pairs each panel with its trigger when defaultOpen is %s',
    (defaultOpen) => {
      render(
        <>
          <Collapsible summary="First section" defaultOpen={defaultOpen}>
            <p>First content</p>
          </Collapsible>
          <Collapsible summary="Second section" defaultOpen={defaultOpen}>
            <p>Second content</p>
          </Collapsible>
        </>,
      );

      const ids = ['First', 'Second'].map((name) => {
        const summary = screen.getByText(`${name} section`).closest('summary');
        const panel = summary?.nextElementSibling;
        expect(panel?.id).toBeTruthy();
        expect(summary).toHaveAttribute('aria-controls', panel?.id);
        expect(summary).toHaveAttribute('aria-expanded', String(defaultOpen));
        expect(panel).toContainElement(screen.getByText(`${name} content`));
        return panel?.id;
      });
      expect(ids[0]).not.toBe(ids[1]);
    },
  );

  it('keeps the panel id stable across controlled state and content changes', () => {
    const { rerender } = render(
      <Collapsible summary="More details" open={false}>
        Initial content
      </Collapsible>,
    );
    const summary = screen.getByText('More details').closest('summary');
    const panelId = summary?.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();

    for (const open of [true, false]) {
      rerender(
        <Collapsible summary="More details" open={open}>
          Updated content
        </Collapsible>,
      );
      expect(summary).toHaveAttribute('aria-expanded', String(open));
      expect(summary).toHaveAttribute('aria-controls', panelId);
      expect(summary?.nextElementSibling).toHaveAttribute('id', panelId);
    }
  });

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
