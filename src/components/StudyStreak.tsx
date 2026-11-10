import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

export interface StreakTier {
  minDays: number;
  title: string;
  badge: string;
  crestName: string;
  lore: string;
  accent: string;
  borderAccent: string;
}

export const STREAK_TIERS: StreakTier[] = [
  {
    minDays: 1,
    title: "New Learner",
    badge: "🌱",
    crestName: "First Study Session",
    lore: "Your study journey begins. Practice a little every day to remember what you learn.",
    accent: "#d97706",
    borderAccent: "#fbbf24",
  },
  {
    minDays: 3,
    title: "Consistent Student",
    badge: "✨",
    crestName: "Daily Habit Forming",
    lore: "3 days in a row! You are building a strong, reliable daily study habit.",
    accent: "#2563eb",
    borderAccent: "#60a5fa",
  },
  {
    minDays: 5,
    title: "Focused Scholar",
    badge: "🦉",
    crestName: "Deep Focus",
    lore: "5 days strong! Your memory retention and quiz scores are climbing.",
    accent: "#059669",
    borderAccent: "#34d399",
  },
  {
    minDays: 7,
    title: "Dedicated Pro",
    badge: "🏆",
    crestName: "1 Full Week",
    lore: "One full week of daily learning! Dedication like this leads to top grades.",
    accent: "#b45309",
    borderAccent: "#f59e0b",
  },
  {
    minDays: 14,
    title: "Master Mind",
    badge: "👑",
    crestName: "Two Weeks Mastered",
    lore: "Two consecutive weeks of daily practice. Concepts are sticking for the long run.",
    accent: "#7c3aed",
    borderAccent: "#c084fc",
  },
  {
    minDays: 30,
    title: "Study Champion",
    badge: "🌟",
    crestName: "30-Day Master",
    lore: "A full month of daily learning! You have built an unstoppable study habit.",
    accent: "#e11d48",
    borderAccent: "#fb7185",
  },
];

export function getTierForDays(days: number): StreakTier {
  let matched = STREAK_TIERS[0];
  for (const t of STREAK_TIERS) {
    if (days >= t.minDays) {
      matched = t;
    }
  }
  return matched;
}

export function getNextTier(days: number): StreakTier | null {
  for (const t of STREAK_TIERS) {
    if (days < t.minDays) {
      return t;
    }
  }
  return null;
}

