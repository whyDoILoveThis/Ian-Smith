"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import type { AIMessage } from "../types";
import { SECRET_PHRASE } from "../constants";

type AIChatDisguiseProps = {
  aiMessages: AIMessage[];
  aiInput: string;
  setAiInput: (input: string) => void;
  isAiLoading: boolean;
  aiBottomRef: React.RefObject<HTMLDivElement>;
  handleAiSend: () => void;
  onOpenLockBox: () => void;
  onStealthSend?: (text: string) => Promise<boolean>;
  onStealthPeek?: () => Promise<{ sender: string; text: string }[]>;
  /** The passphrase saved in the parent (from a previous unlock or room entry) */
  savedPassphrase?: string | null;
  /** Called when the user enters a passphrase through the "Ask" gate */
  onPassphraseUnlock?: (passphrase: string) => void;
  /** Called when the user successfully enters the room (combo + passphrase) */
  onEnterRoom?: () => void;
  /** The current combo (used to validate room-entry keys locally) */
  combo?: [number, number, number, number] | null;
  /** Whether a combo has been set via the lockbox */
  hasCombo?: boolean;
};

const PASSPHRASE_RE = /^(\d{1,4}-\d{1,4}-\d{1,4}-\d{1,4})([a-z]+)$/i;

// NOTE: Component name is kept as AIChatDisguise to avoid touching the
// parent wiring, but visually this is now an explicit "JessieChat" hub —
// no disguise.
export function AIChatDisguise({
  aiMessages,
  aiInput,
  setAiInput,
  isAiLoading,
  aiBottomRef,
  handleAiSend,
  onOpenLockBox,
  onStealthSend,
  onStealthPeek,
  savedPassphrase,
  onPassphraseUnlock,
  onEnterRoom,
  combo = null,
  hasCombo = false,
}: AIChatDisguiseProps) {
  // ── Room entry (combo-passphrase string) ───────────────────────────
  const [roomKey, setRoomKey] = useState("");
  const [roomError, setRoomError] = useState<string | null>(null);

  const handleEnterRoom = useCallback(() => {
    const raw = roomKey.trim();
    if (!raw) return;
    if (!combo) {
      setRoomError("Set a combo first.");
      return;
    }
    const comboStr = combo.join("-");
    const key = raw.toLowerCase();

    // Legacy: combo + SECRET_PHRASE (exact)
    if (key === comboStr + SECRET_PHRASE) {
      onPassphraseUnlock?.(SECRET_PHRASE);
      onEnterRoom?.();
      setRoomKey("");
      setRoomError(null);
      return;
    }

    // Custom passphrase: combo + lowercase word
    const m = key.match(PASSPHRASE_RE);
    if (m && m[1] === comboStr) {
      onPassphraseUnlock?.(m[2]);
      onEnterRoom?.();
      setRoomKey("");
      setRoomError(null);
      return;
    }

    setRoomError(
      `That key didn't match. Format: ${comboStr}word (letters only).`,
    );
  }, [roomKey, combo, onPassphraseUnlock, onEnterRoom]);

  // ── Passphrase save (for whisper / peek) ───────────────────────────
  const [showPassphraseInput, setShowPassphraseInput] = useState(false);
  const [passphraseValue, setPassphraseValue] = useState("");
  const stealthUnlocked = !!(savedPassphrase && hasCombo);

  const handlePassphraseSubmit = useCallback(() => {
    const phrase = passphraseValue.trim();
    if (!phrase || !hasCombo) return;
    onPassphraseUnlock?.(phrase);
    setShowPassphraseInput(false);
    setPassphraseValue("");
  }, [passphraseValue, hasCombo, onPassphraseUnlock]);

  // ── Stealth send (gated) ───────────────────────────────────────────
  const [whisperText, setWhisperText] = useState("");
  const [whisperFlash, setWhisperFlash] = useState(false);
  const handleWhisperSend = useCallback(async () => {
    if (!stealthUnlocked || !onStealthSend) return;
    const text = whisperText.trim();
    if (!text) return;
    try {
      const sent = await onStealthSend(text);
      if (sent) {
        setWhisperText("");
        setWhisperFlash(true);
        setTimeout(() => setWhisperFlash(false), 900);
      }
    } catch {
      /* silent */
    }
  }, [stealthUnlocked, onStealthSend, whisperText]);

  // ── Stealth peek (gated) ───────────────────────────────────────────
  const [peekMessages, setPeekMessages] = useState<
    { sender: string; text: string }[] | null
  >(null);
  const [isPeeking, setIsPeeking] = useState(false);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePeek = useCallback(async () => {
    if (!stealthUnlocked || !onStealthPeek) return;
    setIsPeeking(true);
    try {
      const msgs = await onStealthPeek();
      setPeekMessages(msgs);
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
      peekTimerRef.current = setTimeout(() => {
        setPeekMessages(null);
        peekTimerRef.current = null;
      }, 8000);
    } catch {
      /* silent */
    } finally {
      setIsPeeking(false);
    }
  }, [stealthUnlocked, onStealthPeek]);

  useEffect(() => {
    return () => {
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    };
  }, []);

  // ── AI assistant card (collapsible) ────────────────────────────────
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#0a0a0f] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-rose-500/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 h-[26rem] w-[26rem] rounded-full bg-fuchsia-500/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[22rem] w-[22rem] rounded-full bg-indigo-500/15 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        {/* Header */}
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-rose-200/80 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 shadow-[0_0_8px_2px_rgba(244,63,94,0.6)]" />
            For Jessie
          </div>
          <h1 className="mt-5 bg-gradient-to-br from-white via-rose-100 to-rose-300 bg-clip-text text-5xl font-semibold tracking-tight text-transparent sm:text-6xl">
            JessieChat
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-neutral-300/90 sm:text-lg">
            A quiet little room — built for her, named after her, kept just for
            the two of us.
          </p>
        </header>

        {/* Instructions strip */}
        <section className="mb-10">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-6">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              How to get in
            </h2>
            <ol className="mt-4 grid gap-4 sm:grid-cols-3">
              <Step
                n={1}
                title="Set the combo"
                body="Pick four numbers Jessie would know."
                done={hasCombo}
              />
              <Step
                n={2}
                title="Add your passphrase"
                body="A short word only she would guess."
                done={!!savedPassphrase}
              />
              <Step
                n={3}
                title="Open the room"
                body="Enter combo + passphrase to walk in."
                done={false}
              />
            </ol>
          </div>
        </section>

        {/* Action cards */}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Combo card */}
          <Card
            accent="from-rose-500/30 to-rose-500/0"
            onClick={onOpenLockBox}
            interactive
          >
            <CardIcon>
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                <path
                  d="M6 10V8a6 6 0 1112 0v2m-9 0h6m-9 0a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2v-6a2 2 0 00-2-2H6z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </CardIcon>
            <CardTitle>Combo</CardTitle>
            <CardBody>
              {hasCombo
                ? "Combo is set. Tap to change it."
                : "Lock the room with four numbers."}
            </CardBody>
            <CardStatus on={hasCombo} onLabel="Set" offLabel="Not set" />
          </Card>

          {/* Enter room card */}
          <Card accent="from-fuchsia-500/30 to-fuchsia-500/0">
            <CardIcon>
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                <path
                  d="M10 17l5-5-5-5M4 12h11M21 19V5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </CardIcon>
            <CardTitle>Enter the room</CardTitle>
            <CardBody>
              Type the combo, dashes, then the passphrase.
              <span className="mt-1 block font-mono text-[11px] text-neutral-500">
                {hasCombo && combo
                  ? `e.g. ${combo.join("-")}jessie`
                  : "e.g. 1-2-3-4jessie"}
              </span>
            </CardBody>
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={roomKey}
                onChange={(e) => {
                  setRoomKey(e.target.value);
                  if (roomError) setRoomError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEnterRoom();
                }}
                placeholder="combo-passphrase"
                disabled={!hasCombo}
                className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:border-fuchsia-400/40 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/20 disabled:opacity-40"
              />
              <button
                onClick={handleEnterRoom}
                disabled={!hasCombo || !roomKey.trim()}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Open
              </button>
            </div>
            {!hasCombo && (
              <p className="mt-2 text-[11px] text-amber-300/70">
                Set a combo first.
              </p>
            )}
            {roomError && (
              <p className="mt-2 text-[11px] text-rose-300/80">{roomError}</p>
            )}
          </Card>

          {/* Save passphrase card */}
          <Card accent="from-indigo-500/30 to-indigo-500/0">
            <CardIcon>
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                <path
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-7a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2zm10-11V7a4 4 0 00-8 0v4h8z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </CardIcon>
            <CardTitle>Passphrase</CardTitle>
            <CardBody>
              Save the short word so whispers and peeks know where to land.
            </CardBody>
            {!showPassphraseInput ? (
              <button
                onClick={() => setShowPassphraseInput(true)}
                disabled={!hasCombo}
                className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {savedPassphrase ? "Change passphrase" : "Save passphrase"}
              </button>
            ) : (
              <div className="mt-4 flex gap-2">
                <input
                  type="password"
                  autoFocus
                  value={passphraseValue}
                  onChange={(e) => setPassphraseValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handlePassphraseSubmit();
                    if (e.key === "Escape") {
                      setShowPassphraseInput(false);
                      setPassphraseValue("");
                    }
                  }}
                  placeholder="passphrase"
                  className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:border-indigo-400/40 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
                />
                <button
                  onClick={handlePassphraseSubmit}
                  disabled={!passphraseValue.trim()}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-rose-100 disabled:opacity-40"
                >
                  Save
                </button>
              </div>
            )}
            <CardStatus
              on={!!savedPassphrase}
              onLabel="Saved"
              offLabel="Not saved"
            />
          </Card>

          {/* Whisper card */}
          <Card accent="from-rose-400/30 to-rose-400/0">
            <CardIcon>
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                <path
                  d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </CardIcon>
            <CardTitle>Whisper to her</CardTitle>
            <CardBody>
              Slip a note into the room without opening the door.
            </CardBody>
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={whisperText}
                onChange={(e) => setWhisperText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleWhisperSend();
                }}
                placeholder={stealthUnlocked ? "say something soft…" : "locked"}
                disabled={!stealthUnlocked}
                className={`flex-1 rounded-xl border bg-black/40 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 disabled:opacity-40 ${
                  whisperFlash
                    ? "border-rose-300/60 ring-2 ring-rose-300/40"
                    : "border-white/10 focus:border-rose-400/40 focus:ring-rose-400/20"
                }`}
              />
              <button
                onClick={handleWhisperSend}
                disabled={!stealthUnlocked || !whisperText.trim()}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-rose-100 disabled:opacity-40"
              >
                Send
              </button>
            </div>
            {!stealthUnlocked && (
              <p className="mt-2 text-[11px] text-neutral-500">
                Save a passphrase to unlock.
              </p>
            )}
          </Card>

          {/* Peek card */}
          <Card accent="from-violet-500/30 to-violet-500/0">
            <CardIcon>
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                <path
                  d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="3"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
            </CardIcon>
            <CardTitle>Peek inside</CardTitle>
            <CardBody>
              Glance at the latest messages without stepping in.
            </CardBody>
            <button
              onClick={handlePeek}
              disabled={!stealthUnlocked || isPeeking}
              className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPeeking ? "Looking…" : "Take a peek"}
            </button>
            {!stealthUnlocked && (
              <p className="mt-2 text-[11px] text-neutral-500">
                Save a passphrase to unlock.
              </p>
            )}
            {peekMessages && peekMessages.length > 0 && (
              <div className="mt-4 space-y-2">
                {peekMessages.slice(-3).map((m, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs"
                  >
                    <p className="text-[10px] uppercase tracking-wide text-neutral-500">
                      {m.sender}
                    </p>
                    <p className="mt-0.5 text-neutral-200">{m.text}</p>
                  </div>
                ))}
              </div>
            )}
            {peekMessages && peekMessages.length === 0 && (
              <p className="mt-3 text-[11px] text-neutral-500">
                Nothing in there yet.
              </p>
            )}
          </Card>

          {/* AI assistant card */}
          <Card accent="from-sky-500/30 to-sky-500/0">
            <CardIcon>
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                <path
                  d="M12 2a4 4 0 014 4v1h1a3 3 0 013 3v2a3 3 0 01-3 3v3l-4-3H8a3 3 0 01-3-3v-2a3 3 0 013-3h1V6a4 4 0 013-4z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            </CardIcon>
            <CardTitle>Ask the assistant</CardTitle>
            <CardBody>
              Not Jessie. Just a helper if you forget how something works.
            </CardBody>
            <button
              onClick={() => setAiOpen((v) => !v)}
              className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              {aiOpen ? "Hide chat" : "Open chat"}
            </button>
          </Card>
        </section>

        {/* AI chat panel (collapsible) */}
        {aiOpen && (
          <section className="mt-8">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Assistant
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Quick answers. Nothing personal.
                  </p>
                </div>
                <button
                  onClick={() => setAiOpen(false)}
                  className="rounded-full p-1 text-neutral-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
              <div className="max-h-[55vh] space-y-3 overflow-y-auto px-4 py-5 sm:px-6">
                {aiMessages.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-center text-sm text-neutral-400">
                    Ask anything.
                  </div>
                )}
                {aiMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-lg ${
                        msg.role === "user"
                          ? "bg-rose-200 text-black"
                          : "bg-white/10 text-white"
                      }`}
                    >
                      <p className="text-[10px] uppercase tracking-wide opacity-60">
                        {msg.role === "user" ? "You" : "Assistant"}
                      </p>
                      <p className="mt-1 whitespace-pre-line">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isAiLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-white/10 px-4 py-2.5 text-sm text-white shadow-lg">
                      <p className="animate-pulse">Thinking…</p>
                    </div>
                  </div>
                )}
                <div ref={aiBottomRef} />
              </div>
              <div className="border-t border-white/10 px-4 py-4 sm:px-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAiSend();
                    }}
                    placeholder="Ask anything…"
                    disabled={isAiLoading}
                    className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-sky-400/40 focus:outline-none focus:ring-2 focus:ring-sky-400/20 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    title="Paste"
                    disabled={isAiLoading}
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) setAiInput(text);
                      } catch {
                        /* ignore */
                      }
                    }}
                    className="rounded-xl border border-white/10 px-3 text-white transition hover:bg-white/10 disabled:opacity-40"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m4 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h2m2 0h4"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={handleAiSend}
                    disabled={isAiLoading || !aiInput.trim()}
                    className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isAiLoading ? "…" : "Send"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        <footer className="mt-14 text-center text-[11px] uppercase tracking-[0.2em] text-neutral-600">
          Her room · Built with care
        </footer>
      </div>
    </div>
  );
}

// ── Small presentational helpers ─────────────────────────────────────

function Step({
  n,
  title,
  body,
  done,
}: {
  n: number;
  title: string;
  body: string;
  done: boolean;
}) {
  return (
    <li className="flex gap-3">
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition ${
          done
            ? "border-rose-300/40 bg-rose-400/20 text-rose-100"
            : "border-white/10 bg-white/5 text-neutral-300"
        }`}
      >
        {done ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
            <path
              d="M5 12l5 5L20 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          n
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-neutral-400">{body}</p>
      </div>
    </li>
  );
}

