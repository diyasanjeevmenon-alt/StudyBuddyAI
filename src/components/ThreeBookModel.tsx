import React, { useState, useRef, useCallback, useEffect } from "react";
import { getTierForDays, getNextTier } from "./StudyStreak";
import { BookOpen, Flame, CheckCircle, X, Calendar } from "lucide-react";
import { loadStreakState } from "../streakManager";

interface ThreeBookModelProps {
  streakDays: number;
  studiedToday: boolean;
  onOpenShelfBook?: () => void;
}

// Synthesizes a realistic, soft paper rustle sound when pages turn
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

    const duration = 0.26;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Organic paper friction noise curve
    for (let i = 0; i < bufferSize; i++) {
      const envelope = Math.exp(-i / (bufferSize * 0.35));
      output[i] = (Math.random() * 2 - 1) * envelope;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    // Bandpass filter for the page-turn sound
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1400, ctx.currentTime);
    filter.Q.setValueAtTime(1.5, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + 0.22);

    // Gain envelope
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.035);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    whiteNoise.start();
    whiteNoise.stop(ctx.currentTime + 0.26);
  } catch {
    // Non-blocking fallback if audio context is blocked
  }
}

export function ScholarlyHeraldicCrest({ tierIndex, size = 64 }: { tierIndex: number; size?: number }) {
  const s = size;
  switch (tierIndex) {
    case 0:
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="46" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="4 2" />
          <circle cx="50" cy="50" r="41" stroke="#fef3c7" strokeWidth="1.2" />
          <path d="M24 64 C34 58, 45 60, 50 66 C55 60, 66 58, 76 64 L76 74 C66 68, 55 70, 50 76 C45 70, 34 68, 24 74 Z" fill="#2d170f" stroke="#e5c158" strokeWidth="1.8" />
          <path d="M50 64 L50 40" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M50 48 C42 46, 38 38, 42 34 C48 34, 50 42, 50 48 Z" fill="#34d399" />
          <path d="M50 42 C58 40, 62 32, 58 28 C52 28, 50 36, 50 42 Z" fill="#10b981" />
          <circle cx="50" cy="22" r="3" fill="#fbbf24" />
        </svg>
      );
    case 1:
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="46" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="6 3" />
          <circle cx="50" cy="50" r="41" stroke="#93c5fd" strokeWidth="1.2" />
          <ellipse cx="50" cy="50" rx="34" ry="14" stroke="#60a5fa" strokeWidth="1.5" transform="rotate(-30 50 50)" />
          <ellipse cx="50" cy="50" rx="34" ry="14" stroke="#93c5fd" strokeWidth="1" transform="rotate(30 50 50)" />
          <path d="M50 24 L56 40 L72 40 L60 50 L65 66 L50 56 L35 66 L40 50 L28 40 L44 40 Z" fill="#3b82f6" stroke="#fef08a" strokeWidth="1.5" />
          <circle cx="50" cy="46" r="4" fill="#ffffff" />
        </svg>
      );
    case 2:
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="46" stroke="#059669" strokeWidth="2.5" />
          <circle cx="50" cy="50" r="41" stroke="#a7f3d0" strokeWidth="1.2" />
          <path d="M50 42 C40 26, 18 36, 16 56 C26 60, 38 56, 44 48 Z" fill="#1e3a2f" stroke="#34d399" strokeWidth="1.5" />
          <path d="M50 42 C60 26, 82 36, 84 56 C74 60, 62 56, 56 48 Z" fill="#1e3a2f" stroke="#34d399" strokeWidth="1.5" />
          <ellipse cx="50" cy="54" rx="14" ry="20" fill="#064e3b" stroke="#6ee7b7" strokeWidth="1.8" />
          <path d="M40 38 L43 28 L48 35 L52 35 L57 28 L60 38 Z" fill="#065f46" stroke="#34d399" strokeWidth="1.5" />
          <circle cx="44" cy="42" r="5" fill="#fef08a" stroke="#059669" strokeWidth="1" />
          <circle cx="44" cy="42" r="2.2" fill="#111827" />
          <circle cx="56" cy="42" r="5" fill="#fef08a" stroke="#059669" strokeWidth="1" />
          <circle cx="56" cy="42" r="2.2" fill="#111827" />
          <path d="M48 45 L52 45 L50 51 Z" fill="#f59e0b" />
          <path d="M34 76 L50 72 L66 76 L50 70 Z" fill="#fbbf24" stroke="#fef3c7" strokeWidth="1.2" />
        </svg>
      );
    case 3:
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="46" stroke="#d97706" strokeWidth="2.5" />
          <circle cx="50" cy="50" r="41" stroke="#fde68a" strokeWidth="1.2" strokeDasharray="4 2" />
          <path d="M34 32 L66 32 L60 56 C57 64, 43 64, 40 56 Z" fill="#b45309" stroke="#fef3c7" strokeWidth="1.5" />
          <path d="M34 36 C24 36, 24 50, 36 50" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
          <path d="M66 36 C76 36, 76 50, 64 50" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
          <path d="M50 62 L50 72" stroke="#d97706" strokeWidth="3" />
          <rect x="38" y="72" width="24" height="6" rx="2" fill="#f59e0b" stroke="#fef3c7" strokeWidth="1.2" />
          <circle cx="50" cy="42" r="4" fill="#fef08a" />
        </svg>
      );
    case 4:
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="46" stroke="#7c3aed" strokeWidth="2.5" />
          <circle cx="50" cy="50" r="41" stroke="#ddd6fe" strokeWidth="1.2" />
          <path d="M26 64 L74 64 L70 70 L30 70 Z" fill="#7c3aed" stroke="#fef3c7" strokeWidth="1.5" />
          <path d="M26 64 L32 40 L42 54 L50 32 L58 54 L68 40 L74 64 Z" fill="#4c1d95" stroke="#c084fc" strokeWidth="2" />
          <circle cx="50" cy="32" r="4.5" fill="#38bdf8" />
          <circle cx="32" cy="40" r="3.5" fill="#ec4899" />
          <circle cx="68" cy="40" r="3.5" fill="#ec4899" />
          <circle cx="50" cy="67" r="2" fill="#ffffff" />
        </svg>
      );
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="46" stroke="#e11d48" strokeWidth="2.5" />
          <circle cx="50" cy="50" r="41" stroke="#fecdd3" strokeWidth="1.2" strokeDasharray="5 2.5" />
          <path d="M38 72 L32 90 L44 84 L50 90 L50 72 Z" fill="#991b1b" stroke="#f7e096" strokeWidth="1" />
          <path d="M62 72 L68 90 L56 84 L50 90 L50 72 Z" fill="#991b1b" stroke="#f7e096" strokeWidth="1" />
          <path d="M50 20 L56 36 L72 36 L60 46 L65 62 L50 52 L35 62 L40 46 L28 36 L44 36 Z" fill="#f59e0b" stroke="#fef3c7" strokeWidth="1.8" />
          <circle cx="50" cy="44" r="9" fill="#881337" stroke="#fbbf24" strokeWidth="1.5" />
          <circle cx="50" cy="44" r="3" fill="#ffffff" />
        </svg>
      );
  }
}

