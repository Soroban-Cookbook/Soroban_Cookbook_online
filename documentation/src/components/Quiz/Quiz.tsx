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
import React, { useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { HelpCircle, CheckCircle, XCircle } from 'lucide-react';
import styles from './Quiz.module.css';

export type Question = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type QuizProps = {
  title?: string;
  questions: Question[];
  /** Allow multiple attempts — default true */
  allowRetry?: boolean;
  children?: ReactNode;
  className?: string;
};

type AnswerState = Record<string, number | null>;
type RevealedState = Record<string, boolean>;

/**
 * Quiz Component
 * --------------
 * Renders an interactive multiple-choice knowledge check with radio buttons,
 * per-question and bulk answer checking, explanation display, scoring, and retry.
 *
 * @example
 * <Quiz title="Knowledge Check" questions={[
 *   {
 *     id: "q1",
 *     question: "What command creates a new Soroban project?",
 *     options: ["soroban init", "soroban contract init", "cargo new"],
 *     correctIndex: 1,
 *     explanation: "The correct command is `soroban contract init`."
 *   }
 * ]} />
 */
export default function Quiz({
  title = 'Knowledge Check',
  questions,
  allowRetry = true,
  children,
  className,
}: QuizProps) {
  const [answers, setAnswers] = useState<AnswerState>({});
  const [revealed, setRevealed] = useState<RevealedState>({});

  const allAnswered = questions.every((q) => answers[q.id] !== undefined);
  const allRevealed = questions.every((q) => revealed[q.id]);
  const correctCount = questions.filter((q) => answers[q.id] === q.correctIndex).length;

  const handleSelect = (qId: string, optionIndex: number) => {
    if (revealed[qId] && !allowRetry) return;
    setAnswers((prev) => ({ ...prev, [qId]: optionIndex }));
  };

  const handleCheck = (qId: string) => {
    setRevealed((prev) => ({ ...prev, [qId]: true }));
  };

  const handleCheckAll = () => {
    const allRevealedState: RevealedState = {};
    questions.forEach((q) => {
      allRevealedState[q.id] = true;
    });
    setRevealed((prev) => ({ ...prev, ...allRevealedState }));
  };

  const handleReset = () => {
    setAnswers({});
    setRevealed({});
  };

  return (
    <div className={clsx(styles.quiz, className)} role="form" aria-label={title}>
      <div className={styles.quizHeader}>
        <HelpCircle size={20} aria-hidden="true" />
        <h3 className={styles.quizTitle}>{title}</h3>
        {questions.length > 0 && (
          <span className={styles.quizCount}>
            {questions.length} question{questions.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {allRevealed && (
        <div
          className={clsx(
            styles.scoreBanner,
            correctCount === questions.length
              ? styles.scoreBannerPerfect
              : styles.scoreBannerPartial,
          )}
          role="status">
          <strong>
            {correctCount} of {questions.length} correct
          </strong>
          {correctCount === questions.length && ' — Great job! \uD83C\uDF89'}
        </div>
      )}

      {children}

      {questions.map((q, qIdx) => {
        const selected = answers[q.id];
        const isRevealed = revealed[q.id];
        const isCorrect = isRevealed && selected === q.correctIndex;
        const isWrong = isRevealed && selected !== q.correctIndex;
        const isDisabled = isRevealed && !allowRetry;

        return (
          <fieldset
            key={q.id}
            className={clsx(
              styles.questionBlock,
              isCorrect && styles.questionCorrect,
              isWrong && styles.questionWrong,
            )}
            disabled={isDisabled}>
            <legend className={styles.questionText}>
              <span className={styles.questionNumber}>{qIdx + 1}.</span>
              {q.question}
            </legend>

            <div className={styles.optionsList}>
              {q.options.map((option, oIdx) => {
                const optionId = `${q.id}-opt-${oIdx}`;
                const isSelected = selected === oIdx;
                const showCorrect = isRevealed && oIdx === q.correctIndex;
                const showIncorrect = isRevealed && isSelected && oIdx !== q.correctIndex;

                return (
                  <label
                    key={optionId}
                    htmlFor={optionId}
                    className={clsx(
                      styles.option,
                      isSelected && styles.optionSelected,
                      showCorrect && styles.optionCorrect,
                      showIncorrect && styles.optionIncorrect,
                    )}>
                    <input
                      id={optionId}
                      type="radio"
                      name={q.id}
                      checked={isSelected}
                      onChange={() => handleSelect(q.id, oIdx)}
                      className={styles.radio}
                      disabled={isDisabled}
                    />
                    <span className={styles.optionText}>{option}</span>
                    {showCorrect && (
                      <CheckCircle
                        size={18}
                        className={styles.iconCorrect}
                        aria-label="Correct answer"
                      />
                    )}
                    {showIncorrect && (
                      <XCircle
                        size={18}
                        className={styles.iconIncorrect}
                        aria-label="Incorrect answer"
                      />
                    )}
                  </label>
                );
              })}
            </div>

            {isRevealed && (
              <div className={styles.explanation} role="alert">
                <strong>{isCorrect ? '\u2705 Correct! ' : '\u274C Not quite. '}</strong>
                {q.explanation}
              </div>
            )}

            {!isRevealed && selected !== undefined && (
              <button type="button" className={styles.checkBtn} onClick={() => handleCheck(q.id)}>
                Check Answer
              </button>
            )}
          </fieldset>
        );
      })}

      <div className={styles.quizActions}>
        {allAnswered && !allRevealed && (
          <button type="button" className={styles.checkAllBtn} onClick={handleCheckAll}>
            Check All Answers
          </button>
        )}
        {allRevealed && (
          <button type="button" className={styles.resetBtn} onClick={handleReset}>
            {allowRetry ? 'Retry Quiz' : 'Reset'}
          </button>
        )}
      </div>
    </div>
  );
}
