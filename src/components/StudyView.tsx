import React, { useState, useEffect, useRef } from "react";
import { StudySetDetail } from "../types";
import Flashcards from "./Flashcards";
import Quiz from "./Quiz";
import Plan from "./Plan";
import Chat from "./Chat";
import { SOURCE_LABEL, formatDate } from "../utils";
import {
  BookOpen,
  Lightbulb,
  Layers,
  HelpCircle,
  Calendar,
  MessageSquare,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Timer,
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Page-turn sound effect
function playPageTurnSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const duration = 0.2;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const envelope = Math.exp(-i / (bufferSize * 0.35));
      output[i] = (Math.random() * 2 - 1) * envelope;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1400, ctx.currentTime);
    filter.Q.setValueAtTime(1.5, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + 0.18);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.19);

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    whiteNoise.start();
    whiteNoise.stop(ctx.currentTime + 0.2);
  } catch {
    // Non-blocking fallback
  }
}

// Mini page visual wireframe renderer for section thumbnails
function MiniThumbnailContent({ tabId, pack }: { tabId: string; pack: any }) {
  switch (tabId) {
    case "summary":
      return (
        <div className="mini-page-wireframe">
          <div className="mini-wire-title" />
          <div className="mini-wire-line w-11/12" />
          <div className="mini-wire-line w-full" />
          <div className="mini-wire-line w-9/12" />
          <div className="mini-wire-chip-row">
            <span className="mini-wire-badge" />
            <span className="mini-wire-badge" />
          </div>
          <div className="mini-wire-line w-8/12 opacity-50" />
        </div>
      );
    case "concepts":
      return (
        <div className="mini-page-wireframe">
          <div className="mini-wire-header-icon">
            <Lightbulb size={8} className="text-amber-700" />
            <span className="mini-wire-math">Σ fx</span>
          </div>
          <div className="mini-wire-card-block">
            <div className="mini-wire-line w-3/4 bg-amber-900/50" />
            <div className="mini-wire-line w-full opacity-60" />
          </div>
          <div className="mini-wire-card-block">
            <div className="mini-wire-line w-2/3 bg-amber-900/50" />
            <div className="mini-wire-line w-5/6 opacity-60" />
          </div>
        </div>
      );
    case "cards":
      return (
        <div className="mini-card-stack">
          <div className="mini-card-layer mini-card-back" />
          <div className="mini-card-layer mini-card-middle" />
          <div className="mini-card-layer mini-card-front">
            <Layers size={9} className="text-rose-800 mb-0.5" />
            <span className="mini-card-counter">{pack.flashcards?.length || 0}</span>
          </div>
        </div>
      );
    case "quiz":
      return (
        <div className="mini-page-wireframe">
          <div className="mini-quiz-q-line" />
          <div className="mini-quiz-options">
            <div className="mini-quiz-opt">
              <span className="mini-quiz-dot" />
              <div className="mini-wire-line w-7/12" />
            </div>
            <div className="mini-quiz-opt">
              <span className="mini-quiz-check">✓</span>
              <div className="mini-wire-line w-8/12 bg-emerald-700/60" />
            </div>
            <div className="mini-quiz-opt">
              <span className="mini-quiz-dot" />
              <div className="mini-wire-line w-6/12" />
            </div>
          </div>
        </div>
      );
    case "plan":
      return (
        <div className="mini-page-wireframe">
          <div className="mini-plan-grid">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <div key={day} className={`mini-plan-cell ${day <= 2 ? "done" : ""}`}>
                {day <= 2 ? "✓" : `D${day}`}
              </div>
            ))}
          </div>
          <div className="mini-plan-progress-bar">
            <div className="mini-plan-progress-fill" style={{ width: "40%" }} />
          </div>
        </div>
      );
    case "ask":
      return (
        <div className="mini-page-wireframe">
          <div className="mini-chat-bubble user">
            <div className="mini-wire-line w-3/4 bg-amber-950/40" />
          </div>
          <div className="mini-chat-bubble bot">
            <MessageSquare size={7} className="text-amber-800" />
            <div className="mini-wire-line w-5/6 bg-amber-950/30" />
          </div>
          <div className="mini-chat-bubble bot">
            <div className="mini-wire-line w-2/3 bg-amber-950/30" />
          </div>
        </div>
      );
    default:
      return <div className="mini-page-wireframe" />;
  }
}

