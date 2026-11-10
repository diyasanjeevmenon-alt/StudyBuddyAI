import { useEffect, useRef, useState } from "react";
import { MCQ } from "../types";
import confetti from "canvas-confetti";
import { recordVerifiedActivity } from "../streakManager";

const L = ["A", "B", "C", "D"];

interface QuizProps {
  mcqs: MCQ[];
  bookTitle?: string;
}

export default function Quiz({ mcqs, bookTitle }: QuizProps) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const recordedRef = useRef(false);

  useEffect(() => {
    if (i >= mcqs.length && mcqs.length > 0 && !recordedRef.current) {
      recordedRef.current = true;
      const score = answers.filter((a, k) => a === mcqs[k].correct_index).length;
      recordVerifiedActivity(
        "quiz",
        `Completed Quiz (${score}/${mcqs.length})`,
        bookTitle || "Quiz Trial"
      );
      if (score >= Math.ceil(mcqs.length * 0.7)) {
        try {
          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.6 },
            colors: ["#f0c878", "#6b2230", "#2f6b4a", "#eee6d3"],
          });
        } catch {
          // ignore
        }
      }
    }
  }, [i, mcqs, answers, bookTitle]);

  if (!mcqs || !mcqs.length) return <p className="empty">No questions were made for this notebook.</p>;

  if (i >= mcqs.length) {
    const score = answers.filter((a, k) => a === mcqs[k].correct_index).length;
    const missed = mcqs.map((q, k) => ({ q, k })).filter(({ q, k }) => answers[k] !== q.correct_index);


    return (
      <div className="quiz-done">
        <h2>You got {score} of {mcqs.length}</h2>
        {missed.length ? (
          <>
            <p>Worth another look:</p>
            <ul className="missed">
              {missed.map(({ q, k }) => (
                <li key={k}>
                  <strong>{q.question}</strong>
                  <span>
                    Answer: {L[q.correct_index]}. {q.options[q.correct_index]}
                  </span>
                  <span>{q.explanation}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>Every answer was right.</p>
        )}
        <button
          className="btn-primary"
          onClick={() => {
            recordedRef.current = false;
            setI(0);
            setPicked(null);
            setAnswers([]);
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  const q = mcqs[i];
  const answered = picked !== null;
  const pick = (k: number) => {
    if (answered) return;
    setPicked(k);
    setAnswers((a) => [...a, k]);
  };

  return (
    <div className="quiz">
      <p className="progress">Question {i + 1} of {mcqs.length}</p>
      <h2 className="q">{q.question}</h2>
      <div className="opts">
        {q.options.map((o, k) => {
          let state = "";
          if (answered) state = k === q.correct_index ? " correct" : k === picked ? " wrong" : " dim";
          return (
            <button key={k} className={"opt" + state} onClick={() => pick(k)} aria-disabled={answered}>
              <span className="letter">{L[k]}</span>
              <span>{o}</span>
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="explain" role="status">
          <strong>{picked === q.correct_index ? "Correct." : `Not quite. The answer is ${L[q.correct_index]}.`}</strong>{" "}
          {q.explanation}
        </div>
      )}
      {answered && (
        <button
          className="btn-primary"
          onClick={() => {
            setPicked(null);
            setI(i + 1);
          }}
        >
          {i + 1 === mcqs.length ? "See my score" : "Next question"}
        </button>
      )}
    </div>
  );
}