function Card({
  children,
  accent,
  onClick,
  interactive,
}: {
  children: React.ReactNode;
  accent: string;
  onClick?: () => void;
  interactive?: boolean;
}) {
  const baseClasses =
    "group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left backdrop-blur-xl transition";
  const interactiveClasses = interactive
    ? "hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07] active:translate-y-0"
    : "";
  const inner = (
    <>
      <div
        className={`pointer-events-none absolute inset-x-0 -top-1/2 h-full bg-gradient-to-b ${accent} opacity-60 blur-2xl`}
      />
      <div className="relative">{children}</div>
    </>
  );

  if (interactive) {
    return (
      <button
        onClick={onClick}
        className={`${baseClasses} ${interactiveClasses}`}
      >
        {inner}
      </button>
    );
  }
  return <div className={baseClasses}>{inner}</div>;
}

function CardIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white">
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-base font-semibold text-white sm:text-lg">
      {children}
    </h3>
  );
}

function CardBody({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-sm text-neutral-400">{children}</p>;
}

function CardStatus({
  on,
  onLabel,
  offLabel,
}: {
  on: boolean;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <div className="mt-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-wider">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          on
            ? "bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]"
            : "bg-neutral-600"
        }`}
      />
      <span className={on ? "text-emerald-300" : "text-neutral-500"}>
        {on ? onLabel : offLabel}
      </span>
    </div>
  );
}

// ── Legacy export retained below (no longer rendered) ────────────────
function _LegacyDisguise({
  aiMessages,
  aiInput,
  setAiInput,
  isAiLoading,
  aiBottomRef,
  handleAiSend,
  onOpenLockBox,
  onStealthSend,
  onStealthPeek,
  savedPassphrase,
  onPassphraseUnlock,
  hasCombo = false,
}: AIChatDisguiseProps) {
  const [helpFlash, setHelpFlash] = useState(false);
  const [peekMessages, setPeekMessages] = useState<
    { sender: string; text: string }[] | null
  >(null);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── "Ask" passphrase gate ──────────────────────────────────────────
  const [showPassphraseInput, setShowPassphraseInput] = useState(false);
  const [passphraseValue, setPassphraseValue] = useState("");
  const [stealthUnlocked, setStealthUnlocked] = useState(false);
  const passphraseInputRef = useRef<HTMLInputElement>(null);

  // If the parent already has a saved passphrase, auto-unlock
  useEffect(() => {
    if (savedPassphrase && hasCombo) {
      setStealthUnlocked(true);
    }
  }, [savedPassphrase, hasCombo]);

  const handleAskClick = useCallback(() => {
    if (stealthUnlocked) return; // already unlocked, no-op
    setShowPassphraseInput((prev) => !prev);
    // Focus input on next frame
    requestAnimationFrame(() => passphraseInputRef.current?.focus());
  }, [stealthUnlocked]);

  const handlePassphraseSubmit = useCallback(() => {
    const phrase = passphraseValue.trim();
    if (!phrase) return;
    if (!hasCombo) return; // need combo set first

    // Propagate passphrase to parent so stealth functions target the
    // correct room path. This only calls setPassphrase — it does NOT
    // trigger setShowRealChat, so the disguise stays visible.
    onPassphraseUnlock?.(phrase);
    setStealthUnlocked(true);
    setShowPassphraseInput(false);
    setPassphraseValue("");
  }, [passphraseValue, hasCombo, onPassphraseUnlock]);

  // ── Stealth send (gated) ───────────────────────────────────────────
  const handleHelpClick = useCallback(async () => {
    if (!stealthUnlocked) return; // gate
    const text = aiInput.trim();
    if (!text || !onStealthSend) return;

    try {
      const sent = await onStealthSend(text);
      if (sent) {
        setAiInput("");
        setHelpFlash(true);
        setTimeout(() => setHelpFlash(false), 600);
      }
    } catch {
      // Silently fail — no visual indication
    }
  }, [stealthUnlocked, aiInput, onStealthSend, setAiInput]);

  // ── Stealth peek (gated) ───────────────────────────────────────────
  const handleHelpDoubleClick = useCallback(async () => {
    if (!stealthUnlocked) return; // gate
    const text = aiInput.trim();
    if (text || !onStealthPeek) return;

    try {
      const msgs = await onStealthPeek();
      if (msgs.length === 0) return;

      setPeekMessages(msgs);

      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
      peekTimerRef.current = setTimeout(() => {
        setPeekMessages(null);
        peekTimerRef.current = null;
      }, 3000);
    } catch {
      // Silently fail
    }
  }, [stealthUnlocked, aiInput, onStealthPeek]);

  // Dismiss peek on any click anywhere
  const dismissPeek = useCallback(() => {
    if (peekMessages) {
      setPeekMessages(null);
      if (peekTimerRef.current) {
        clearTimeout(peekTimerRef.current);
        peekTimerRef.current = null;
      }
    }
  }, [peekMessages]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    };
  }, []);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className="fixed inset-0 flex flex-col bg-gradient-to-br from-neutral-950 via-neutral-900 to-black overflow-hidden"
      onClick={dismissPeek}
    >
      {/* Stealth peek overlay */}
      {peekMessages && peekMessages.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="max-w-md w-full mx-4 space-y-2 pointer-events-auto">
            {peekMessages.map((msg, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-white/10 backdrop-blur-sm px-4 py-3 text-sm text-white shadow-lg animate-in fade-in duration-200"
              >
                <p className="text-[11px] uppercase tracking-wide text-neutral-400">
                  {msg.sender}
                </p>
                <p className="mt-1 whitespace-pre-line">{msg.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col justify-center items-center px-2 pb-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Ian
            <span onClick={onOpenLockBox}>&apos;</span>s AI Assistant{" "}
            <span className="text-sm">v1.0</span>
          </h1>
          <p className="mt-2 text-neutral-400">
            <span
              onClick={handleAskClick}
              className={`cursor-text select-none transition-colors duration-300
               `}
            >
              Ask
            </span>{" "}
            me anything about web development, my projects, or how I can{" "}
            <span
              onClick={handleHelpClick}
              onDoubleClick={handleHelpDoubleClick}
              className={`cursor-text select-none transition-colors duration-500 ${
                helpFlash ? "text-white/90" : ""
              }`}
            >
              help
            </span>
            .
          </p>
          {/* Passphrase gate input */}
          {showPassphraseInput && !stealthUnlocked && (
            <div className="mt-2 flex items-center gap-2 justify-center animate-in fade-in slide-in-from-top-1 duration-200">
              <input
                ref={passphraseInputRef}
                type="password"
                placeholder={hasCombo ? "Enter passphrase…" : "Set combo first"}
                value={passphraseValue}
                onChange={(e) => setPassphraseValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handlePassphraseSubmit();
                  if (e.key === "Escape") {
                    setShowPassphraseInput(false);
                    setPassphraseValue("");
                  }
                }}
                disabled={!hasCombo}
                className="rounded-full border border-white/10 bg-black/40 px-4 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/40 disabled:opacity-40 w-56"
              />
              <button
                onClick={handlePassphraseSubmit}
                disabled={!hasCombo || !passphraseValue.trim()}
                className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white transition hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                →
              </button>
            </div>
          )}
        </div>
        <div className="w-full max-w-3xl flex flex-col justify-center items-center">
          <div className="flex min-h-[520px] flex-col rounded-3xl border border-white/10 bg-white/5 backdrop-blur w-full">
            <div className="border-b border-white/10 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Chat with AI</h2>
              <p className="text-xs text-neutral-400">
                Powered by Groq • Ask me anything
              </p>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto max-h-[60vh] px-3 sm:px-6 py-6">
              {aiMessages.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-neutral-400">
                  Start a conversation. Ask about my skills, projects, or how I
                  can help with yours.
                </div>
              )}
              {aiMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-lg ${
                      msg.role === "user"
                        ? "bg-emerald-400/90 text-black"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    <p className="text-[11px] uppercase tracking-wide opacity-70">
                      {msg.role === "user" ? "You" : "Ian AI"}
                    </p>
                    <p className="mt-1 whitespace-pre-line">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isAiLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl bg-white/10 px-4 py-3 text-sm text-white shadow-lg">
                    <p className="text-[11px] uppercase tracking-wide opacity-70">
                      Ian AI
                    </p>
                    <p className="mt-1 animate-pulse">Thinking...</p>
                  </div>
                </div>
              )}
              <div ref={aiBottomRef} />
            </div>
            <div className="border-t border-white/10 px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="text"
                  placeholder="Ask me anything..."
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAiSend();
                    }
                  }}
                  disabled={isAiLoading}
                  className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:opacity-50"
                />
                {/* Clipboard button */}
                <button
                  type="button"
                  className="flex-shrink-0 rounded-full border border-white/10 p-3 ml-2 text-white transition hover:bg-white/10"
                  title="Paste from clipboard"
                  disabled={isAiLoading}
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) setAiInput(text);
                    } catch {
                      // ignore
                    }
                  }}
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m4 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h2m2 0h4"
                    />
                  </svg>
                </button>
                <button
                  onClick={handleAiSend}
                  disabled={isAiLoading || !aiInput.trim()}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAiLoading ? "..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
