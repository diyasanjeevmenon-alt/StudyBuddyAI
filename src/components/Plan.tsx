import { useEffect, useState } from "react";
import { PlanDay } from "../types";

interface PlanProps {
  setId: string;
  plan: PlanDay[];
}

export default function Plan({ setId, plan }: PlanProps) {
  const key = `sb_plan_${setId}`;
  const [done, setDone] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(done));
    } catch {
      /* storage unavailable */
    }
  }, [key, done]);

  if (!plan || !plan.length) {
    return (
      <p className="empty">
        This notebook has no revision plan because no exam date was given. Make a new notebook with an exam date to get one.
      </p>
    );
  }

  const total = plan.reduce((n, d) => n + d.tasks.length, 0);
  const toggle = (id: string) =>
    setDone((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));

  return (
    <div className="plan">
      <p className="progress">{done.length} of {total} tasks done</p>
      {plan.map((d) => (
        <section key={d.day} className="day">
          <h2>Day {d.day}</h2>
          <p className="focus">{d.focus}</p>
          <ul>
            {d.tasks.map((t, k) => {
              const id = `${d.day}-${k}`;
              return (
                <li key={id}>
                  <label className={done.includes(id) ? "is-done" : ""}>
                    <input
                      type="checkbox"
                      checked={done.includes(id)}
                      onChange={() => toggle(id)}
                    />
                    <span>{t}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
