import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from './Button';
import ButtonGroup from './ButtonGroup';
import styles from './buttons.module.css';

describe('ButtonGroup Component', () => {
  it('renders children inside a labelled group', () => {
    render(
      <ButtonGroup ariaLabel="Contract actions">
        <Button>Preview</Button>
        <Button>Publish</Button>
      </ButtonGroup>,
    );

    const group = screen.getByRole('group', { name: 'Contract actions' });
    expect(group).toBeInTheDocument();
    expect(group).toHaveClass(styles.btnGroup);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('renders the default variant without modifier classes', () => {
    render(
      <ButtonGroup>
        <Button>Only</Button>
      </ButtonGroup>,
    );

    const group = screen.getByRole('group');
    expect(group).toHaveClass(styles.btnGroup);
    expect(group).not.toHaveClass(styles.btnGroupConnected);
    expect(group).not.toHaveClass(styles.btnGroupSegmented);
  });

  it('applies the connected variant class', () => {
    render(
      <ButtonGroup variant="connected">
        <Button>Only</Button>
      </ButtonGroup>,
    );
    expect(screen.getByRole('group')).toHaveClass(styles.btnGroupConnected);
  });

  it('applies the segmented variant class', () => {
    render(
      <ButtonGroup variant="segmented">
        <Button>Only</Button>
      </ButtonGroup>,
    );
    expect(screen.getByRole('group')).toHaveClass(styles.btnGroupSegmented);
  });

  it('appends a custom className', () => {
    render(
      <ButtonGroup className="toolbar">
        <Button>Only</Button>
      </ButtonGroup>,
    );
    const group = screen.getByRole('group');
    expect(group).toHaveClass(styles.btnGroup);
    expect(group).toHaveClass('toolbar');
  });

  it('keeps disabled children disabled inside a group', () => {
    render(
      <ButtonGroup ariaLabel="Actions">
        <Button>Preview</Button>
        <Button disabled>Publish</Button>
      </ButtonGroup>,
    );

    expect(screen.getByRole('button', { name: 'Preview' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });
});
