// Verified Daily Study Streak Manager
// Streaks can ONLY be earned through verified study activities:
// 1. Completing an MCQ quiz
// 2. Reviewing flashcards in a study book
// 3. Generating a new study book from notes/PDF/photo/YouTube
// 4. Actively asking questions in the grounded study chat

export interface StudyActivity {
  id: string;
  type: "quiz" | "flashcards" | "create_book" | "chat";
  label: string;
  title: string;
  timestamp: number;
  date: string; // YYYY-MM-DD
}

export interface StreakState {
  streakDays: number;
  lastActiveDate: string; // YYYY-MM-DD
  studiedToday: boolean;
  history: StudyActivity[];
}

const STORAGE_KEY = "study_buddy_streak_state";

// Local calendar date (YYYY-MM-DD). toISOString() would use UTC and roll the day at the wrong hour.
function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getTodayKey(): string {
  return dateKey(new Date());
}

function getYesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}

export function loadStreakState(): StreakState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const today = getTodayKey();
    const yesterday = getYesterdayKey();

    if (!raw) {
      // Nothing studied yet: a streak must be earned.
      return { streakDays: 0, lastActiveDate: "", studiedToday: false, history: [] };
    }

    const parsed: StreakState = JSON.parse(raw);
    const lastDate = parsed.lastActiveDate;

    // Check if studied today
    const studiedToday = lastDate === today;

    // Check if streak was broken (last active date was before yesterday)
    let streakDays = parsed.streakDays || 1;
    if (lastDate !== today && lastDate !== yesterday) {
      streakDays = 0; // Streak broken, resets until new activity today
    }

    return {
      streakDays,
      lastActiveDate: lastDate,
      studiedToday,
      history: parsed.history || [],
    };
  } catch {
    return { streakDays: 0, lastActiveDate: "", studiedToday: false, history: [] };
  }
}

export function recordVerifiedActivity(
  type: "quiz" | "flashcards" | "create_book" | "chat",
  label: string,
  bookTitle: string
): { updated: boolean; state: StreakState } {
  try {
    const current = loadStreakState();
    const today = getTodayKey();
    const yesterday = getYesterdayKey();

    const newActivity: StudyActivity = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      label,
      title: bookTitle || "Study Session",
      timestamp: Date.now(),
      date: today,
    };

    const newHistory = [newActivity, ...current.history].slice(0, 50);

    // If already studied today, do not increment streak again (prevent duplicates)
    if (current.studiedToday && current.lastActiveDate === today) {
      const state: StreakState = {
        ...current,
        history: newHistory,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return { updated: false, state };
    }

    // Otherwise calculate streak increment
    let newStreak = 1;
    if (current.lastActiveDate === yesterday) {
      newStreak = current.streakDays + 1;
    }

    const state: StreakState = {
      streakDays: newStreak,
      lastActiveDate: today,
      studiedToday: true,
      history: newHistory,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("study_streak_updated", { detail: state }));
    return { updated: true, state };
  } catch {
    return {
      updated: false,
      state: { streakDays: 0, lastActiveDate: "", studiedToday: false, history: [] },
    };
  }
}

