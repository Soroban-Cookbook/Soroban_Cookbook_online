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
    const codeBlockId = `https://example.com/code-${encodedId}`;
    const toggle = screen.getByRole('button', { name: /show example/i });
    expect(toggle.getAttribute('aria-controls')).toBe(codeBlockId);

    fireEvent.click(toggle);

    // The <pre> is identified by its `id` attribute (which mirrors aria-controls);
    // query it directly because ids here contain URL characters that are awkward
    // to use in CSS selectors.
    const codeBlock = document.getElementById(codeBlockId);
    expect(codeBlock).toBeInTheDocument();
    expect(codeBlock?.tagName).toBe('PRE');
  });
});
