import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Collapsible from './Collapsible';

describe('Collapsible', () => {
  it('starts closed and exposes the correct aria-expanded state', () => {
    render(
      <Collapsible summary="More details">
        <p>Hidden content</p>
      </Collapsible>,
    );

    const summary = screen.getByText('More details');
    const details = summary.closest('details');

    expect(details).not.toHaveAttribute('open');
    expect(summary).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles open when clicked', () => {
    render(
      <Collapsible summary="More details">
        <p>Hidden content</p>
      </Collapsible>,
    );

    const summary = screen.getByText('More details');
    const details = summary.closest('details');

    fireEvent.click(summary);

    expect(details).toHaveAttribute('open');
    expect(summary).toHaveAttribute('aria-expanded', 'true');
  });

  it('toggles open and closed on Enter and Space key presses', () => {
    render(
      <Collapsible summary="More details">
        <p>Hidden content</p>
      </Collapsible>,
    );

    const summary = screen.getByText('More details');
    const details = summary.closest('details');

    fireEvent.keyDown(summary, { key: 'Enter', code: 'Enter' });
    expect(details).toHaveAttribute('open');
    expect(summary).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(summary, { key: ' ', code: 'Space' });
    expect(details).not.toHaveAttribute('open');
    expect(summary).toHaveAttribute('aria-expanded', 'false');
  });

  it('calls onToggle with the next open state', () => {
    const onToggle = vi.fn();

    render(
      <Collapsible summary="More details" onToggle={onToggle}>
        <p>Hidden content</p>
      </Collapsible>,
    );

    fireEvent.click(screen.getByText('More details'));
    expect(onToggle).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByText('More details'));
    expect(onToggle).toHaveBeenLastCalledWith(false);
  });
});
