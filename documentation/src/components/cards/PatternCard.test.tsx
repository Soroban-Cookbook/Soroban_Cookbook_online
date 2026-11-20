import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PatternCard from './PatternCard';

describe('PatternCard', () => {
  it('encodes ids containing a space in the code block id', () => {
    const contractName = 'my pattern';
    render(
      <PatternCard
        contractName={contractName}
        description="A pattern with a space in its id."
        tag="#storage"
        code="pub fn hello() {}"
      />,
    );

    const encodedId = encodeURIComponent(contractName);
    const toggle = screen.getByRole('button', { name: /show example/i });
    expect(toggle.getAttribute('aria-controls')).toBe(`https://example.com/code-${encodedId}`);

    fireEvent.click(toggle);

    const codeBlock = screen.getByTestId(`https://example.com/code-${encodedId}`);
    expect(codeBlock).toBeInTheDocument();
    expect(codeBlock.tagName).toBe('PRE');
  });
});
