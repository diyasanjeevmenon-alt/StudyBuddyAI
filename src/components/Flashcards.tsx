import { useCallback, useEffect, useRef, useState } from "react";
import { Flashcard } from "../types";
import { recordVerifiedActivity } from "../streakManager";

interface FlashcardsProps {
  cards: Flashcard[];
  bookTitle?: string;
}

export default function Flashcards({ cards, bookTitle }: FlashcardsProps) {
  const [order, setOrder] = useState<number[]>(() => cards.map((_, i) => i));
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const reviewedCount = useRef(0);
  const recordedRef = useRef(false);

  useEffect(() => {
    setOrder(cards.map((_, idx) => idx));
    setI(0);
    setFlipped(false);
    reviewedCount.current = 0;
    recordedRef.current = false;
  }, [cards]);

  const checkRecordActivity = useCallback(() => {
    if (!recordedRef.current && reviewedCount.current >= 3) {
      recordedRef.current = true;
      recordVerifiedActivity("flashcards", `Reviewed Flashcards (${cards.length} cards)`, bookTitle || "Flashcards Deck");
    }
  }, [cards.length, bookTitle]);

  const go = useCallback(
    (d: number) => {
      setFlipped(false);
      reviewedCount.current += 1;
      checkRecordActivity();
      setI((x) => Math.min(order.length - 1, Math.max(0, x + d)));
    },
    [order.length, checkRecordActivity]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === " " && (e.target as HTMLElement).tagName !== "BUTTON") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  function shuffle() {
    const a = [...order];
    for (let k = a.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [a[k], a[j]] = [a[j], a[k]];
    }
    setOrder(a);
    setI(0);
    setFlipped(false);
  }

  if (!cards.length) return <p className="empty">No flashcards were made for this notebook.</p>;
  const card = cards[order[i]];

  return (
    <div className="cards">
      <p className="progress">Card {i + 1} of {order.length}</p>
      <div className={"card3d" + (flipped ? " flipped" : "")}>
        <button
          className="card-in"
          onClick={() => setFlipped((f) => !f)}
          aria-label={
            flipped
              ? "Showing the answer. Click to show the question."
              : "Showing the question. Click to show the answer."
          }
        >
          <span className="face front">
            <span className="face-text">{card.question}</span>
            <span className="face-hint">Click to see the answer</span>
          </span>
          <span className="face back">
            <span className="face-text">{card.answer}</span>
            <span className="face-hint">Click to see the question</span>
          </span>
        </button>
      </div>
      <div className="card-controls">
        <button className="btn" onClick={() => go(-1)} disabled={i === 0}>
          Previous
        </button>
        <button className="btn" onClick={shuffle}>
          Shuffle
        </button>
        <button className="btn" onClick={() => go(1)} disabled={i === order.length - 1}>
          Next
        </button>
      </div>
      <p className="hint">Arrow keys move between cards. Space flips.</p>
    </div>
  );
}
