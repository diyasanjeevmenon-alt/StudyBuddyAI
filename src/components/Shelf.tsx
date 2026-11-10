import React, { useEffect, useRef, useState } from "react";
import { StudySetSummary } from "../types";
import { coverFor, formatDate, sizeFor } from "../utils";

interface TomePreviewProps {
  book: { key: string; isNew?: boolean; set?: StudySetSummary };
  align: "left" | "center" | "right";
  onOpen: (key: string) => void;
}

function TomePreviewPopup({ book, align, onOpen }: TomePreviewProps) {
  const isNew = book.isNew;
  const s = book.set;

  let alignClass = "preview-center";
  if (align === "left") alignClass = "preview-left";
  if (align === "right") alignClass = "preview-right";

  return (
    <div
      className={`tome-preview-card ${alignClass}`}
      role="tooltip"
      onClick={(e) => {
        e.stopPropagation();
        onOpen(book.key);
      }}
    >
      {/* Decorative corner accents */}
      <span className="corner-flourish tl" aria-hidden="true">✦</span>
      <span className="corner-flourish tr" aria-hidden="true">✦</span>

      {isNew ? (
        <>
          <div className="preview-crest">✨ NEW STUDY BOOK</div>
          <h4 className="preview-title">Start a New Book</h4>
          <p className="preview-sub">Turn your material into an interactive study pack</p>
          <div className="preview-divider">
            <span className="diamond">✦</span>
          </div>
          <p className="preview-desc">
            Upload a PDF, paste lecture notes, drop a study photo, or paste a YouTube video link.
          </p>
          <div className="preview-badges">
            <span className="preview-badge badge-blue">🗂️ Flashcards</span>
            <span className="preview-badge badge-amber">🎯 Quiz Questions</span>
            <span className="preview-badge badge-green">📅 7-Day Plan</span>
          </div>
          <div className="preview-action">Click to create book ➔</div>
        </>
      ) : (
        s && (
          <>
            <div className="preview-crest">📖 BOOK PREVIEW</div>
            <h4 className="preview-title">{s.title}</h4>
            <p className="preview-sub">{s.subject || "Study Subject"}</p>
            <div className="preview-divider">
              <span className="diamond">✦</span>
            </div>
            <div className="preview-stats-grid">
              <div className="preview-stat-item stat-blue">
                <span className="stat-num">{s.counts.flashcards}</span>
                <span className="stat-lbl">Flashcards</span>
              </div>
              <div className="preview-stat-item stat-amber">
                <span className="stat-num">{s.counts.mcqs}</span>
                <span className="stat-lbl">Questions</span>
              </div>
              <div className="preview-stat-item stat-green">
                <span className="stat-num">7-Day</span>
                <span className="stat-lbl">Revision</span>
              </div>
            </div>
            <div className="preview-meta-row">
              <span>Saved {formatDate(s.created_at)}</span>
              <span>·</span>
              <span>PDF Download Ready</span>
            </div>
            <div className="preview-action">Click to open book ➔</div>
          </>
        )
      )}
      <div className="preview-arrow" aria-hidden="true" />
    </div>
  );
}

interface SpineProps {
  book: { key: string; isNew?: boolean; set?: StudySetSummary };
  hidden: boolean;
  align: "left" | "center" | "right";
  isHovered: boolean;
  registerSpine: (key: string, el: HTMLElement | null) => void;
  onOpen: (key: string) => void;
  onHover: (key: string | null) => void;
}