const WEEK_DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default function StudyStreak() {
  const [days, setDays] = useState<number>(3);
  const [studiedToday, setStudiedToday] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);

  // Initialize from localStorage or default to 3 days
  useEffect(() => {
    try {
      const saved = localStorage.getItem("study_streak_days");
      if (saved !== null) {
        setDays(Math.max(1, parseInt(saved, 10) || 1));
      } else {
        localStorage.setItem("study_streak_days", "3");
      }
      const todayKey = new Date().toISOString().slice(0, 10);
      const lastDate = localStorage.getItem("study_streak_last_date");
      setStudiedToday(lastDate === todayKey);
    } catch {
      // fallback
    }
  }, []);

  const currentTier = getTierForDays(days);
  const nextTier = getNextTier(days);

  function saveStreak(newDays: number, isTodayDone = true) {
    setDays(newDays);
    setStudiedToday(isTodayDone);
    try {
      localStorage.setItem("study_streak_days", String(newDays));
      if (isTodayDone) {
        localStorage.setItem("study_streak_last_date", new Date().toISOString().slice(0, 10));
      }
    } catch {}
  }

  function handleLogToday() {
    if (studiedToday) return;
    const newDays = days + 1;
    saveStreak(newDays, true);
    triggerCelebration();
  }

  function handleAddDemoDay() {
    const newDays = days + 1;
    saveStreak(newDays, true);
    triggerCelebration();
  }

  function handleReset() {
    saveStreak(1, false);
  }

  function triggerCelebration() {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"],
      });
    } catch {}
  }

  // Calculate day of week index (0=Monday ... 6=Sunday)
  const currentDayOfWeek = (new Date().getDay() + 6) % 7;

  return (
    <>
      <div
        className="study-streak-card"
        onClick={() => setShowModal(true)}
        role="button"
        tabIndex={0}
        aria-label={`Study streak: ${days} days, Rank: ${currentTier.title}. Click to view rank upgrades.`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setShowModal(true);
          }
        }}
      >
        <div className="streak-icon-wrap" style={{ borderColor: currentTier.borderAccent }}>
          <span className="streak-badge-emoji" aria-hidden="true">
            {currentTier.badge}
          </span>
          <span className="streak-flame" aria-hidden="true">🔥</span>
        </div>

        <div className="streak-info">
          <div className="streak-top-row">
            <span className="streak-days-count">{days} Day Streak</span>
            <span
              className="streak-rank-tag"
              style={{
                color: currentTier.accent,
                borderColor: currentTier.borderAccent,
              }}
            >
              {currentTier.title}
            </span>
          </div>

          <p className="streak-lore-sub">{currentTier.lore}</p>

          {/* 7-Day Gemstone Row */}
          <div className="streak-gems-row">
            {WEEK_DAYS.map((d, i) => {
              const isPastOrToday = i <= currentDayOfWeek;
              const isToday = i === currentDayOfWeek;
              const active = isPastOrToday && (i < currentDayOfWeek || studiedToday);

              return (
                <div
                  key={i}
                  className={`gem-box ${active ? "is-active" : ""} ${isToday ? "is-today" : ""}`}
                  title={`${d} - ${active ? "Studied" : "Pending"}`}
                >
                  <span className="gem-dot">{active ? "✦" : "·"}</span>
                  <span className="gem-day">{d}</span>
                </div>
              );
            })}
            <span className="streak-view-details">View ranks ➔</span>
          </div>
        </div>
      </div>

      {/* Detail & Upgrade Modal */}
      {showModal && (
        <div className="streak-modal-backdrop" onClick={() => setShowModal(false)}>
          <div
            className="streak-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="streak-modal-header">
              <div className="flex items-center gap-3">
                <span className="modal-crest-icon">{currentTier.badge}</span>
                <div>
                  <h3 className="modal-title">Daily Study Streak</h3>
                  <p className="modal-subtitle">Consistent daily learning upgrades your scholarly rank</p>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setShowModal(false)}
                aria-label="Close streak details"
              >
                ✕
              </button>
            </div>

            {/* Current Status Showcase */}
            <div className="current-status-banner" style={{ borderColor: currentTier.borderAccent }}>
              <div className="banner-left">
                <span className="banner-badge">{currentTier.badge}</span>
                <div>
                  <div className="banner-days">🔥 {days} Days Strong</div>
                  <div className="banner-rank" style={{ color: currentTier.accent }}>
                    {currentTier.title}
                  </div>
                  <div className="banner-lore">{currentTier.lore}</div>
                </div>
              </div>
              <div className="banner-right">
                {studiedToday ? (
                  <div className="studied-chip">
                    <span>✓ Studied Today</span>
                  </div>
                ) : (
                  <button className="log-today-btn" onClick={handleLogToday}>
                    Log Today's Study (+1)
                  </button>
                )}
              </div>
            </div>

            {/* Next Upgrade Progress */}
            {nextTier && (
              <div className="next-tier-box">
                <div className="next-tier-header">
                  <span>Next Rank: <strong>{nextTier.badge} {nextTier.title}</strong></span>
                  <span>{nextTier.minDays - days} days remaining</span>
                </div>
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${Math.min(100, (days / nextTier.minDays) * 100)}%`,
                      backgroundColor: nextTier.accent,
                    }}
                  />
                </div>
              </div>
            )}

            {/* All Tiers Roadmap */}
            <div className="tiers-list-section">
              <h4 className="tiers-list-heading">✦ RANK ROADMAP & UNLOCKS</h4>
              <div className="tiers-grid">
                {STREAK_TIERS.map((tier) => {
                  const unlocked = days >= tier.minDays;
                  const isCurrent = currentTier.minDays === tier.minDays;

                  return (
                    <div
                      key={tier.minDays}
                      className={`tier-card ${unlocked ? "is-unlocked" : "is-locked"} ${
                        isCurrent ? "is-current" : ""
                      }`}
                      style={{
                        borderColor: isCurrent ? tier.borderAccent : undefined,
                      }}
                    >
                      <span className="tier-badge-icon">{tier.badge}</span>
                      <div className="tier-details">
                        <div className="tier-name-row">
                          <span className="tier-title">{tier.title}</span>
                          <span className="tier-days-badge">{tier.minDays}+ Days</span>
                        </div>
                        <p className="tier-crest-sub">{tier.crestName}</p>
                        <p className="tier-lore-desc">{tier.lore}</p>
                      </div>
                      {unlocked && <span className="unlocked-seal" title="Unlocked">✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Demo Controls */}
            <div className="streak-modal-footer">
              <div className="demo-controls-hint">
                <span>💡 Demo & test rank upgrades:</span>
                <button
                  type="button"
                  className="demo-btn-increment"
                  onClick={handleAddDemoDay}
                  title="Increment streak by 1 day to test next badge"
                >
                  +1 Day (Upgrade Rank)
                </button>
                <button
                  type="button"
                  className="demo-btn-reset"
                  onClick={handleReset}
                  title="Reset to Day 1"
                >
                  Reset
                </button>
              </div>
              <button
                type="button"
                className="modal-done-btn"
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
