import React, { useState, useCallback } from 'react';
import clsx from 'clsx';
import styles from './Quiz.module.css';

export interface QuizOption {
  id: string;
  label: string;
  correct: boolean;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: QuizOption[];
  /** 'single' = radio, 'multiple' = checkbox */
  type: 'single' | 'multiple';
}

export interface QuizProps {
  title?: string;
  questions: QuizQuestion[];
  onComplete?: (score: number, total: number) => void;
  className?: string;
}

export default function Quiz({ title = 'Quiz', questions, onComplete, className }: QuizProps) {
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSingle = useCallback((questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: [optionId] }));
  }, []);

  const handleMultiple = useCallback((questionId: string, optionId: string, checked: boolean) => {
    setAnswers((prev) => {
      const current = prev[questionId] ?? [];
      const updated = checked ? [...current, optionId] : current.filter((id) => id !== optionId);
      return { ...prev, [questionId]: updated };
    });
  }, []);

  const score = questions.reduce((acc, q) => {
    const selected = answers[q.id] ?? [];
    const correctIds = q.options.filter((o) => o.correct).map((o) => o.id);
    const isCorrect =
      correctIds.length === selected.length && correctIds.every((id) => selected.includes(id));
    return acc + (isCorrect ? 1 : 0);
  }, 0);

  const handleSubmit = () => {
    setSubmitted(true);
    onComplete?.(score, questions.length);
  };

  const isAnswerCorrect = (q: QuizQuestion): boolean => {
    const selected = answers[q.id] ?? [];
    const correctIds = q.options.filter((o) => o.correct).map((o) => o.id);
    return correctIds.length === selected.length && correctIds.every((id) => selected.includes(id));
  };

  return (
    <div className={clsx(styles.quiz, className)} role="group" aria-label={title}>
      <h3 className={styles.quizTitle}>{title}</h3>

      {questions.map((q, qi) => (
        <fieldset
          key={q.id}
          className={clsx(
            styles.question,
            submitted && isAnswerCorrect(q) && styles.correct,
            submitted && !isAnswerCorrect(q) && styles.incorrect,
          )}>
          <legend className={styles.questionText}>
            {qi + 1}. {q.text}
          </legend>

          <div
            className={styles.options}
            role={q.type === 'single' ? 'radiogroup' : 'group'}
            aria-label={`Options for question ${qi + 1}`}>
            {q.options.map((opt) => {
              const isSelected = (answers[q.id] ?? []).includes(opt.id);
              return (
                <label
                  key={opt.id}
                  className={clsx(
                    styles.option,
                    isSelected && styles.selected,
                    submitted && opt.correct && styles.correctOption,
                    submitted && isSelected && !opt.correct && styles.wrongOption,
                  )}>
                  <input
                    type={q.type === 'single' ? 'radio' : 'checkbox'}
                    name={`q-${q.id}`}
                    value={opt.id}
                    checked={isSelected}
                    disabled={submitted}
                    onChange={() => {
                      if (q.type === 'single') {
                        handleSingle(q.id, opt.id);
                      } else {
                        handleMultiple(q.id, opt.id, !isSelected);
                      }
                    }}
                    className={styles.input}
                  />
                  <span className={styles.optionLabel}>{opt.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      {!submitted && (
        <button
          type="button"
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={Object.keys(answers).length < questions.length}>
          Submit
        </button>
      )}

      {submitted && (
        <div className={styles.result} role="status" aria-live="polite">
          You scored <strong>{score}</strong> out of <strong>{questions.length}</strong>
        </div>
      )}
    </div>
  );
}
