"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Reword text via the AI tagline-text API.
 *
 * Usage:
 * ```tsx
 * const { reword, reworded, isLoading } = useAiReword();
 *
 * // Call reword with original text — returns the AI variation:
 * const fresh = await reword("Hello there!");
 * // Or read it from `reworded` after the promise resolves.
 * ```
 *
 * On the **first call** for a given string, the original text is returned
 * immediately (no API hit) so the user sees your intended copy on the
 * first render. Every subsequent call hits the AI for a fresh variation.
 */
export function useAiReword() {
  const [reworded, setReworded] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const seenRef = useRef<Set<string>>(new Set());

  const reword = useCallback(async (original: string): Promise<string> => {
    // First time we see this exact string → return as-is (no API call)
    if (!seenRef.current.has(original)) {
      seenRef.current.add(original);
      setReworded(original);
      return original;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/ai-tagline-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: original }),
      });

      if (!res.ok) {
        // Fallback to original on failure
        setReworded(original);
        return original;
      }

      const { reply } = await res.json();
      const result = reply ?? original;
      setReworded(result);
      return result;
    } catch {
      setReworded(original);
      return original;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { reword, reworded, isLoading };
}

/**
 * Manages multiple tagline texts at once — each identified by index.
 *
 * Usage:
 * ```tsx
 * const { texts, rewordAll, rewordOne } = useAiRewordGroup([
 *   "Hi there! I worked very hard on this!",
 *   "Leave some feedback please! 😁",
 *   "Press the feedback button!",
 * ]);
 *
 * // texts[0], texts[1], texts[2] — always up-to-date
 *
 * // Reword all at once (e.g. on each loop cycle):
 * await rewordAll();
 *
 * // Or reword just one:
 * await rewordOne(1);
 * ```
 */
export function useAiRewordGroup(originals: string[]) {
  const [texts, setTexts] = useState<string[]>(originals);
  const [isLoading, setIsLoading] = useState(false);
  const hasRunRef = useRef(false);

  const rewordOne = useCallback(
    async (index: number, maxWords?: number) => {
      if (index < 0 || index >= originals.length) return;

      try {
        const body: Record<string, unknown> = { text: originals[index] };
        if (maxWords && maxWords > 0) body.maxWords = maxWords;

        const res = await fetch("/api/ai-tagline-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) return;
        const { reply } = await res.json();
        if (reply) {
          setTexts((prev) => {
            const next = [...prev];
            next[index] = reply;
            return next;
          });
        }
      } catch {
        // keep existing text on failure
      }
    },
    [originals],
  );

  const rewordAll = useCallback(async (maxWordsPerText?: number[]) => {
    // First call → use originals as-is
    if (!hasRunRef.current) {
      hasRunRef.current = true;
      return;
    }

    setIsLoading(true);
    try {
      await Promise.all(
        originals.map((_, i) => {
          const limit = maxWordsPerText?.[i];
          // 0 means skip this index entirely
          if (limit === 0) return Promise.resolve();
          return rewordOne(i, limit);
        }),
      );
    } finally {
      setIsLoading(false);
    }
  }, [originals, rewordOne]);

  return { texts, rewordAll, rewordOne, isLoading };
}
