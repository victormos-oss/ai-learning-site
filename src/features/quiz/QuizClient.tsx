"use client";

import { useId, useRef, useState } from "react";
import { CheckCircle, XCircle } from "@phosphor-icons/react";
import { gradeQuiz, questionText, type Answers } from "./grade";
import type { Quiz, QuizLocale } from "./schema";

export type QuizLabels = {
  heading: string;
  progress: (current: number, total: number) => string;
  check: string;
  next: string;
  retry: string;
  correct: string;
  incorrect: (answer: string) => string;
  summary: (score: number, total: number) => string;
  passed: string;
  failed: string;
  englishOnly: string;
};

type Props = {
  quiz: Quiz;
  locale: QuizLocale;
  labels: QuizLabels;
  /** Called once when the last question is checked; the caller stores the result. */
  onFinish?: (result: {
    version: number;
    score: number;
    total: number;
    passed: boolean;
  }) => void;
};

/**
 * One question at a time on native form controls. The result of a check is
 * written into a live region that exists from the first render; focus moves
 * to the next question's legend, and finally to the summary heading.
 */
export function QuizClient({ quiz, locale, labels, onFinish }: Props) {
  const groupId = useId();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [checked, setChecked] = useState(false);
  const [done, setDone] = useState(false);
  const legendRef = useRef<HTMLLegendElement>(null);
  const summaryRef = useRef<HTMLHeadingElement>(null);

  const question = quiz.questions[index];
  if (!question) return null;
  const { text, isFallback } = questionText(question, locale);
  const chosen = answers[question.id];
  const isCorrect = checked && chosen === question.correct;
  const result = gradeQuiz(quiz, answers);
  const isLast = index === quiz.questions.length - 1;

  const onCheck = () => {
    if (chosen === undefined) return;
    setChecked(true);
    if (isLast) {
      const final = gradeQuiz(quiz, answers);
      onFinish?.({
        version: quiz.version,
        score: final.score,
        total: final.total,
        passed: final.passed,
      });
    }
  };

  const onNext = () => {
    if (isLast) {
      setDone(true);
      window.setTimeout(() => summaryRef.current?.focus(), 0);
      return;
    }
    setIndex(index + 1);
    setChecked(false);
    window.setTimeout(() => legendRef.current?.focus(), 0);
  };

  const onRetry = () => {
    setIndex(0);
    setAnswers({});
    setChecked(false);
    setDone(false);
  };

  const statusText = !checked
    ? ""
    : isCorrect
      ? labels.correct
      : labels.incorrect(text.options[question.correct] ?? "");

  return (
    <section
      aria-labelledby={`${groupId}-heading`}
      className="quiz"
      lang={isFallback ? "en" : undefined}
    >
      <h2
        id={`${groupId}-heading`}
        ref={summaryRef}
        tabIndex={-1}
        className="quiz__heading"
      >
        {labels.heading}
      </h2>
      {done ? (
        <div className="quiz__summary">
          <p role="status" className="quiz__summary-text">
            {labels.summary(result.score, result.total)}{" "}
            {result.passed ? labels.passed : labels.failed}
          </p>
          <button type="button" onClick={onRetry} className="quiz__button">
            {labels.retry}
          </button>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (checked) onNext();
            else onCheck();
          }}
        >
          <p className="quiz__progress">
            {labels.progress(index + 1, quiz.questions.length)}
          </p>
          {isFallback && <p className="quiz__fallback">{labels.englishOnly}</p>}
          <fieldset
            className="quiz__fieldset"
            aria-describedby={checked ? `${groupId}-explain` : undefined}
          >
            <legend ref={legendRef} tabIndex={-1} className="quiz__legend">
              {text.question}
            </legend>
            {text.options.map((option, optionIndex) => {
              const id = `${groupId}-${question.id}-${optionIndex}`;
              const mark = checked
                ? optionIndex === question.correct
                  ? "correct"
                  : optionIndex === chosen
                    ? "wrong"
                    : undefined
                : undefined;
              return (
                <label key={id} htmlFor={id} className="quiz__option" data-mark={mark}>
                  <input
                    id={id}
                    type="radio"
                    name={`${groupId}-${question.id}`}
                    value={optionIndex}
                    checked={chosen === optionIndex}
                    disabled={checked}
                    onChange={() =>
                      setAnswers({ ...answers, [question.id]: optionIndex })
                    }
                  />
                  <span>{option}</span>
                  {mark === "correct" && (
                    <span className="quiz__mark">
                      <CheckCircle aria-hidden="true" size={18} weight="bold" />{" "}
                      {labels.correct}
                    </span>
                  )}
                </label>
              );
            })}
          </fieldset>
          <p role="status" aria-live="polite" className="quiz__status">
            {statusText && (
              <>
                {isCorrect ? (
                  <CheckCircle aria-hidden="true" size={18} weight="bold" />
                ) : (
                  <XCircle aria-hidden="true" size={18} weight="bold" />
                )}{" "}
                {statusText}
              </>
            )}
          </p>
          {checked && (
            <p id={`${groupId}-explain`} className="quiz__explanation">
              {text.explanation}
            </p>
          )}
          <button
            type="submit"
            className="quiz__button"
            disabled={!checked && chosen === undefined}
          >
            {checked ? labels.next : labels.check}
          </button>
        </form>
      )}
    </section>
  );
}
