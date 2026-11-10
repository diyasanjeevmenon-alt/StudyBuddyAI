import React, { useEffect } from "react";
import { X, BookOpen, Sparkles, Brain, CheckCircle2, ShieldCheck, Clock, Download } from "lucide-react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="About Study Buddy AI"
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-amber-500/30 bg-[#161311] text-[#f5eee1] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-800 bg-[#1b1714]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-serif text-amber-100 tracking-tight m-0">
                  About Study Room
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 font-sans font-medium">
                  Smart Study Companion
                </span>
              </div>
              <p className="text-xs text-stone-300 m-0 mt-0.5">
                Your personal workspace for effective, distraction-free studying.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Mission intro */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-stone-900 to-[#221c17] border border-amber-500/20">
            <p className="text-sm text-stone-200 leading-relaxed font-serif m-0">
              “Study Room turns your lecture notes, PDFs, textbook photos, and YouTube videos into clean, interactive study books equipped with flashcards, practice quizzes, and a daily study streak to keep you on track.”
            </p>
          </div>

          {/* 4 Core Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800 hover:border-amber-500/30 transition-all">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold font-mono">
                  01
                </div>
                <h3 className="text-base font-semibold text-white m-0 flex items-center gap-1.5">
                  <BookOpen size={16} className="text-amber-400" />
                  Add Your Material
                </h3>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed m-0">
                Upload PDFs, paste lecture notes, take a photo of a whiteboard, or add a YouTube link. Important definitions and key ideas are extracted automatically.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800 hover:border-amber-500/30 transition-all">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold font-mono">
                  02
                </div>
                <h3 className="text-base font-semibold text-white m-0 flex items-center gap-1.5">
                  <Brain size={16} className="text-amber-400" />
                  Practice & Remember
                </h3>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed m-0">
                Flip 3D memory cards, test yourself with 4-choice practice quizzes with explanations, and follow a 7-day revision plan.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800 hover:border-amber-500/30 transition-all">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold font-mono">
                  03
                </div>
                <h3 className="text-base font-semibold text-white m-0 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-amber-400" />
                  Daily Study Streaks
                </h3>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed m-0">
                Streaks are earned by actual studying. Your streak grows automatically when you complete quizzes, practice flashcards, or create a study set.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800 hover:border-amber-500/30 transition-all">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold font-mono">
                  04
                </div>
                <h3 className="text-base font-semibold text-white m-0 flex items-center gap-1.5">
                  <Download size={16} className="text-amber-400" />
                  Download Printable PDFs
                </h3>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed m-0">
                Export any study book to a clean, printable PDF for offline studying, binders, or exam prep.
              </p>
            </div>
          </div>

          {/* Tips for study */}
          <div className="p-4 rounded-xl bg-stone-950 border border-stone-800/80">
            <h4 className="text-xs uppercase tracking-wider text-amber-400 font-semibold mb-2.5 flex items-center gap-1.5">
              <Clock size={14} />
              Quick Study Shortcuts
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-300">
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-200 font-mono text-[11px]">Esc</kbd>
                <span>Return open volume to shelf</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-200 font-mono text-[11px]">Space / Click</kbd>
                <span>Flip flashcard front and back</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-200 font-mono text-[11px]">← / →</kbd>
                <span>Navigate through flashcards</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-200 font-mono text-[11px]">Audio</kbd>
                <span>Listen to summaries hands-free</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-stone-800 bg-[#1b1714] flex items-center justify-between">
          <span className="text-xs text-stone-400 font-mono">
            Study Buddy AI
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold text-xs transition-colors"
          >
            Got it, Back to Library
          </button>
        </div>
      </div>
    </div>
  );
}
