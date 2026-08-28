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
