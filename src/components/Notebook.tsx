import React, { useCallback, useEffect, useRef, useState } from "react";
import CreateForm from "./CreateForm";
import StudyView from "./StudyView";
import { StudySetDetail } from "../types";
import { deleteSet, downloadPdf, generate, getSet } from "../api";
import { coverFor } from "../utils";
import { recordVerifiedActivity } from "../streakManager";

export const TABS = [
  ["summary", "Overview"],
  ["concepts", "Concepts & Formulas"],
  ["cards", "Flashcards"],
  ["quiz", "Practice Quiz"],
  ["plan", "7-Day Plan"],
  ["ask", "Study Tutor"],
];

interface NotebookProps {
  target: string;
  fromRect: DOMRect | null;
  getRect: (key: string) => DOMRect | null;
  initialPayload?: any;
  onCreated: (b: StudySetDetail) => void;
  onDeleted: (id: string) => void;
  onClosed: () => void;
}

export default function Notebook({
  target,
  initialPayload,
  onCreated,
  onDeleted,
  onClosed,
}: NotebookProps) {
  const [book, setBook] = useState<StudySetDetail | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("summary");
  const [dlBusy, setDlBusy] = useState(false);
  const [activeMobilePage, setActiveMobilePage] = useState<"left" | "right">("left");
  const closing = useRef(false);

  useEffect(() => {
    if (target === "new") {
      if (initialPayload) {
        create(initialPayload);
      }
      return;
    }
    let alive = true;
    getSet(target)
      .then((b) => {
        if (alive) setBook(b);
      })
      .catch((e) => {
        if (alive) setLoadErr(e.message);
      });
    return () => {
      alive = false;
    };
  }, [target]);

  // Lock body scroll while book popup is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const isNewVolume = target === "new";
  const animStage = "open";

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    onClosed();
  }, [onClosed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  async function create(formData: FormData) {
    setBusy(true);
    setError("");
    try {
      const b = await generate(formData);
      setBook(b);
      setTab("summary");
      onCreated(b);
      recordVerifiedActivity("create_book", "Bound Study Volume", b.title);
    } catch (e: any) {
      setError(e.message || "Failed to create study volume.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadPdf() {
    if (!book) return;
    setDlBusy(true);
    try {
      await downloadPdf(book.id, book.title);
    } catch (e: any) {
      window.alert(e.message || "Failed to download PDF.");
    } finally {
      setDlBusy(false);
    }
  }

  async function remove() {
    if (!book) return;
    if (!window.confirm("Remove this volume from your shelf? This cannot be undone.")) return;
    try {
      await deleteSet(book.id);
      closing.current = true;
      onDeleted(book.id);
      onClosed();
    } catch (e: any) {
      window.alert(e.message);
    }
  }

  const cover = book ? coverFor(book.id).bg : "#34181c";

  return (
    <div className={`book-modal-scrim stage-${animStage}`} onClick={close}>
      <div className="book-modal-stage">
        <div
          className={`book-modal-casing book-3d-volume is-${animStage}`}
          style={{ "--cover": cover } as React.CSSProperties}
          role="dialog"
          aria-modal="true"
          aria-label={book ? book.title : "Study Volume"}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >


          {/* Top Action Ribbon Bar */}
          <header className="book-top-actionbar">
            <div className="book-top-title-group">
              <span className="book-top-crest">✦</span>
              <span className="book-top-title">
                {book ? book.title : "Create Study Guide"}
              </span>
              {book?.subject && (
                <span className="book-top-subject-tag">{book.subject}</span>
              )}
            </div>

            <div className="book-top-buttons">
              {book && (
                <>
                  <button
                    type="button"
                    className="book-action-btn"
                    onClick={handleDownloadPdf}
                    disabled={dlBusy}
                    title="Export volume as high-resolution printable PDF"
                  >
                    {dlBusy ? "Preparing PDF…" : "📥 Download PDF"}
                  </button>
                  <button
                    type="button"
                    className="book-action-btn quiet"
                    onClick={remove}
                    title="Remove this book from shelf"
                  >
                    🗑 Remove
                  </button>
                </>
              )}
              <button
                type="button"
                className="book-close-btn"
                onClick={close}
                title="Return volume to shelf (Esc)"
              >
                ✕ <kbd>Esc</kbd>
              </button>
            </div>
          </header>

          {/* Mobile Page Switcher (always active on small screens) */}
          <div className="mobile-page-toggle" role="tablist">
            <button
              type="button"
              className={`mobile-page-btn ${activeMobilePage === "left" ? "is-active" : ""}`}
              onClick={() => setActiveMobilePage("left")}
            >
              {book ? "📖 Page 1 · Summary" : "📖 Page 1 · Notes"}
            </button>
            <button
              type="button"
              className={`mobile-page-btn ${activeMobilePage === "right" ? "is-active" : ""}`}
              onClick={() => setActiveMobilePage("right")}
            >
              {book ? "🎯 Page 2 · Study Tools" : "⚙️ Page 2 · Options"}
            </button>
          </div>

          {/* Two-page layout */}
          <div className={`physical-two-page-spread mobile-${activeMobilePage}`}>
            {target === "new" && !book ? (
              <CreateForm
                onSubmit={create}
                busy={busy}
                error={error}
                defaultMethod={initialPayload?.defaultMethod}
                onSwitchPage={setActiveMobilePage}
              />
            ) : book ? (
              <StudyView
                book={book}
                tab={tab}
                onTabChange={(newTab) => {
                  setTab(newTab);
                  if (newTab !== "summary") {
                    setActiveMobilePage("right");
                  }
                }}
                onRemove={remove}
              />
            ) : loadErr ? (
              <div className="book-loading-parchment">
                <p className="state-msg error">{loadErr}</p>
                <button type="button" className="btn-primary" onClick={close}>
                  Return to Shelf
                </button>
              </div>
            ) : (
              <div className="book-loading-parchment">
                <div className="loading-feather-quill">✦</div>
                <p className="state-msg">Opening volume…</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


