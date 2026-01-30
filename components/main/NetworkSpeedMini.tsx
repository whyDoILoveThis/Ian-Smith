"use client";

import { useEffect, useRef, useState } from "react";
import ItsDropdown from "@/components/ui/its-dropdown";
import { Settings } from "lucide-react";
import ItsNumInput from "../sub/ItsNumInput";

/**
 * NetworkSpeedMini — improved:
 * - correct measured speeds (use measured durations + arrayBuffer)
 * - smoothing (EWMA)
 * - separate intervals for ping (fast) and speed (slow)
 * - proper stacking/isolation + pseudo-element blur for glassy look
 * - dropdown uses class "its-dropdown-glass" (pass via ItsDropdown.className)
 */

type SpeedStats = {
  ping: number;
  down: number; // in kbps
  up: number; // in kbps
};

const LS_KEY = "network-speed-settings-v2";

export default function NetworkSpeedMini() {
  const [stats, setStats] = useState<SpeedStats>({ ping: 0, down: 0, up: 0 });
  const [paused, setPaused] = useState(false);

  // intervals (ms)
  const [pingIntervalMs, setPingIntervalMs] = useState<number>(1000);
  const [speedIntervalMs, setSpeedIntervalMs] = useState<number>(5000);

  const [speedTimer, setSpeedTimer] = useState<number>(
    Math.round(speedIntervalMs / 1000),
  );

  const [bytesUsed, setBytesUsed] = useState<number>(0);

  // smoothing (EWMA) alpha: newVal = alpha * sample + (1-alpha) * prev
  const SMOOTH_ALPHA = 0.35;

  // refs for intervals so we can clear/restart cleanly
  const pingIntervalRef = useRef<number | null>(null);
  const speedIntervalRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const mounted = useRef(true);

  // load settings
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.pingIntervalMs) setPingIntervalMs(parsed.pingIntervalMs);
        if (parsed.speedIntervalMs) setSpeedIntervalMs(parsed.speedIntervalMs);
        if (parsed.bytesUsed) setBytesUsed(parsed.bytesUsed);
      } catch {}
    }
  }, []);

  // persist settings / usage
  useEffect(() => {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({ pingIntervalMs, speedIntervalMs, bytesUsed }),
    );
  }, [pingIntervalMs, speedIntervalMs, bytesUsed]);

  // helper: format kb -> show MB after 1000 kb
  const formatSpeed = (kb: number) =>
    kb >= 1000 ? `${(kb / 1000).toFixed(1)}MB` : `${Math.round(kb)}k`;

  const formatBytes = (b: number) =>
    b >= 1024 * 1024
      ? `${(b / 1024 / 1024).toFixed(2)} MB`
      : `${Math.round(b / 1024)} KB`;

  // ---------- PING LOOP (lightweight) ----------
  useEffect(() => {
    mounted.current = true;
    // clear any prior
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

    if (!paused) {
      const runPing = async () => {
        try {
          const start = performance.now();
          // server /api/ping should return very small body
          await fetch("/api/ping", { cache: "no-store" });
          const duration = performance.now() - start;
          // smooth the ping to reduce jitter visually
          setStats((prev) => ({
            ...prev,
            ping: Math.round(
              prev.ping === 0
                ? duration
                : SMOOTH_ALPHA * duration + (1 - SMOOTH_ALPHA) * prev.ping,
            ),
          }));
          // count the 23 bytes as before
          setBytesUsed((b) => b + 23);
        } catch {
          // ignore
        }
      };

      // run immediately, then interval
      runPing();
      pingIntervalRef.current = window.setInterval(runPing, pingIntervalMs);
    }

    return () => {
      mounted.current = false;
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [pingIntervalMs, paused]);

  // ---------- SPEED LOOP (download + upload) ----------
  useEffect(() => {
    // cleanup old timers
    if (speedIntervalRef.current) clearInterval(speedIntervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    mounted.current = true;
    setSpeedTimer(Math.max(1, Math.round(speedIntervalMs / 1000)));

    if (!paused) {
      const runSpeedTest = async () => {
        try {
          // --- DOWNLOAD: measure actual transfer time & bytes ---
          const downStart = performance.now();
          const downRes = await fetch("/api/speed-test", { cache: "no-store" });
          // use arrayBuffer to get true byte length
          const downBuf = await downRes.arrayBuffer();
          const downTime = performance.now() - downStart; // ms
          const downBytes = downBuf.byteLength;

          // --- UPLOAD: measure time to POST payload and receive server ack ---
          const payload = new Uint8Array(24 * 1024); // 24KB
          const upStart = performance.now();
          await fetch("/api/upload-test", { method: "POST", body: payload });
          const upTime = performance.now() - upStart; // ms
          const upBytes = payload.byteLength;

          // guard
          const safeDownTime = Math.max(1, downTime);
          const safeUpTime = Math.max(1, upTime);

          // kbps calculation (bits / ms => kilobits/sec)
          // formula: kbps = (bytes * 8) / time_ms
          const sampleDownK = (downBytes * 8) / safeDownTime;
          const sampleUpK = (upBytes * 8) / safeUpTime;

          // smooth with EWMA
          setStats((prev) => ({
            ping: prev.ping,
            down:
              prev.down === 0
                ? Math.round(sampleDownK)
                : Math.round(
                    SMOOTH_ALPHA * sampleDownK + (1 - SMOOTH_ALPHA) * prev.down,
                  ),
            up:
              prev.up === 0
                ? Math.round(sampleUpK)
                : Math.round(
                    SMOOTH_ALPHA * sampleUpK + (1 - SMOOTH_ALPHA) * prev.up,
                  ),
          }));

          // real bytes added to usage
          setBytesUsed((b) => b + downBytes + upBytes);

          // reset timer display
          setSpeedTimer(Math.max(1, Math.round(speedIntervalMs / 1000)));
        } catch {
          // ignore network errors silently
        }
      };

      // run immediately
      runSpeedTest();
      speedIntervalRef.current = window.setInterval(
        runSpeedTest,
        speedIntervalMs,
      );

      // countdown UI
      countdownRef.current = window.setInterval(
        () => setSpeedTimer((t) => (t > 0 ? t - 1 : t)),
        1000,
      );
    }

    return () => {
      if (speedIntervalRef.current) clearInterval(speedIntervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [speedIntervalMs, paused]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (speedIntervalRef.current) clearInterval(speedIntervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  return (
    <>
      {/* ----- style block: drop into global css if you prefer instead ----- */}
      <style jsx>{`
        /* container stacking + pseudo blur (behind the content) */
        .network-mini {
          position: fixed;
          bottom: 0.75rem;
          left: 0.75rem;
          z-index: 1000;
          width: 76px;
          height: 50px;
          padding: 0.25rem;
          border-radius: 12px;
          color: white;
          /* create stacking context for children so dropdown (top layer) can escape */
          isolation: isolate;
        }
        .network-mini .glass-bg::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          /* put actual backdrop blur on pseudo so dropdown can have separate blur */
          backdrop-filter: blur(8px) saturate(120%);
          -webkit-backdrop-filter: blur(8px) saturate(120%);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          pointer-events: none;
          z-index: 0;
        }
        .network-mini .content {
          position: relative;
          z-index: 2; /* above the pseudo bg */
        }

        /* dropdown glass pseudo element — uses a very high z so it's visually above container
           We expect ItsDropdown to give the dropdown root the class "its-dropdown-glass" */
        .its-dropdown-glass {
          position: relative; /* ensure pseudo positions correctly */
          isolation: isolate; /* new stacking context so ::before isn't trapped */
          z-index: 1100; /* sits above network-mini */
        }
        .its-dropdown-glass::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 12px;
          pointer-events: none;
          backdrop-filter: blur(10px) saturate(120%);
          -webkit-backdrop-filter: blur(10px) saturate(120%);
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          z-index: 0;
        }

        /* inside dropdown: glassy item styles */
        .its-dropdown-glass .glass-item {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: none; /* keep item backgrounds clear so text is crisp */
          padding: 6px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .its-dropdown-glass input[type="number"] {
          background: rgba(255, 255, 255, 0.85);
          color: #000;
          border-radius: 6px;
          padding: 4px;
          font-size: 12px;
        }
      `}</style>

      {/* main widget */}
      <article className="network-mini rounded-xl text-[10px] text-white shadow-lg">
        {/* background pseudo sits behind content via .glass-bg::before */}
        <div className="glass-bg absolute inset-0 rounded-xl" />
        {/* settings (top-right), note we put the dropdown trigger inside so dropdown is sibling in DOM and can overlay */}
        <div style={{ position: "absolute", top: 4, right: 6, zIndex: 1200 }}>
          <ItsDropdown
            position="up-right"
            closeWhenItemClick={false}
            // add our class so the dropdown content gets the pseudo blur + glass item styles
            className="its-dropdown-glass !bg-white/10 backdrop-blur-md !border-white/20 translate-x-32  w-[100px]"
            trigger={
              <Settings
                size={12}
                className="text-white/60 hover:text-white cursor-pointer"
              />
            }
          >
            <div className="text-xs space-y-2">
              <button
                onClick={() => setPaused((p) => !p)}
                className="glass-item w-full text-left"
              >
                {paused ? "▶ Resume" : "⏸ Pause"}
              </button>

              <div className="glass-item">
                <label className="text-[10px] block">Ping interval (ms)</label>
                <ItsNumInput
                  step={500}
                  value={pingIntervalMs}
                  onChange={(val) =>
                    setPingIntervalMs(Math.max(100, val || 1000))
                  }
                />
              </div>

              <div className="glass-item">
                <label className="text-[10px] block">Speed interval (ms)</label>
                <ItsNumInput
                  step={500}
                  onChange={(val) =>
                    setSpeedIntervalMs(Math.max(1000, val || 5000))
                  }
                  value={speedIntervalMs}
                />
                <div className="text-[10px] text-white/60 mt-1">
                  shared upload+download
                </div>
              </div>

              <div className="pt-1 border-t border-white/20 text-[10px] text-gray-300">
                Data used: {formatBytes(bytesUsed)}
              </div>
            </div>
          </ItsDropdown>
        </div>

        {/* visible content */}
        <div className="content flex flex-col justify-center h-full relative z-10">
          <span>📡 {Math.round(stats.ping)}ms</span>
          <span>⬇ {formatSpeed(stats.down)}</span>
          <span>⬆ {formatSpeed(stats.up)}</span>
          <span
            style={{
              position: "absolute",
              bottom: 0,
              right: 3,
              fontSize: 8,
              color: "rgba(255,255,255,0.45)",
            }}
          >
            {speedTimer}s
          </span>
        </div>
      </article>
    </>
  );
}