export default function ThreeBookModel({
  streakDays,
  studiedToday,
  onOpenShelfBook,
}: ThreeBookModelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const tier = getTierForDays(streakDays);
  const nextTier = getNextTier(streakDays);

  const tierIndex = Math.min(
    5,
    streakDays >= 30 ? 5 : streakDays >= 14 ? 4 : streakDays >= 7 ? 3 : streakDays >= 5 ? 2 : streakDays >= 3 ? 1 : 0
  );

  const toggleBook = useCallback((targetState: boolean) => {
    setIsOpen(targetState);
    playPageTurnSound();
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") toggleBook(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, toggleBook]);

  // Generate 7-day weekly study calendar dots
  const streakState = loadStreakState();
  const weeklyDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateKey = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2);
    const isToday = i === 6;
    const hasActivity =
      (isToday && studiedToday) ||
      streakState.history.some((h) => h.date === dateKey) ||
      streakDays > 6 - i;
    return { dateKey, dayLabel, isToday, hasActivity };
  });

  const [mouseTilt, setMouseTilt] = useState({ x: 0, y: 0 });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - (rect.left + rect.width / 2)) / 16;
    const y = (e.clientY - (rect.top + rect.height / 2)) / 16;
    setMouseTilt({ x: Math.max(-8, Math.min(8, x)), y: Math.max(-6, Math.min(6, y)) });
  };

  const handlePointerLeave = () => {
    setMouseTilt({ x: 0, y: 0 });
  };

  return (
    <>
      {/* =========================================================================
          HERO 3D FLOATING TOME (Gapless solid 3D volume, gentle levitation & tilt)
         ========================================================================= */}
      <div
        className="hero-tome-3d-wrapper"
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <div className="grimoire-backlight-glow" />

        <div
          className="hero-tome-3d cursor-pointer select-none"
          onClick={() => toggleBook(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              toggleBook(true);
            }
          }}
          title="Click to open your daily habit ledger"
          style={
            mouseTilt.x !== 0 || mouseTilt.y !== 0
              ? {
                  transform: `translateY(-6px) rotateX(${10 - mouseTilt.y}deg) rotateY(${-18 + mouseTilt.x}deg) rotateZ(-1deg)`,
                  transition: "transform 0.15s ease-out",
                }
              : undefined
          }
        >
          {/* Solid 3D Back Hardcover */}
          <div className="tome-face-back" aria-hidden="true">
            <div className="cover-brass-corners" />
          </div>

          {/* Solid Page Block - Right Gilded Edges */}
          <div className="tome-pages-right" aria-hidden="true" />

          {/* Solid Page Block - Top Gilded Edges */}
          <div className="tome-pages-top" aria-hidden="true" />

          {/* Solid Page Block - Bottom Gilded Edges */}
          <div className="tome-pages-bottom" aria-hidden="true" />

          {/* Bound 3D Leather Spine Pillar on Left */}
          <div className="tome-spine-3d" aria-hidden="true">
            <span className="spine-band-stitch b-1" />
            <span className="spine-band-stitch b-2" />
            <span className="spine-band-stitch b-3" />
            <span className="spine-title-text">HABIT LEDGER</span>
          </div>

          {/* Hanging Silk Bookmark Ribbon */}
          <div className="tome-hanging-ribbon" aria-hidden="true" />

          {/* Solid 3D Front Hardcover Face */}
          <div className="tome-face-front">
            <div className="cover-face-exterior">
              <div className="cover-brass-corners" />
              <div className="cover-gold-inlay-frame" />

              <div className="cover-title-area">
                <span className="cover-kicker-text">✦ HABIT LEDGER ✦</span>
                <span className="cover-sub-text">Daily Study Streak & Rank</span>
              </div>

              <div className="cover-crest-center">
                <div className="crest-aura-glow" />
                <ScholarlyHeraldicCrest tierIndex={tierIndex} size={80} />
              </div>

              <div className="cover-rank-area">
                <h3 className="cover-rank-text">{tier.title}</h3>
                <div className="cover-streak-pill">
                  <Flame size={15} className="text-amber-400" />
                  <span className="font-bold text-amber-300 font-mono text-sm">{streakDays}</span>
                  <span className="text-xs text-stone-200">Day Streak</span>
                </div>
              </div>

              <div className="cover-red-ribbon" />

              <div className="cover-click-invite">
                <span className="click-open-tag">
                  <span>Tap</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic breathing cast shadow beneath floating book */}
        <div className="floating-book-ground-shadow" aria-hidden="true" />
      </div>

      {/* =========================================================================
          SPACIOUS TWO-PAGE LEDGER MODAL (Focus view, no layout shifts, click-outside to close)
         ========================================================================= */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade"
          onClick={() => toggleBook(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Daily Study Streak Ledger"
        >
          {/* Close button in top-right screen corner */}
          <button
            type="button"
            className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-stone-900/80 text-stone-300 hover:text-white hover:bg-stone-800 transition-colors border border-stone-700/60 shadow-xl"
            onClick={() => toggleBook(false)}
            title="Close Ledger (Esc)"
          >
            <X size={20} />
          </button>

          {/* Modal Container: prevents click from bubbling up to backdrop */}
          <div
            className="relative w-full max-w-[760px] h-[520px] max-h-[92vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Open Book Spread Chassis */}
            <div className="authentic-book-chassis state-open w-full h-full relative">
              {/* Desk Base Hardcover Underlay */}
              <div className="book-outer-hardcover">
                <div className="outer-cover-leather" />
                <div className="outer-cover-gold-trim" />
              </div>

              {/* Two-Page Spread Container */}
              <div className="book-spread-container w-full h-full">
                {/* -------------------------------------------------------------
                    PAGE 1 (Verso / Left - Habit & Rank Progression)
                   ------------------------------------------------------------- */}
                <div className="authentic-page-sheet page-left flex-1 p-5 sm:p-6 flex flex-col justify-between">
                  <div className="page-gutter-shadow right-side" />
                  <div className="page-paper-texture-grain" />

                  <div className="page-inner-ornament-frame p-4 sm:p-5 flex flex-col justify-between h-full">
                    <span className="corner-fleuron fleuron-tl">❧</span>
                    <span className="corner-fleuron fleuron-tr">✦</span>

                    {/* Header */}
                    <div className="page-header-block mb-3 text-center">
                      <span className="page-sub-tag text-xs font-serif tracking-widest text-amber-900/80 block uppercase">
                        ✦ PAGE 1 · SCHOLARLY HABIT ✦
                      </span>
                      <h4 className="page-title-heading text-lg sm:text-xl font-serif font-bold text-stone-900 mt-1">
                        Rank & Consistency
                      </h4>
                    </div>

                    {/* Streak card */}
                    <div className="page-crest-card flex items-center gap-3.5 bg-amber-50/70 border border-amber-900/15 rounded-lg p-3 my-2 shadow-xs">
                      <div className="relative shrink-0">
                        <div className="crest-halo" />
                        <ScholarlyHeraldicCrest tierIndex={tierIndex} size={62} />
                      </div>
                      <div className="crest-meta-col flex flex-col">
                        <span className="text-xs uppercase tracking-wider text-stone-600 font-semibold font-mono">
                          Current Standing
                        </span>
                        <span className="text-base sm:text-lg font-serif font-bold text-stone-950">
                          {tier.title}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-amber-700 flex items-center gap-1 mt-0.5">
                          🔥 {streakDays} Consecutive Days
                        </span>
                      </div>
                    </div>

                    {/* Lore Quote */}
                    <p className="page-lore-quote text-xs sm:text-[13px] italic text-stone-700 text-center my-2.5 px-2 leading-relaxed">
                      "{tier.lore}"
                    </p>

                    {/* Rank Milestone Progress */}
                    <div className="page-rank-progress-box bg-white/80 border border-amber-800/20 rounded-lg p-3 mt-auto shadow-xs">
                      <div className="rank-progress-header flex justify-between items-center text-xs font-semibold mb-1.5 text-stone-900">
                        <span>Milestone Progress</span>
                        {nextTier && (
                          <span className="text-amber-700 font-mono text-[11px]">
                            Next: {nextTier.title} ({nextTier.minDays}d)
                          </span>
                        )}
                      </div>
                      <div className="rank-track-bar h-2 bg-stone-200 rounded-full overflow-hidden">
                        <div
                          className="rank-fill-bar h-full bg-gradient-to-r from-amber-600 to-amber-500 rounded-full transition-all duration-300"
                          style={{
                            width: nextTier
                              ? `${Math.min(100, Math.max(12, (streakDays / nextTier.minDays) * 100))}%`
                              : "100%",
                          }}
                        />
                      </div>
                      {nextTier ? (
                        <span className="text-[11px] text-stone-600 block mt-1.5 text-center">
                          Study <strong>{nextTier.minDays - streakDays} more day{nextTier.minDays - streakDays > 1 ? "s" : ""}</strong> to unlock {nextTier.title}.
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-800 font-semibold block mt-1 text-center">
                          ✦ Supreme Scholar rank achieved! Keep your streak protected.
                        </span>
                      )}
                    </div>

                    <div className="page-folio-number text-center text-xs text-stone-500 font-serif italic mt-2">
                      — 1 —
                    </div>
                  </div>
                </div>

                {/* Natural Center Gutter Seam & Ribbon */}
                <div className="book-center-spine-gutter" aria-hidden="true">
                  <div className="spine-deep-crease-shadow" />
                  <div className="spine-gold-stitch-line" />
                  <div className="spine-satin-ribbon">
                    <div className="ribbon-hanging-tail" />
                  </div>
                </div>

                {/* -------------------------------------------------------------
                    PAGE 2 (Recto / Right - Daily Activity & Weekly Calendar)
                   ------------------------------------------------------------- */}
                <div className="authentic-page-sheet page-right flex-1 p-5 sm:p-6 flex flex-col justify-between">
                  <div className="page-gutter-shadow left-side" />
                  <div className="page-paper-texture-grain" />

                  <div className="page-inner-ornament-frame p-4 sm:p-5 flex flex-col justify-between h-full">
                    <span className="corner-fleuron fleuron-tl">✦</span>
                    <span className="corner-fleuron fleuron-tr">☙</span>

                    {/* Header */}
                    <div className="page-header-block mb-2 text-center">
                      <span className="page-sub-tag text-xs font-serif tracking-widest text-amber-900/80 block uppercase">
                        ✦ PAGE 2 · DAILY LOG ✦
                      </span>
                      <h4 className="page-title-heading text-lg sm:text-xl font-serif font-bold text-stone-900 mt-1">
                        Today's Study Activity
                      </h4>
                    </div>

                    {/* Status Card */}
                    <div
                      className={`activity-status-card p-3 rounded-lg border flex items-center gap-3 my-1.5 shadow-xs ${
                        studiedToday
                          ? "bg-emerald-50/90 border-emerald-600/30 text-emerald-950"
                          : "bg-amber-50/90 border-amber-600/30 text-amber-950"
                      }`}
                    >
                      <div className="status-indicator-icon shrink-0">
                        {studiedToday ? (
                          <CheckCircle size={22} className="text-emerald-700 stroke-[2.5]" />
                        ) : (
                          <Flame size={22} className="text-amber-600 stroke-[2.5]" />
                        )}
                      </div>
                      <div className="status-text-col flex flex-col">
                        <strong className="text-sm font-serif font-bold">
                          {studiedToday ? "Today's Study Recorded" : "Ready for Today's Study"}
                        </strong>
                        <span className="text-xs text-stone-700">
                          {studiedToday
                            ? "Your streak is protected for today. Great job!"
                            : "Complete any study activity below to advance your streak."}
                        </span>
                      </div>
                    </div>

                    {/* 7-Day Consistency Strip */}
                    <div className="weekly-calendar-card bg-stone-50/80 border border-stone-300/80 rounded-lg p-2.5 my-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-stone-800 mb-2">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-amber-700" />
                          <span>Last 7 Days Consistency</span>
                        </span>
                        <span className="text-[11px] text-stone-500 font-mono">Verified Days</span>
                      </div>
                      <div className="grid grid-cols-7 gap-1.5 text-center">
                        {weeklyDays.map((day, idx) => (
                          <div
                            key={idx}
                            className={`flex flex-col items-center justify-center p-1 rounded-md text-xs border transition-all ${
                              day.hasActivity
                                ? "bg-amber-100/90 border-amber-400 text-amber-950 font-bold"
                                : "bg-white/60 border-stone-200 text-stone-400"
                            } ${day.isToday ? "ring-2 ring-amber-500 ring-offset-1" : ""}`}
                          >
                            <span className="text-[10px] uppercase font-mono">{day.dayLabel}</span>
                            <span className="mt-0.5 text-xs">
                              {day.hasActivity ? "✓" : "·"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* How to earn activity credits */}
                    <div className="streak-rules-checklist bg-white/70 border border-stone-200/90 rounded-lg p-2.5 my-1 shadow-xs">
                      <span className="checklist-heading-text text-xs font-bold text-stone-800 block mb-1.5">
                        Verified Study Actions:
                      </span>
                      <ul className="checklist-items-list space-y-1 text-xs text-stone-700">
                        <li className="flex items-center gap-2">
                          <span className="check-bullet text-emerald-700 font-bold">✓</span>
                          <span>Take an interactive practice quiz trial</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="check-bullet text-emerald-700 font-bold">✓</span>
                          <span>Review flashcards in active recall mode</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="check-bullet text-emerald-700 font-bold">✓</span>
                          <span>Create a new study volume or consult your tutor</span>
                        </li>
                      </ul>
                    </div>

                    {/* Action buttons */}
                    <div className="page-action-buttons-row flex gap-2.5 mt-2 pt-1 border-t border-stone-200">
                      <button
                        type="button"
                        className="btn-shelf-action flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-stone-900 text-amber-100 hover:bg-stone-800 text-xs font-medium shadow-sm transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenShelfBook) onOpenShelfBook();
                          toggleBook(false);
                        }}
                      >
                        <BookOpen size={13} />
                        <span>Explore Shelf Books</span>
                      </button>

                      <button
                        type="button"
                        className="btn-close-action py-2 px-3.5 rounded-md bg-stone-200/80 hover:bg-stone-300 text-stone-800 text-xs font-medium transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBook(false);
                        }}
                      >
                        <span>Close</span>
                      </button>
                    </div>

                    <div className="page-folio-number text-center text-xs text-stone-500 font-serif italic mt-2">
                      — 2 —
                    </div>
                  </div>
                </div>
              </div>

              <div className="realistic-desk-shadow" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
