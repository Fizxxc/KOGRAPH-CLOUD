"use client";

import { useEffect, useRef, useState } from "react";

type HumanCheckProps = {
  onVerified: () => void;
};

export default function HumanCheck({ onVerified }: HumanCheckProps) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [verified, setVerified] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!holding || verified) return;

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 4;

        if (next >= 100) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setVerified(true);
          return 100;
        }

        return next;
      });
    }, 40);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [holding, verified]);

  useEffect(() => {
    if (!verified) return;
    onVerified();
  }, [verified, onVerified]);

  function stopHold() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!verified) {
      setHolding(false);
      setProgress(0);
    }
  }

  return (
    <main className="verify-shell">
      <div className="verify-bg verify-bg-a" />
      <div className="verify-bg verify-bg-b" />

      <section className="verify-card">
        <div className="verify-badge">HUMAN CHECK</div>

        <div className="verify-robot">
          <div className="verify-robot-ring verify-robot-ring-1" />
          <div className="verify-robot-ring verify-robot-ring-2" />
          <div className="verify-robot-core">
            <span className="verify-eye left" />
            <span className="verify-eye right" />
            <span className="verify-mouth" />
          </div>
        </div>

        <h1>Human Verification</h1>
        <p>
          Tahan tombol untuk verifikasi akses sebelum masuk ke vault.
        </p>

        <div className="verify-progress">
          <div
            className="verify-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>

        <button
          type="button"
          className={`verify-button ${holding ? "is-holding" : ""} ${verified ? "is-verified" : ""}`}
          onMouseDown={() => setHolding(true)}
          onMouseUp={stopHold}
          onMouseLeave={stopHold}
          onTouchStart={() => setHolding(true)}
          onTouchEnd={stopHold}
          disabled={verified}
        >
          {verified ? "Verified" : "Hold to verify"}
        </button>

        <div className="verify-note">
          Aktivitas verifikasi akan dicatat ke log sistem.
        </div>
      </section>
    </main>
  );
}