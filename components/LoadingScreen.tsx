"use client";

import { useEffect, useState } from "react";

export default function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setProgress((value) => {
        const next = Math.min(value + 5, 100);
        if (next >= 100) {
          clearInterval(id);
          setTimeout(onComplete, 450);
        }
        return next;
      });
    }, 80);
    return () => clearInterval(id);
  }, [onComplete]);

  return (
    <div className="overlay-screen">
      <div className="loading-shell">
        <div className="robot-mark robot-mark-lg">
          <span className="ring ring-1" />
          <span className="ring ring-2" />
          <span className="robot-face">
            <span className="eye left" />
            <span className="eye right" />
            <span className="mouth" />
          </span>
        </div>
        <div className="loading-title">KOGRAPH.INT</div>
        <div className="loading-subtitle">Booting secure vault interface</div>
        <div className="progress-track">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
