import React, { useCallback, useEffect, useRef, useState } from "react";
import Shelf from "./components/Shelf";
import Notebook from "./components/Notebook";
import ImageAnalyzer from "./components/ImageAnalyzer";
import ThreeBookModel from "./components/ThreeBookModel";
import MagicParticles from "./components/MagicParticles";
import AboutModal from "./components/AboutModal";
import { listSets, warmUp } from "./api";
import { StudySetSummary, StudySetDetail } from "./types";
import { loadStreakState } from "./streakManager";

export default function App() {
  const [sets, setSets] = useState<StudySetSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [open, setOpen] = useState<{
    key: string;
    rect: DOMRect | null;
    initialPayload?: any;
  } | null>(null);
  const [showImageScanner, setShowImageScanner] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const spineEls = useRef<Record<string, HTMLElement>>({});

  // Verified Study Streak State (Loaded from streakManager)
  const [streakDays, setStreakDays] = useState(() => loadStreakState().streakDays);
  const [studiedToday, setStudiedToday] = useState(() => loadStreakState().studiedToday);

  // Cursor position for the glow effect
  const [mousePos, setMousePos] = useState({ x: -500, y: -500 });

  useEffect(() => {
    // Initial sync
    const st = loadStreakState();
    setStreakDays(st.streakDays);
    setStudiedToday(st.studiedToday);

    // Listen for verified study activity events dispatched by Quiz, Flashcards, Chat, CreateForm
    const onStreakUpdate = (e: any) => {
      const updated = e.detail || loadStreakState();
      setStreakDays(updated.streakDays);
      setStudiedToday(updated.studiedToday);
    };

    window.addEventListener("study_streak_updated", onStreakUpdate);
    return () => window.removeEventListener("study_streak_updated", onStreakUpdate);
  }, []);

  // Track cursor for the glow effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const refresh = useCallback(async () => {
    try {
      setSets(await listSets());
      setLoadError("");
    } catch (e: any) {
      setLoadError(e.message || "Failed to load your books.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    warmUp();
    refresh();
  }, [refresh]);

  const registerSpine = useCallback((key: string, el: HTMLElement | null) => {
    if (el) spineEls.current[key] = el;
    else delete spineEls.current[key];
  }, []);

  const getRect = useCallback((key: string) => spineEls.current[key]?.getBoundingClientRect() ?? null, []);

  const openBook = useCallback(
    (key: string, initialPayload?: any) => {
      setOpen({ key, rect: getRect(key), initialPayload });
    },
    [getRect]
  );

  function handleCreateFromImage(payload: any) {
    openBook("new", payload);
  }

  const scrollToShelf = () => {
    document.getElementById("library-shelf")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="room" onMouseMove={handleMouseMove}>
      {/* Floating particles */}
      <MagicParticles />

      {/* Cursor glow */}
      <div
        className="candlelight-cursor-glow"
        style={{
          left: `${mousePos.x}px`,
          top: `${mousePos.y}px`,
        }}
        aria-hidden="true"
      />

      <div className="wrap">
        {/* Architectural Top Navigation Bar */}
        <header className="top">
          <a className="brand" href="#top">
            <span className="brand-crest floating-crest">✦</span>
            <div className="brand-title-wrap">
              <span className="brand-text">STUDY BUDDY AI</span>
              <span className="brand-sub">NOTES · QUIZZES · REVISION</span>
            </div>
          </a>

          <div
            className="header-streak-pill hover-interactive-pill"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            title="Click to check your daily study streak"
          >
            <span className="fire-flicker">🔥</span>
            <span className="pill-text"><strong>{streakDays} DAYS</strong> ACTIVE STREAK</span>
          </div>

          <nav className="header-nav">
            <button
              type="button"
              onClick={() => setShowAboutModal(true)}
              className="nav-link cursor-pointer bg-transparent border-0"
            >
              About
            </button>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="hero-layout" id="top">
          <div className="hero-content">
            <h1 className="hero-title">
              Study Smarter, Retain More
            </h1>

            <div className="hero-editorial-quote">
              “Simple, powerful study guides for any class or exam.”
            </div>

            <p className="hero-desc">
              Turn your notes, PDFs, photos, and YouTube videos into interactive study books.
              Open any book to read clear summaries, practice with 3D flip flashcards,
              test yourself with quizzes, and follow a 7-day revision plan.
            </p>

            {/* Primary Action Buttons */}
            <div className="hero-actions-row">
              <button
                type="button"
                className="btn-create-book glow-btn hover-interactive-btn"
                onClick={() => openBook("new")}
                title="Create a new study guide"
              >
                <span className="btn-icon-float">✨</span>
                <span>Create Study Guide</span>
              </button>

              <button
                type="button"
                className="btn-quick-photo hover-float hover-interactive-btn"
                onClick={() => setShowImageScanner(true)}
                title="Scan handwritten notes or textbook diagrams"
              >
                <span className="btn-icon-float">📷</span>
                <span>Scan Notes or Photos</span>
              </button>

              <button
                type="button"
                className="btn-browse-shelf hover-interactive-btn"
                onClick={scrollToShelf}
                title="Jump directly to your study books"
              >
                <span>Explore Shelves ➔</span>
              </button>
            </div>
          </div>

          {/* 3D book */}
          <div className="hero-3d-model-col">
            <ThreeBookModel
              streakDays={streakDays}
              studiedToday={studiedToday}
              onOpenShelfBook={scrollToShelf}
            />
          </div>
        </section>

        {/* Bookshelf Component Section */}
        <div id="library-shelf" className="shelf-section-wrap">
          <div className="shelf-header-bar">
            <div className="shelf-heading-group">
              <h2 className="shelf-main-title">Your Study Books</h2>
            </div>
            <p className="shelf-hint">
              Click any book on the shelf to open its summary, flashcards, and practice quiz.
            </p>
          </div>

          <Shelf
            sets={sets}
            loaded={loaded}
            loadError={loadError}
            activeKey={open?.key}
            registerSpine={registerSpine}
            onOpen={openBook}
            onRetry={refresh}
          />
        </div>

        {/* Colophon & Footer */}
        <footer className="foot">
          <div className="foot-content">
            <div className="foot-brand">✦ STUDY BUDDY AI · SMART STUDY PACKS</div>
            <div className="flex items-center justify-center gap-4 text-xs">
              <span>Press <kbd>Esc</kbd> anytime to close an open book.</span>
              <span>·</span>
              <button
                type="button"
                onClick={() => setShowAboutModal(true)}
                className="text-amber-400/90 hover:text-amber-300 underline cursor-pointer bg-transparent border-0"
              >
                How It Works
              </button>
            </div>
            <div className="foot-quote">“Practice a little every day to remember what you learn.”</div>
          </div>
        </footer>
      </div>

      {/* About Popup Modal */}
      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />

      {/* Modal Notebook Reader */}
      {open && (
        <Notebook
          key={open.key}
          target={open.key}
          fromRect={open.rect}
          getRect={getRect}
          initialPayload={open.initialPayload}
          onCreated={(b: StudySetDetail) => setSets((s) => [b, ...s.filter((x) => x.id !== b.id)])}
          onDeleted={(id: string) => setSets((s) => s.filter((x) => x.id !== id))}
          onClosed={() => setOpen(null)}
        />
      )}

      {/* Study Photo Scanner Modal */}
      {showImageScanner && (
        <ImageAnalyzer
          onClose={() => setShowImageScanner(false)}
          onCreateNotebookFromImage={handleCreateFromImage}
        />
      )}
    </div>
  );
}
