/**
 * Component tests for PatternCustomizer (issue #620 - Phase 8).
 *
 * Covers the full customizer UI: rendering every control type, live code
 * preview updates, validation feedback, reset behaviour, and the
 * onCodeChange callback. Utils are covered separately in utils.test.ts.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PatternCustomizer from './PatternCustomizer';
import { CustomizerField } from './types';

const fields: CustomizerField[] = [
  {
    name: 'greeting',
    label: 'Greeting Message',
    type: 'text',
    value: 'Hello',
    defaultValue: 'Hello',
    placeholder: 'Enter greeting text',
    description: 'Shown before the main payload',
  },
  {
    name: 'count',
    label: 'Count',
    type: 'number',
    value: 3,
    defaultValue: 3,
  },
  {
    name: 'mode',
    label: 'Mode',
    type: 'select',
    value: 'sync',
    defaultValue: 'sync',
    options: [
      { label: 'Sync', value: 'sync' },
      { label: 'Async', value: 'async' },
    ],
  },
  {
    name: 'body',
    label: 'Body',
    type: 'textarea',
    value: 'some body',
    defaultValue: 'some body',
  },
];

const codeTemplate = `String::from_str(&env, "{{greeting}}")`;

describe('PatternCustomizer Component', () => {
  describe('rendering', () => {
    it('renders the default title when none is provided', () => {
      render(<PatternCustomizer fields={fields} codeTemplate={codeTemplate} />);
      expect(screen.getByRole('heading', { name: 'Customize Pattern' })).toBeInTheDocument();
    });

    it('renders a custom title and description', () => {
      render(
        <PatternCustomizer
          title="Customize Greeting"
          description="Tune your greeting pattern"
          fields={fields}
          codeTemplate={codeTemplate}
        />,
      );
      expect(screen.getByRole('heading', { name: 'Customize Greeting' })).toBeInTheDocument();
      expect(screen.getByText('Tune your greeting pattern')).toBeInTheDocument();
    });

    it('renders a labelled control for every field type', () => {
      render(<PatternCustomizer fields={fields} codeTemplate={codeTemplate} />);
      expect(screen.getByLabelText('Greeting Message')).toHaveValue('Hello');
      expect(screen.getByLabelText('Count')).toHaveValue(3);
      expect(screen.getByLabelText('Mode')).toHaveValue('sync');
      expect(screen.getByLabelText('Body')).toHaveValue('some body');
    });

    it('renders optional field descriptions', () => {
      render(<PatternCustomizer fields={fields} codeTemplate={codeTemplate} />);
      expect(screen.getByText('Shown before the main payload')).toBeInTheDocument();
    });

    it('renders the initial generated code in the preview', () => {
      render(<PatternCustomizer fields={fields} codeTemplate={codeTemplate} />);
      expect(screen.getByText('String::from_str(&env, "Hello")')).toBeInTheDocument();
    });
  });

  describe('control changes update the preview', () => {
    it('updates the preview when a text control changes', () => {
      render(<PatternCustomizer fields={fields} codeTemplate={codeTemplate} />);
      const input = screen.getByLabelText('Greeting Message');
      fireEvent.change(input, { target: { value: 'Bonjour' } });
      expect(screen.getByText('String::from_str(&env, "Bonjour")')).toBeInTheDocument();
      expect(screen.queryByText('String::from_str(&env, "Hello")')).not.toBeInTheDocument();
    });

    it('updates the preview when a number control changes', () => {
      render(<PatternCustomizer fields={fields} codeTemplate="invoke_n(&env, {{count}})" />);
      const input = screen.getByLabelText('Count');
      fireEvent.change(input, { target: { value: '7' } });
      expect(screen.getByText('invoke_n(&env, 7)')).toBeInTheDocument();
    });

    it('updates the preview when a select control changes', () => {
      render(<PatternCustomizer fields={fields} codeTemplate="run(&env, {{mode}})" />);
      const select = screen.getByLabelText('Mode');
      fireEvent.change(select, { target: { value: 'async' } });
      expect(screen.getByText('run(&env, async)')).toBeInTheDocument();
    });

    it('updates the preview when a textarea control changes', () => {
      render(<PatternCustomizer fields={fields} codeTemplate={`log(&env, "{{body}}")`} />);
      const textarea = screen.getByLabelText('Body');
      fireEvent.change(textarea, { target: { value: 'updated body' } });
      expect(screen.getByText('log(&env, "updated body")')).toBeInTheDocument();
    });
  });

  describe('onCodeChange callback', () => {
    it('fires with the initial code on mount', () => {
      const onCodeChange = vi.fn();
      render(
        <PatternCustomizer
          fields={fields}
          codeTemplate={codeTemplate}
          onCodeChange={onCodeChange}
        />,
      );
      expect(onCodeChange).toHaveBeenCalledWith('String::from_str(&env, "Hello")');
    });

    it('fires with updated code when a control changes', () => {
      const onCodeChange = vi.fn();
      render(
        <PatternCustomizer
          fields={fields}
          codeTemplate={codeTemplate}
          onCodeChange={onCodeChange}
        />,
      );
      fireEvent.change(screen.getByLabelText('Greeting Message'), {
        target: { value: 'Bonjour' },
      });
      expect(onCodeChange).toHaveBeenLastCalledWith('String::from_str(&env, "Bonjour")');
    });
  });

  describe('validation feedback', () => {
    it('shows a success message when all values are present', () => {
      render(<PatternCustomizer fields={fields} codeTemplate={codeTemplate} />);
      expect(screen.getByText('✓ Ready to use')).toBeInTheDocument();
    });

    it('shows an error naming the missing value when a control is cleared', () => {
      render(<PatternCustomizer fields={fields} codeTemplate={codeTemplate} />);
      const input = screen.getByLabelText('Greeting Message');
      fireEvent.change(input, { target: { value: '' } });
      expect(screen.getByText('Missing values: greeting')).toBeInTheDocument();
      expect(screen.queryByText('✓ Ready to use')).not.toBeInTheDocument();
    });
  });

  describe('reset', () => {
    it('restores default values in controls and preview', () => {
      render(<PatternCustomizer fields={fields} codeTemplate={codeTemplate} />);
      const input = screen.getByLabelText('Greeting Message');
      fireEvent.change(input, { target: { value: 'Bonjour' } });
      expect(screen.getByText('String::from_str(&env, "Bonjour")')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /reset all fields/i }));

      expect(screen.getByLabelText('Greeting Message')).toHaveValue('Hello');
      expect(screen.getByText('String::from_str(&env, "Hello")')).toBeInTheDocument();
    });
  });
});
