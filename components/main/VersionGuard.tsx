"use client";

import { useEffect, useRef, useState } from "react";
import { rtdb } from "@/lib/firebaseConfig";
import { ref, onValue, set } from "firebase/database";

function getClientId(): string {
  const key = "vg_client_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function VersionGuard() {
  const [clientId] = useState(() =>
    typeof window !== "undefined" ? getClientId() : null,
  );
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const stampedRef = useRef(false);

  // On first load, stamp this client's prevVersion to the current version
  useEffect(() => {
    if (!clientId) return;
    const versionRef = ref(rtdb, "version");
    const unsub = onValue(
      versionRef,
      (snap) => {
        const currentVersion = snap.val() as number | null;
        if (currentVersion == null) return;
        if (!stampedRef.current) {
          stampedRef.current = true;
          set(ref(rtdb, `prevVersion/${clientId}`), currentVersion);
        }
      },
      { onlyOnce: true },
    );
    return () => unsub();
  }, [clientId]);

  // Subscribe to version + this client's prevVersion in real-time
  useEffect(() => {
    if (!clientId) return;
    let remoteVersion: number | null = null;
    let myPrevVersion: number | null = null;

    const check = () => {
      if (remoteVersion != null && myPrevVersion != null) {
        if (remoteVersion !== myPrevVersion) {
          setUpdateAvailable(true);
          setDismissed(false);
        } else {
          setUpdateAvailable(false);
        }
      }
    };

    const unsubVersion = onValue(ref(rtdb, "version"), (snap) => {
      remoteVersion = snap.val() as number | null;
      check();
    });

    const unsubPrev = onValue(ref(rtdb, `prevVersion/${clientId}`), (snap) => {
      myPrevVersion = snap.val() as number | null;
      check();
    });

    return () => {
      unsubVersion();
      unsubPrev();
    };
  }, [clientId]);

  if (!updateAvailable) return null;

  return (
    <div
      className={`fixed bottom-6 right-0 z-[9999] transition-transform duration-500 ease-in-out ${
        dismissed ? "translate-x-[calc(100%-28px)]" : "translate-x-0"
      }`}
    >
      {dismissed ? (
        // Peeking tab
        <button
          type="button"
          onClick={() => setDismissed(false)}
          className="w-7 h-14 rounded-l-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-black/30 transition-colors"
          title="New version available"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      ) : (
        // Full toast
        <div className="mr-4 flex items-center gap-3 rounded-xl bg-neutral-900/95 backdrop-blur-md border border-white/10 px-4 py-3 shadow-xl shadow-black/40">
          <div className="flex items-center gap-2 text-sm text-white">
            <span className="text-emerald-400 text-lg">✦</span>
            <span>New version available</span>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-neutral-500 hover:text-white transition-colors ml-1"
            title="Dismiss"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
