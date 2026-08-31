import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Quiz from './Quiz';
import type { QuizQuestion } from './Quiz';

const singleChoiceQuestions: QuizQuestion[] = [
  {
    id: 'q1',
    text: 'What is 2 + 2?',
    type: 'single',
    options: [
      { id: 'a', label: '3', correct: false },
      { id: 'b', label: '4', correct: true },
      { id: 'c', label: '5', correct: false },
    ],
  },
  {
    id: 'q2',
    text: 'Capital of France?',
    type: 'single',
    options: [
      { id: 'a', label: 'Berlin', correct: false },
      { id: 'b', label: 'Paris', correct: true },
    ],
  },
];

const multipleChoiceQuestions: QuizQuestion[] = [
  {
    id: 'm1',
    text: 'Select all even numbers',
    type: 'multiple',
    options: [
      { id: 'a', label: '1', correct: false },
      { id: 'b', label: '2', correct: true },
      { id: 'c', label: '3', correct: false },
      { id: 'd', label: '4', correct: true },
    ],
  },
];

describe('Quiz component', () => {
  it('renders title', () => {
    render(<Quiz questions={singleChoiceQuestions} />);
    expect(screen.getByText('Quiz')).toBeInTheDocument();
  });

  it('renders custom title', () => {
    render(<Quiz title="Knowledge Check" questions={singleChoiceQuestions} />);
    expect(screen.getByText('Knowledge Check')).toBeInTheDocument();
  });

  it('renders all questions', () => {
    render(<Quiz questions={singleChoiceQuestions} />);
    expect(screen.getByText(/What is 2 \+ 2/)).toBeInTheDocument();
    expect(screen.getByText(/Capital of France/)).toBeInTheDocument();
  });

  it('renders radio buttons for single-choice questions', () => {
    render(<Quiz questions={singleChoiceQuestions} />);
    const q1Radios = screen.getAllByRole('radio', { name: /./ });
    expect(q1Radios.length).toBe(5);
    const radiogroup = screen.getByRole('radiogroup', { name: /Options for question 1/ });
    expect(radiogroup.querySelectorAll('input[type="radio"]').length).toBe(3);
  });

  it('renders checkboxes for multiple-choice questions', () => {
    render(<Quiz questions={multipleChoiceQuestions} />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(4);
  });

  it('allows selecting a single option', () => {
    render(<Quiz questions={singleChoiceQuestions} />);
    fireEvent.click(screen.getByLabelText('4'));
    expect(screen.getByLabelText('4')).toBeChecked();
    expect(screen.getByLabelText('3')).not.toBeChecked();
  });

  it('allows selecting multiple options in multi-choice', () => {
    render(<Quiz questions={multipleChoiceQuestions} />);
    fireEvent.click(screen.getByLabelText('2'));
    fireEvent.click(screen.getByLabelText('4'));
    expect(screen.getByLabelText('2')).toBeChecked();
    expect(screen.getByLabelText('4')).toBeChecked();
  });

  it('submit button is disabled until all questions answered', () => {
    render(<Quiz questions={singleChoiceQuestions} />);
    const submitBtn = screen.getByRole('button', { name: 'Submit' });
    expect(submitBtn).toBeDisabled();
    fireEvent.click(screen.getByLabelText('4'));
    expect(submitBtn).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Paris'));
    expect(submitBtn).not.toBeDisabled();
  });

  it('shows score after submission', () => {
    render(<Quiz questions={singleChoiceQuestions} />);
    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByLabelText('Paris'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(status).toHaveTextContent(/You scored/);
    expect(status).toHaveTextContent(/out of/);
  });

  it('calls onComplete after submission', () => {
    const onComplete = vi.fn();
    render(<Quiz questions={singleChoiceQuestions} onComplete={onComplete} />);
    fireEvent.click(screen.getByLabelText('3'));
    fireEvent.click(screen.getByLabelText('Berlin'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onComplete).toHaveBeenCalledWith(0, 2);
  });

  it('disables inputs after submission', () => {
    render(<Quiz questions={singleChoiceQuestions} />);
    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByLabelText('Paris'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.getByLabelText('4')).toBeDisabled();
    expect(screen.getByLabelText('3')).toBeDisabled();
  });

  it('hides submit button after submission', () => {
    render(<Quiz questions={singleChoiceQuestions} />);
    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByLabelText('Paris'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
  });

  it('applies correct/incorrect classes after submission', () => {
    render(<Quiz questions={singleChoiceQuestions} />);
    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByLabelText('Paris'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    const correctOption = screen.getByLabelText('4').closest('label');
    expect(correctOption).toHaveClass(/correctOption/);
  });

  it('renders with role=group and aria-label', () => {
    render(<Quiz questions={singleChoiceQuestions} title="Test Quiz" />);
    expect(screen.getByRole('group', { name: 'Test Quiz' })).toBeInTheDocument();
  });

  it('renders radiogroup for single-choice questions', () => {
    render(<Quiz questions={singleChoiceQuestions} />);
    expect(screen.getByRole('radiogroup', { name: /Options for question 1/ })).toBeInTheDocument();
  });
});
