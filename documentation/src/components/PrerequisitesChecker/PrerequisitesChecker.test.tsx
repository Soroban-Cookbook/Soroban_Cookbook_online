import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrerequisitesChecker, DEFAULT_PREREQUISITES } from './PrerequisitesChecker';

describe('PrerequisitesChecker Component', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    const localStorageMock = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      clear: () => {
        Object.keys(store).forEach((key) => delete store[key]);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    vi.restoreAllMocks();
  });

  it('renders title, description and all prerequisite items', () => {
    render(<PrerequisitesChecker />);

    expect(screen.getByText('Prerequisites Readiness Checker')).toBeInTheDocument();
    expect(
      screen.getByText(/Verify that your local environment is configured/),
    ).toBeInTheDocument();

    DEFAULT_PREREQUISITES.forEach((item) => {
      expect(screen.getByText(item.name)).toBeInTheDocument();
    });
  });

  it('calculates completion status correctly when toggled', () => {
    render(<PrerequisitesChecker />);

    const rustItem = screen.getByTestId('prereq-item-rust');
    const checkbox = rustItem.querySelector('input[type="checkbox"]') as HTMLInputElement;

    expect(checkbox.checked).toBe(false);
    expect(screen.getByText('0/3 Required Ready')).toBeInTheDocument();

    fireEvent.click(checkbox);

    expect(checkbox.checked).toBe(true);
    expect(screen.getByText('1/3 Required Ready')).toBeInTheDocument();
    expect(localStorage.getItem('soroban_prerequisites_checked_v1')).toContain('"rust":true');
  });

  it('shows Ready for Development when all required items are checked', () => {
    render(<PrerequisitesChecker />);

    const requiredIds = DEFAULT_PREREQUISITES.filter((i) => !i.optional).map((i) => i.id);

    requiredIds.forEach((id) => {
      const item = screen.getByTestId(`prereq-item-${id}`);
      const checkbox = item.querySelector('input[type="checkbox"]') as HTMLInputElement;
      fireEvent.click(checkbox);
    });

    expect(screen.getByText('✓ Ready for Development')).toBeInTheDocument();
  });

  it('copies command when copy button is clicked', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<PrerequisitesChecker />);

    const copyButtons = screen.getAllByText('Copy');
    fireEvent.click(copyButtons[0]);

    expect(writeTextMock).toHaveBeenCalledWith('rustc --version && cargo --version');
    expect(await screen.findByText('Copied!')).toBeInTheDocument();
  });
});