function SpineAnchor({
  book,
  hidden,
  align,
  isHovered,
  registerSpine,
  onOpen,
  onHover,
}: SpineProps) {
  const common = {
    ref: (el: HTMLButtonElement | null) => registerSpine(book.key, el),
    onClick: () => onOpen(book.key),
    onMouseEnter: () => onHover(book.key),
    onMouseLeave: () => onHover(null),
    onFocus: () => onHover(book.key),
    onBlur: () => onHover(null),
  };

  const isNew = book.isNew;
  const s = book.set;
  const cover = s ? coverFor(s.id) : null;
  const { w, h } = s ? sizeFor(s.id) : { w: 56, h: 280 };

  return (
    <div
      className="spine-anchor"
      onMouseEnter={() => onHover(book.key)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Interactive Preview Tooltip Pop-up */}
      {isHovered && !hidden && (
        <TomePreviewPopup book={book} align={align} onOpen={onOpen} />
      )}

      {isNew ? (
        <button
          {...common}
          className={"spine spine-new" + (hidden ? " is-out" : "")}
          style={{ "--w": 56, "--h": 280 } as React.CSSProperties}
          aria-label="Create a new study book"
        >
          <span className="ribbon-tail" aria-hidden="true" />
          <span className="plus" aria-hidden="true">+</span>
          <span className="spine-title">Create New Book</span>
        </button>
      ) : (
        s && (
          <button
            {...common}
            className={"spine" + (hidden ? " is-out" : "")}
            style={
              {
                "--c": cover?.bg,
                "--band": cover?.band,
                "--w": w,
                "--h": h,
              } as React.CSSProperties
            }
            aria-label={`Open book: ${s.title}`}
          >
            {/* Classic gold-embossed spine ribs */}
            <span className="gold-rib rib-top" aria-hidden="true" />
            <span className="gold-rib rib-mid-1" aria-hidden="true" />
            <span className="gold-rib rib-mid-2" aria-hidden="true" />
            <span className="gold-rib rib-bottom" aria-hidden="true" />
            <span className="spine-crest-icon" aria-hidden="true">★</span>
            <span className="spine-title">{s.title}</span>
            <span className="spine-mark" aria-hidden="true">⚜</span>
          </button>
        )
      )}
    </div>
  );
}

interface ShelfProps {
  sets: StudySetSummary[];
  loaded: boolean;
  loadError: string;
  activeKey?: string | null;
  registerSpine: (key: string, el: HTMLElement | null) => void;
  onOpen: (key: string) => void;
  onOpenImageScanner?: () => void;
  onRetry: () => void;
}

export default function Shelf({
  sets,
  loaded,
  loadError,
  activeKey,
  registerSpine,
  onOpen,
  onRetry,
}: ShelfProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [perRow, setPerRow] = useState(10);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setPerRow(Math.max(3, Math.floor((entry.contentRect.width - 40) / 72)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const books: Array<{ key: string; isNew?: boolean; set?: StudySetSummary }> = [
    { key: "new", isNew: true },
    ...sets.map((s) => ({ key: s.id, set: s })),
  ];

  const rows: Array<Array<{ key: string; isNew?: boolean; set?: StudySetSummary }>> = [];
  for (let i = 0; i < books.length; i += perRow) {
    rows.push(books.slice(i, i + perRow));
  }

  let caption = {
    main: "Pick a book to study.",
    sub: "Hover over any book to preview it. Click to open. Press Esc to put it back.",
  };

  if (loadError) {
    caption = { main: "Couldn't load your bookshelf.", sub: loadError };
  } else if (hover === "new") {
    caption = {
      main: "Create New Book",
      sub: "Upload a PDF, paste notes, add a study photo, or paste a YouTube video link.",
    };
  } else if (hover) {
    const s = sets.find((x) => x.id === hover);
    if (s) {
      caption = {
        main: s.title,
        sub: `${s.subject ? s.subject + " · " : ""}${s.counts.flashcards} flashcards, ${
          s.counts.mcqs
        } quiz questions, created ${formatDate(s.created_at)}.`,
      };
    }
  } else if (loaded && sets.length === 0) {
    caption = {
      main: "Your bookshelf is ready.",
      sub: "Click the '+' book on the left to create your first study pack.",
    };
  }

  return (
    <section className="shelf" ref={wrapRef} aria-label="Bookshelf">
      {rows.map((row, r) => (
        <div key={r}>
          <div className="shelf-row">
            {row.map((b, colIdx) => {
              let align: "left" | "center" | "right" = "center";
              if (colIdx === 0) align = "left";
              else if (colIdx >= row.length - 1 && row.length > 2) align = "right";

              return (
                <SpineAnchor
                  key={b.key}
                  book={b}
                  align={align}
                  isHovered={hover === b.key}
                  hidden={activeKey === b.key}
                  registerSpine={registerSpine}
                  onOpen={onOpen}
                  onHover={setHover}
                />
              );
            })}
          </div>
          <div className="plank" />
        </div>
      ))}

      <div className="caption" aria-live="polite">
        <span className="caption-main">{caption.main}</span>
        <small className="caption-sub">{caption.sub}</small>
        {loadError && (
          <button className="link-btn" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </section>
  );
}
