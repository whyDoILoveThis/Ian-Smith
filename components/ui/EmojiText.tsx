"use client";

import React, {
  Children,
  cloneElement,
  isValidElement,
  memo,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { parseTextWithEmoji } from "@/lib/emoji/emojiRegex";
import { isSegoeEmojiSupported } from "@/lib/emoji/emojiSupport";

// ── Types ────────────────────────────────────────────────────────────

export interface EmojiTextProps {
  /** Any React content — strings, elements, fragments, arrays. */
  children: React.ReactNode;
  /** Extra class names forwarded to the wrapper element. */
  className?: string;
  /** HTML tag for the wrapper (default: no wrapper, renders a fragment). */
  as?: React.ElementType;
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Global key counter to avoid collisions across calls. */
let _keyCounter = 0;

/**
 * True once any EmojiText has mounted on the client.
 * Until then, processString uses the same default class (emoji-segoe)
 * that the server produces, preventing hydration mismatches.
 */
let _clientReady = false;

/**
 * Process a single text string: split it into text and emoji segments,
 * wrapping each emoji in a <span> with the appropriate font class.
 */
function processString(text: string): React.ReactNode[] {
  const segments = parseTextWithEmoji(text);

  // Fast path — no emoji found, return text as-is.
  if (segments.length === 1 && segments[0].type === "text") {
    return [text];
  }

  return segments.map((seg) => {
    if (seg.type === "text") return seg.value;

    // During SSR and hydration, default to emoji-segoe (matches server).
    // Real canvas detection only runs after the first mount.
    const supported = _clientReady ? isSegoeEmojiSupported(seg.value) : true;
    return (
      <span
        key={`ej-${++_keyCounter}`}
        className={supported ? "emoji-segoe" : "emoji-fallback"}
        role="img"
      >
        {seg.value}
      </span>
    );
  });
}

/**
 * Recursively walk a React node tree.  Every string leaf is parsed for
 * emoji; React elements are cloned with their children recursed into.
 * Non-string primitives (number, boolean, null) pass through unchanged.
 */
function walkTree(node: React.ReactNode): React.ReactNode {
  // String — the only leaf type we transform.
  if (typeof node === "string") {
    const processed = processString(node);
    return processed.length === 1 ? processed[0] : processed;
  }

  // Number / boolean / null / undefined — pass through.
  if (typeof node !== "object" || node === null) return node;

  // Arrays (including React fragments' children).
  if (Array.isArray(node)) {
    return node.map((child) => walkTree(child));
  }

  // Valid React element — recurse into its children.
  if (isValidElement(node)) {
    const children = (node.props as { children?: React.ReactNode }).children;
    if (children === undefined || children === null) return node;

    const newChildren = Children.map(children, (child) => walkTree(child));
    return cloneElement(node, undefined, newChildren);
  }

  return node;
}

/**
 * Collect every emoji string found in the tree (for the support check
 * effect).  Avoids re-traversing the DOM.
 */
function collectEmoji(node: React.ReactNode, out: string[]): void {
  if (typeof node === "string") {
    const segments = parseTextWithEmoji(node);
    for (const s of segments) {
      if (s.type === "emoji") out.push(s.value);
    }
    return;
  }
  if (typeof node !== "object" || node === null) return;
  if (Array.isArray(node)) {
    for (const child of node) collectEmoji(child, out);
    return;
  }
  if (isValidElement(node)) {
    const children = (node.props as { children?: React.ReactNode }).children;
    if (children != null) {
      Children.forEach(children, (child) => collectEmoji(child, out));
    }
  }
}

// ── Component ────────────────────────────────────────────────────────

/**
 * Renders any React content with hybrid emoji support.
 *
 * Recursively walks the children tree. Every string leaf is scanned for
 * emoji — supported emoji get the Segoe UI Emoji font, unsupported ones
 * get Noto / Apple Color Emoji. Non-string nodes pass through untouched.
 *
 * Works with any JSX complexity: nested elements, links, formatted text,
 * fragments, arrays, etc.
 *
 * ```tsx
 * <EmojiText>
 *   <p>Hello 👋 <a href="/link">click here 🔗</a></p>
 *   <span>Score: 100 🏆 {someVariable}</span>
 * </EmojiText>
 * ```
 */
function EmojiTextInner({ children, className, as: Tag }: EmojiTextProps) {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const hasChecked = useRef(false);

  // After mount, run canvas detection for every emoji in the tree.
  // Re-renders once so the correct fallback class is applied.
  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    // Mark client-side detection as ready for all EmojiText instances.
    if (!_clientReady) _clientReady = true;

    const emojis: string[] = [];
    collectEmoji(children, emojis);
    if (emojis.length === 0) return;

    // Always re-render after mount so actual canvas detection is used
    // (SSR/hydration render used the default `emoji-segoe` class).
    bump();
  }, [children]);

  const processed = walkTree(children);

  if (Tag) {
    return <Tag className={className}>{processed}</Tag>;
  }

  // No wrapper tag — return a fragment (avoids extra DOM nodes).
  if (className) {
    return <span className={className}>{processed}</span>;
  }
  return <>{processed}</>;
}

export const EmojiText = memo(EmojiTextInner);
export default EmojiText;
