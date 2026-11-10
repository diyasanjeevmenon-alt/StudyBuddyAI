import { useEffect, useRef, useState } from "react";
import { chat } from "../api";
import { TutorRole } from "../types";
import { recordVerifiedActivity } from "../streakManager";

const SUGGESTIONS = [
  "Explain the main idea in simple words.",
  "Which topics are most important for the exam?",
  "Give me an example of the key concept.",
  "Can you quiz me on this material?",
];

interface TutorOption {
  id: TutorRole;
  name: string;
  icon: string;
  desc: string;
}

const ROLES: TutorOption[] = [
  {
    id: "tutor",
    name: "Study Tutor",
    icon: "🦉",
    desc: "Clear explanations & real-world examples",
  },
  {
    id: "deep_solver",
    name: "Problem Solver",
    icon: "🧠",
    desc: "Step-by-step math, science & tricky questions",
  },
  {
    id: "fast_review",
    name: "Quick Review",
    icon: "⚡",
    desc: "Fast bullet points & short definitions",
  },
  {
    id: "socratic",
    name: "Practice Quizzer",
    icon: "🎯",
    desc: "Asks you questions to test what you learned",
  },
];

function inline(s: string) {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.length > 4 && part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      part
    )
  );
}

function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-*•]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {inline(l)}
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}

interface ChatProps {
  setId: string | null;
  bookTitle?: string;
}

export default function Chat({ setId, bookTitle }: ChatProps) {
  const [msgs, setMsgs] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [input, setInput] = useState("");
  const [role, setRole] = useState<TutorRole>("tutor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const activeRole = ROLES.find((r) => r.id === role)!;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    const history = msgs.map((m) => ({ role: m.role, text: m.text }));
    setMsgs((m) => [...m, { role: "user", text: message }]);
    setInput("");
    setBusy(true);
    setError("");
    try {
      const { reply } = await chat(setId, message, history, role);
      setMsgs((m) => [...m, { role: "assistant", text: reply }]);
      recordVerifiedActivity("chat", `Consulted ${activeRole.name}`, bookTitle || "Study Book");
    } catch (e: any) {
      setError(e.message || "Could not get an answer right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chat">
      {/* Role Picker */}
      <div className="scholarly-counsel-box">
        <div className="counsel-header">
          <span className="counsel-kicker">✦ TUTOR MODE</span>
          <span className="counsel-desc">{activeRole.desc}</span>
        </div>
        <div className="counsel-roles-row">
          {ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRole(r.id)}
              className={`counsel-role-btn ${role === r.id ? "is-active" : ""}`}
            >
              <span className="role-icon" aria-hidden="true">{r.icon}</span>
              <span className="role-name">{r.name}</span>
            </button>
          ))}
        </div>
      </div>

      {msgs.length === 0 && (
        <div className="suggest">
          <p className="suggest-intro">
            Ask anything about this study set. Answers come only from your uploaded material; if it isn't there, the tutor will say so.
          </p>
          <div className="suggest-grid">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="chip" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="msgs" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={"msg " + m.role}>
            {m.role === "assistant" && (
              <div className="msg-crest-badge" aria-hidden="true">✦</div>
            )}
            <div className="msg-content">
              {m.role === "user" ? <p>{m.text}</p> : <Rich text={m.text} />}
            </div>
          </div>
        ))}
        {busy && (
          <div className="msg assistant typing" aria-label="Thinking">
            <span className="typing-label">Thinking</span>
            <i />
            <i />
            <i />
          </div>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={2000}
          placeholder={`Ask ${activeRole.name} about your notes...`}
          aria-label="Your question"
        />
        <button className="btn-primary" disabled={busy || !input.trim()}>
          Ask
        </button>
      </form>
    </div>
  );
}