export const STUDY_TABS = [
  { id: "summary", label: "Overview", icon: BookOpen },
  { id: "concepts", label: "Concepts & Formulas", icon: Lightbulb },
  { id: "cards", label: "Flashcards", icon: Layers },
  { id: "quiz", label: "Quiz Trial", icon: HelpCircle },
  { id: "plan", label: "7-Day Plan", icon: Calendar },
  { id: "ask", label: "Study Tutor", icon: MessageSquare },
];

interface StudyViewProps {
  book: StudySetDetail;
  tab: string;
  onTabChange: (tabId: string) => void;
  onRemove: () => void;
}

export default function StudyView({ book, tab, onTabChange }: StudyViewProps) {
  const p = book.pack;

  // Text to Speech
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Focus Timer (Pomodoro 25 min)
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleSpeech = () => {
    if (!window.speechSynthesis) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const textToRead = `${book.title}. ${book.subject ? `Subject: ${book.subject}.` : ""} ${p.summary || ""}`;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.rate = 0.95;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const copySummary = () => {
    if (!p.summary) return;
    navigator.clipboard.writeText(`${book.title}\n\n${p.summary}`);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const curIdx = Math.max(0, STUDY_TABS.findIndex((t) => t.id === tab));
  const activeThumbRef = useRef<HTMLButtonElement | null>(null);

  const handleSelectTab = (id: string) => {
    if (id !== tab) {
      playPageTurnSound();
    }
    onTabChange(id);
  };

  const goToPrev = () => {
    if (curIdx > 0) {
      handleSelectTab(STUDY_TABS[curIdx - 1].id);
    }
  };

  const goToNext = () => {
    if (curIdx < STUDY_TABS.length - 1) {
      handleSelectTab(STUDY_TABS[curIdx + 1].id);
    }
  };

  // Keep active thumbnail visible in strip
  useEffect(() => {
    activeThumbRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [tab]);

  // Keyboard shortcut support: 1-6 and arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.key >= "1" && e.key <= "6") {
        const idx = parseInt(e.key, 10) - 1;
        if (STUDY_TABS[idx]) {
          handleSelectTab(STUDY_TABS[idx].id);
        }
      } else if (e.key === "ArrowLeft") {
        if (curIdx > 0) {
          handleSelectTab(STUDY_TABS[curIdx - 1].id);
        }
      } else if (e.key === "ArrowRight") {
        if (curIdx < STUDY_TABS.length - 1) {
          handleSelectTab(STUDY_TABS[curIdx + 1].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tab, curIdx, onTabChange]);

  return (
    <div className="study-book-spread">
      {/* Scrollable / Interactive Two-Page Spread Row */}
      <div className="study-spread-pages-row">
        {/* Left Page */}
        <div className="parchment-book-page page-verso">
        <div className="page-texture-overlay" />
        <div className="page-inner-content">
          {/* Running Header */}
          <div className="page-running-head">
            <span className="running-star">✦</span>
            <span className="running-text">STUDY GUIDE</span>
            <span className="running-star">✦</span>
          </div>

          {/* Symmetrical Sub-Header Bar */}
          <div className="page-subhead-bar verso-subhead">
            <div className="verso-subhead-left">
              <span className="verso-volume-title">{book.title}</span>
              {book.subject && <span className="subject-chip">{book.subject}</span>}
            </div>
            <span className="verso-source-badge">
              {SOURCE_LABEL[book.source_type] || "Notes"} · {formatDate(book.created_at)}
            </span>
          </div>

          {/* Scrollable Left Page Body */}
          <div className="page-body-scroll">
            {book.prefs?.notice && (
              <div role="status" className="mb-3 p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs font-sans">
                {book.prefs.notice}
              </div>
            )}
            {/* Executive Summary with Interactive Toolbar */}
            <div className="book-prose-section">
              <div className="flex items-center justify-between pb-1.5 border-b border-black/10 mb-3">
                <h3 className="section-small-title m-0">Quick Summary</h3>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleSpeech}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded border transition-colors ${
                      isSpeaking
                        ? "bg-[#6b2230] text-amber-200 border-[#852a3b]"
                        : "bg-black/5 hover:bg-black/10 text-[#4a3a2b] border-black/15"
                    }`}
                    title={isSpeaking ? "Stop reading aloud" : "Read summary aloud (Text-to-Speech)"}
                  >
                    {isSpeaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
                    <span>{isSpeaking ? "Stop" : "Read Aloud"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={copySummary}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-black/5 hover:bg-black/10 text-[#4a3a2b] border border-black/15 transition-colors"
                    title="Copy summary text to clipboard"
                  >
                    {copiedSummary ? <Check size={13} className="text-emerald-700" /> : <Copy size={13} />}
                    <span>{copiedSummary ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>

              {p.summary ? (
                p.summary.split(/\n{2,}/).map((para, i) => (
                  <p key={i} className={`book-paragraph ${i === 0 ? "first-lead" : ""}`}>
                    {para}
                  </p>
                ))
              ) : (
                <p className="empty-text">No summary recorded for this volume.</p>
              )}
            </div>

            {/* Key Definitions Preview */}
            {p.definitions && p.definitions.length > 0 && (
              <div className="left-definitions-card">
                <h4 className="card-subhead">Key Terms at a Glance</h4>
                <dl className="left-terms-list">
                  {p.definitions.slice(0, 4).map((d, i) => (
                    <div key={i} className="term-entry">
                      <dt className="term-title">{d.term}:</dt>
                      <dd className="term-desc">{d.definition}</dd>
                    </div>
                  ))}
                </dl>
                {p.definitions.length > 4 && (
                  <button
                    type="button"
                    className="more-terms-btn"
                    onClick={() => onTabChange("concepts")}
                  >
                    +{p.definitions.length - 4} more terms in Concepts & Formulas →
                  </button>
                )}
              </div>
            )}

            {/* Summary Stats & Pomodoro Study Timer */}
            <div className="left-page-stats-bar">
              <div className="stat-pill">
                <strong>{p.flashcards?.length || 0}</strong> Cards
              </div>
              <div className="stat-pill">
                <strong>{p.mcqs?.length || 0}</strong> Questions
              </div>
              <div className="stat-pill">
                <strong>{p.revision_plan?.length || 0}</strong> Days Plan
              </div>

              {/* Pomodoro Focus Timer Widget */}
              <div className="flex items-center gap-1.5 ml-auto bg-amber-500/10 border border-amber-600/30 px-2.5 py-1 rounded-full text-xs font-mono text-[#5c442d]">
                <Timer size={13} className="text-[#852a3b]" />
                <span className="font-bold">{formatTimer(timerSeconds)}</span>
                <button
                  type="button"
                  onClick={() => setTimerActive(!timerActive)}
                  className="p-0.5 hover:text-[#852a3b] cursor-pointer"
                  title={timerActive ? "Pause Focus Timer" : "Start 25-min Focus Timer"}
                >
                  {timerActive ? <Pause size={12} /> : <Play size={12} />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTimerActive(false);
                    setTimerSeconds(25 * 60);
                  }}
                  className="p-0.5 hover:text-[#852a3b] cursor-pointer"
                  title="Reset Timer"
                >
                  <RotateCcw size={11} />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Folio */}
          <div className="page-bottom-folio">
            <span>· Page 1 ·</span>
          </div>
        </div>
      </div>

      {/* Center Spine */}
      <div className="book-center-spine-crease">
        <div className="spine-silk-ribbon" />
        <div className="spine-shadow-left" />
        <div className="spine-crease-core" />
        <div className="spine-shadow-right" />
      </div>

      {/* Right Page */}
      <div className="parchment-book-page page-recto">
        <div className="page-texture-overlay" />
        <div className="page-inner-content">
          {/* Running Header */}
          <div className="page-running-head">
            <span className="running-star">✦</span>
            <span className="running-text">
              {tab === "summary" && "CHAPTER 1 · SUMMARY"}
              {tab === "concepts" && "CHAPTER 2 · KEY CONCEPTS"}
              {tab === "cards" && "PRACTICE · FLASHCARDS"}
              {tab === "quiz" && "TEST · PRACTICE QUIZ"}
              {tab === "plan" && "REVISION · 7-DAY STUDY PLAN"}
              {tab === "ask" && "TUTOR · ASK QUESTIONS"}
            </span>
            <span className="running-star">✦</span>
          </div>

          {/* Symmetrical Sub-Header Bar (Tabs bar with clean Lucide icons) */}
          <div className="page-subhead-bar recto-subhead">
            <nav className="book-ribbon-tabs" role="tablist" aria-label="Book sections">
              {STUDY_TABS.map((t) => {
                const Icon = t.icon;
                const isSelected = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    className={`ribbon-tab ${isSelected ? "is-selected" : ""}`}
                    onClick={() => handleSelectTab(t.id)}
                  >
                    <Icon size={14} className="tab-icon" />
                    <span className="tab-label">{t.label}</span>
                    {t.id === "cards" && p.flashcards?.length ? (
                      <span className="tab-count">{p.flashcards.length}</span>
                    ) : null}
                    {t.id === "quiz" && p.mcqs?.length ? (
                      <span className="tab-count">{p.mcqs.length}</span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Scrollable Right Page Body */}
          <div className="page-body-scroll" role="tabpanel">
            {tab === "summary" && (
              <div className="tab-pane-summary">
                <div className="analysis-box">
                  <h3 className="section-title">Key Points</h3>
                  {p.key_concepts && p.key_concepts.length > 0 ? (
                    <div className="concepts-summary-grid">
                      {p.key_concepts.map((c, i) => (
                        <div key={i} className="concept-card">
                          <span className="concept-badge">0{i + 1}</span>
                          <h4 className="concept-name">{c.name}</h4>
                          <p className="concept-desc">{c.explanation}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-text">Review the flashcards and practice quiz on the next tabs.</p>
                  )}
                </div>

                <div className="study-quick-prompt">
                  <p>Ready to test your memory? Switch to <strong>Flashcards</strong> or test yourself with the <strong>Practice Quiz</strong>.</p>
                </div>
              </div>
            )}

            {tab === "concepts" && (
              <div className="tab-pane-concepts">
                <section className="concepts-group">
                  <h3 className="section-title">Core Concepts</h3>
                  {p.key_concepts && p.key_concepts.length ? (
                    <dl className="study-concepts-list">
                      {p.key_concepts.map((c, i) => (
                        <div key={i} className="concept-row">
                          <dt className="concept-dt">{c.name}</dt>
                          <dd className="concept-dd">{c.explanation}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="empty-text">No key concepts recorded.</p>
                  )}
                </section>

                <section className="concepts-group">
                  <h3 className="section-title">Formulas & Principles</h3>
                  {p.formulas && p.formulas.length ? (
                    <div className="formulas-grid">
                      {p.formulas.map((f, i) => (
                        <div key={i} className="formula-box">
                          <div className="formula-header">
                            <span className="formula-name">{f.name}</span>
                          </div>
                          <code className="formula-code">{f.formula}</code>
                          {f.note && <p className="formula-note">{f.note}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-text">No mathematical formulas were found in this source.</p>
                  )}
                </section>

                <section className="concepts-group">
                  <h3 className="section-title">Complete Glossary & Definitions</h3>
                  {p.definitions && p.definitions.length ? (
                    <dl className="definitions-list">
                      {p.definitions.map((d, i) => (
                        <div key={i} className="def-row">
                          <dt className="def-term">{d.term}</dt>
                          <dd className="def-text">{d.definition}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="empty-text">No additional definitions found.</p>
                  )}
                </section>
              </div>
            )}

            {tab === "cards" && (
              <div className="tab-pane-interactive">
                <Flashcards cards={p.flashcards || []} bookTitle={book.title} />
              </div>
            )}

            {tab === "quiz" && (
              <div className="tab-pane-interactive">
                <Quiz mcqs={p.mcqs || []} bookTitle={book.title} />
              </div>
            )}

            {tab === "plan" && (
              <div className="tab-pane-interactive">
                <Plan setId={book.id} plan={p.revision_plan || []} />
              </div>
            )}

            {tab === "ask" && (
              <div className="tab-pane-interactive">
                <Chat setId={book.id} bookTitle={book.title} />
              </div>
            )}
          </div>

          {/* Bottom Folio */}
          <div className="page-bottom-folio">
            <span>· Page 2 ·</span>
          </div>
        </div>
      </div>
    </div>

    {/* Navigation Strip with Small Thumbnails at the Bottom of Book Spread */}
    <nav className="book-spread-nav-strip" aria-label="Study guide sections thumbnail navigation">
      {/* Left Stepper & Current Section Indicator */}
      <div className="nav-strip-control-group">
        <button
          type="button"
          className="nav-strip-arrow-btn"
          onClick={goToPrev}
          disabled={curIdx <= 0}
          title="Previous section (← Arrow or Key 1-6)"
          aria-label="Previous section"
        >
          <ChevronLeft size={13} />
          <span>Prev</span>
        </button>

        <div className="nav-strip-section-indicator">
          <span className="indicator-badge">Section {curIdx + 1} of {STUDY_TABS.length}</span>
          <span className="indicator-name">{STUDY_TABS[curIdx]?.label || "Section"}</span>
        </div>
      </div>

      {/* Central Miniature Thumbnails Track */}
      <div className="nav-strip-thumbnails-track" role="tablist">
        {STUDY_TABS.map((t, idx) => {
          const isSelected = tab === t.id;
          let tag = "";
          if (t.id === "summary") tag = "Ch. 1";
          else if (t.id === "concepts") tag = `${p.definitions?.length || 0} Terms`;
          else if (t.id === "cards") tag = `${p.flashcards?.length || 0} Cards`;
          else if (t.id === "quiz") tag = `${p.mcqs?.length || 0} Qs`;
          else if (t.id === "plan") tag = `${p.revision_plan?.length || 7} Days`;
          else if (t.id === "ask") tag = "Tutor";

          return (
            <button
              key={t.id}
              ref={isSelected ? activeThumbRef : null}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`nav-strip-thumb-btn ${isSelected ? "is-active" : ""}`}
              onClick={() => handleSelectTab(t.id)}
              title={`Jump to ${t.label} (Press ${idx + 1})`}
            >
              {/* Miniature Page Thumbnail Canvas */}
              <div className="thumb-mini-page">
                {isSelected && <div className="thumb-active-bookmark" aria-hidden="true" />}
                <MiniThumbnailContent tabId={t.id} pack={p} />
              </div>

              {/* Thumbnail Caption & Tag */}
              <span className="thumb-label">{t.label}</span>
              <span className="thumb-tag-pill">{tag}</span>
            </button>
          );
        })}
      </div>

      {/* Right Stepper & Keyboard Shortcuts Hint */}
      <div className="nav-strip-hint-col">
        <span
          className="nav-strip-kbd-badge"
          title="Press numbers 1 to 6 on your keyboard to instantly jump to any section"
        >
          <span>Jump:</span>
          <kbd>1</kbd>–<kbd>6</kbd>
        </span>

        <button
          type="button"
          className="nav-strip-arrow-btn"
          onClick={goToNext}
          disabled={curIdx >= STUDY_TABS.length - 1}
          title="Next section (→ Arrow or Key 1-6)"
          aria-label="Next section"
        >
          <span>Next</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </nav>
  </div>
);
}
