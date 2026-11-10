import React, { useMemo } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  color: string;
}

export default function MagicParticles() {
  const particles: Particle[] = useMemo(() => {
    const list: Particle[] = [];
    const colors = ["#f7e096", "#fbbf24", "#d97706", "#c59b27", "#fef3c7"];
    for (let i = 0; i < 36; i++) {
      list.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2.8 + 1.2,
        duration: Math.random() * 10 + 8,
        delay: Math.random() * 7,
        opacity: Math.random() * 0.45 + 0.15,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    return list;
  }, []);

  return (
    <div className="magic-particles-layer" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="magic-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
}
