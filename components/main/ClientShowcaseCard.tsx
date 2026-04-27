"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

/* ── Types ── */

export type ThemeColor =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "indigo"
  | "violet";

export interface ClientShowcaseCardDetails {
  title: string;
  tagline: string;
  clientsRequest: string;
  url: string;
  themeColor: ThemeColor;
}

type ClientShowcaseCardProps = ClientShowcaseCardDetails;

/* ── Theme color mapping ── */

interface ThemeConfig {
  accent: string;
  accentMuted: string;
  gradientFrom: string;
  gradientTo: string;
  border: string;
  separator: string;
  text: string;
  glow: string;
  badge: string;
  innerGlow: string;
  highlightBorder: string;
}

const themes: Record<ThemeColor, ThemeConfig> = {
  red: {
    accent: "#ef4444",
    accentMuted: "#ef444420",
    gradientFrom: "from-red-500/8",
    gradientTo: "to-red-900/4",
    border: "border-red-500/20",
    separator: "from-transparent via-red-500/40 to-transparent",
    text: "text-red-400",
    glow: "shadow-red-500/8",
    badge: "bg-red-500/10 text-red-400 ring-red-500/20",
    innerGlow: "#ef444412",
    highlightBorder: "#ef444418",
  },
  orange: {
    accent: "#f97316",
    accentMuted: "#f9731620",
    gradientFrom: "from-orange-500/8",
    gradientTo: "to-orange-900/4",
    border: "border-orange-500/20",
    separator: "from-transparent via-orange-500/40 to-transparent",
    text: "text-orange-400",
    glow: "shadow-orange-500/8",
    badge: "bg-orange-500/10 text-orange-400 ring-orange-500/20",
    innerGlow: "#f9731612",
    highlightBorder: "#f9731618",
  },
  yellow: {
    accent: "#eab308",
    accentMuted: "#eab30820",
    gradientFrom: "from-yellow-500/8",
    gradientTo: "to-yellow-900/4",
    border: "border-yellow-500/20",
    separator: "from-transparent via-yellow-500/40 to-transparent",
    text: "text-yellow-400",
    glow: "shadow-yellow-500/8",
    badge: "bg-yellow-500/10 text-yellow-400 ring-yellow-500/20",
    innerGlow: "#eab30812",
    highlightBorder: "#eab30818",
  },
  green: {
    accent: "#22c55e",
    accentMuted: "#22c55e20",
    gradientFrom: "from-green-500/8",
    gradientTo: "to-green-900/4",
    border: "border-green-500/20",
    separator: "from-transparent via-green-500/40 to-transparent",
    text: "text-green-400",
    glow: "shadow-green-500/8",
    badge: "bg-green-500/10 text-green-400 ring-green-500/20",
    innerGlow: "#22c55e12",
    highlightBorder: "#22c55e18",
  },
  blue: {
    accent: "#3b82f6",
    accentMuted: "#3b82f620",
    gradientFrom: "from-blue-500/8",
    gradientTo: "to-blue-900/4",
    border: "border-blue-500/20",
    separator: "from-transparent via-blue-500/40 to-transparent",
    text: "text-blue-400",
    glow: "shadow-blue-500/8",
    badge: "bg-blue-500/10 text-blue-400 ring-blue-500/20",
    innerGlow: "#3b82f612",
    highlightBorder: "#3b82f618",
  },
  indigo: {
    accent: "#6366f1",
    accentMuted: "#6366f120",
    gradientFrom: "from-indigo-500/8",
    gradientTo: "to-indigo-900/4",
    border: "border-indigo-500/20",
    separator: "from-transparent via-indigo-500/40 to-transparent",
    text: "text-indigo-400",
    glow: "shadow-indigo-500/8",
    badge: "bg-indigo-500/10 text-indigo-400 ring-indigo-500/20",
    innerGlow: "#6366f112",
    highlightBorder: "#6366f118",
  },
  violet: {
    accent: "#8b5cf6",
    accentMuted: "#8b5cf620",
    gradientFrom: "from-violet-500/8",
    gradientTo: "to-violet-900/4",
    border: "border-violet-500/20",
    separator: "from-transparent via-violet-500/40 to-transparent",
    text: "text-violet-400",
    glow: "shadow-violet-500/8",
    badge: "bg-violet-500/10 text-violet-400 ring-violet-500/20",
    innerGlow: "#8b5cf612",
    highlightBorder: "#8b5cf618",
  },
};

/* ── IndexedDB Screenshot Cache ── */

const DB_NAME = "showcaseScreenshots";
const DB_VERSION = 1;
const STORE_NAME = "screenshots";

function openScreenshotDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "url" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getCachedScreenshot(url: string): Promise<string | null> {
  try {
    const db = await openScreenshotDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(url);
      req.onsuccess = () => {
        db.close();
        const result = req.result;
        if (result?.blob) {
          resolve(URL.createObjectURL(result.blob));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

async function cacheScreenshot(url: string, blob: Blob): Promise<void> {
  try {
    const db = await openScreenshotDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ url, blob, cachedAt: Date.now() });
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  } catch {
    // Silently fail — screenshot will just re-fetch next time
  }
}

/* ── Screenshot fetcher ── */

async function fetchScreenshot(url: string): Promise<string | null> {
  // Check cache first
  const cached = await getCachedScreenshot(url);
  if (cached) return cached;

  try {
    const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(
      url,
    )}&screenshot=true&meta=false&embed=screenshot.url`;

    const response = await fetch(apiUrl);
    if (!response.ok) return null;

    const blob = await response.blob();
    if (blob.size === 0) return null;

    // Cache the blob in IndexedDB
    await cacheScreenshot(url, blob);

    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/* ── Framer Motion variants ── */

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

const screenshotVariants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, delay: 0.2 },
  },
};

/* ── Component ── */

export default function ClientShowcaseCard({
  title,
  tagline,
  clientsRequest,
  url,
  themeColor,
}: ClientShowcaseCardProps) {
  const [screenshotSrc, setScreenshotSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isRequestExpanded, setIsRequestExpanded] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  const theme = themes[themeColor];

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(false);

      const src = await fetchScreenshot(url);

      if (cancelled) {
        if (src) URL.revokeObjectURL(src);
        return;
      }

      if (src) {
        objectUrlRef.current = src;
        setScreenshotSrc(src);
      } else {
        setError(true);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [url]);

  useEffect(() => {
    setIsRequestExpanded(false);
  }, [clientsRequest, url]);

  const displayUrl = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const requestPreviewLength = 540;
  const isRequestLong = clientsRequest.trim().length > requestPreviewLength;
  const requestTextToRender =
    isRequestExpanded || !isRequestLong
      ? clientsRequest
      : `${clientsRequest.slice(0, requestPreviewLength).trimEnd()}...`;

  const panelSurface = {
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.018) 100%)",
    boxShadow: [
      "inset 0 1px 0 rgba(255,255,255,0.08)",
      "inset 0 -1px 0 rgba(0,0,0,0.3)",
      "0 12px 28px -18px rgba(0,0,0,0.6)",
    ].join(", "),
    border: "1px solid rgba(255,255,255,0.06)",
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      className={`
        group relative overflow-hidden rounded-[28px] border ${theme.border}
        bg-[#09090b]
        transition-all duration-500 ease-out
      `}
      style={{
        backgroundImage: [
          `radial-gradient(circle at 86% 18%, ${theme.accent}48 0%, ${theme.accent}24 16%, transparent 42%)`,
          `radial-gradient(circle at 82% 22%, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 8%, transparent 18%)`,
          `radial-gradient(circle at 18% 100%, rgba(255,255,255,0.04) 0%, transparent 36%)`,
          "linear-gradient(135deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.01) 24%, rgba(8,8,10,0.98) 58%, rgba(12,12,16,1) 100%)",
        ].join(", "),
        boxShadow: [
          `0 0 0 1px ${theme.highlightBorder}`,
          `0 1px 0 0 rgba(255,255,255,0.06) inset`,
          `0 -1px 0 0 rgba(0,0,0,0.3) inset`,
          `0 14px 26px -16px rgba(0,0,0,0.9)`,
          `0 24px 80px -28px rgba(0,0,0,0.82)`,
          `0 0 90px -28px ${theme.innerGlow}`,
        ].join(", "),
      }}
      whileHover={{
        y: -2,
        boxShadow: [
          `0 0 0 1px ${theme.highlightBorder}`,
          `0 1px 0 0 rgba(255,255,255,0.06) inset`,
          `0 -1px 0 0 rgba(0,0,0,0.3) inset`,
          `0 18px 40px -10px rgba(0,0,0,0.8)`,
          `0 32px 100px -24px rgba(0,0,0,0.72)`,
          `0 0 110px -10px ${theme.accentMuted}`,
        ].join(", "),
      }}
    >
      {/* ── Soft ambient glow ── */}
      <div
        className="absolute -right-40 -top-36 h-[34rem] w-[34rem] pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, ${theme.accent}30 0%, ${theme.accent}14 28%, ${theme.accent}08 48%, transparent 74%)`,
          filter: "blur(18px)",
          opacity: 0.95,
        }}
      />

      {/* ── Left premium gradient rail ── */}
      <div className="absolute inset-y-3 left-0 w-[3px] rounded-r-full overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, rgba(255,255,255,0.18) 0%, ${theme.accent} 18%, ${theme.accent}cc 50%, ${theme.accent} 82%, rgba(255,255,255,0.08) 100%)`,
            boxShadow: `0 0 18px ${theme.accentMuted}, 0 0 36px ${theme.innerGlow}`,
          }}
        />
      </div>

      <div
        className="absolute inset-y-6 left-[3px] w-8 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, ${theme.innerGlow}, transparent 70%)`,
        }}
      />

      {/* ── Emboss: Top highlight edge ── */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.08) 80%, transparent 95%)`,
        }}
      />

      {/* ── Emboss: Bottom shadow edge ── */}
      <div
        className="absolute inset-x-0 bottom-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent 10%, rgba(0,0,0,0.3) 50%, transparent 90%)`,
        }}
      />

      {/* ── Accent glow line (top) ── */}
      <div
        className="absolute inset-x-0 top-px h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${theme.accent}50, transparent)`,
        }}
      />

      {/* ── Subtle inner radial glow ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 52% 0%, ${theme.innerGlow} 0%, transparent 70%)`,
        }}
      />

      <div
        className="absolute inset-[1px] rounded-[27px] pointer-events-none"
        style={{
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.04), inset 0 18px 30px rgba(255,255,255,0.018)",
        }}
      />

      {/* ── Light sweep on hover ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{
          background: `linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.03) 55%, transparent 60%)`,
        }}
      />

      {/* ── Noise texture overlay for depth ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />

      <div className="relative flex flex-col md:flex-row min-h-[320px]">
        {/* ── Left: Client's Request ── */}
        <div className="flex-1 p-4 md:p-5 md:max-w-[40%]">
          <div
            className="h-full rounded-[22px] px-6 py-7 md:px-7 md:py-8 flex flex-col justify-center"
            style={panelSurface}
          >
            {/* Badge with embossed pill */}
            <span
              className={`
              inline-flex items-center self-start
              text-[10px] font-semibold uppercase tracking-[0.2em]
              px-3.5 py-1.5 rounded-full ring-1
              ${theme.badge}
              mb-6
            `}
              style={{
                boxShadow: `0 1px 2px rgba(0,0,0,0.2), 0 0 0 0.5px ${theme.highlightBorder}, inset 0 1px 0 rgba(255,255,255,0.06)`,
              }}
            >
              Client&apos;s Request
            </span>

            <blockquote className="relative">
              <span
                className={`absolute -top-4 -left-3 text-5xl leading-none opacity-15 ${theme.text} select-none font-serif`}
              >
                &ldquo;
              </span>
              <p className="text-sm md:text-[15px] leading-[1.75] text-white/75 pl-5 italic font-light whitespace-pre-line">
                {requestTextToRender}
              </p>
              {isRequestLong && (
                <button
                  type="button"
                  onClick={() => setIsRequestExpanded((prev) => !prev)}
                  className={`pl-5 mt-2 text-xs font-semibold tracking-wide ${theme.text} hover:brightness-125 transition`}
                >
                  {isRequestExpanded ? "Read less" : "Read more"}
                </button>
              )}
              <span
                className={`text-5xl leading-none opacity-15 ${theme.text} select-none font-serif`}
              >
                &rdquo;
              </span>
            </blockquote>
          </div>
        </div>

        {/* ── Separator (embossed groove) ── */}
        <div className="hidden md:flex items-stretch py-8">
          <div className="relative w-px">
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to bottom, transparent, rgba(0,0,0,0.4) 20%, rgba(0,0,0,0.4) 80%, transparent)`,
              }}
            />
            <div
              className="absolute inset-0 translate-x-px"
              style={{
                background: `linear-gradient(to bottom, transparent, rgba(255,255,255,0.06) 20%, rgba(255,255,255,0.06) 80%, transparent)`,
              }}
            />
            {/* Accent dot at center */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
              style={{
                background: theme.accent,
                boxShadow: `0 0 8px ${theme.accent}60, 0 0 20px ${theme.accent}20`,
              }}
            />
          </div>
        </div>
        <div className="md:hidden mx-6">
          <div className="relative h-px">
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to right, transparent, rgba(0,0,0,0.4) 20%, rgba(0,0,0,0.4) 80%, transparent)`,
              }}
            />
            <div
              className="absolute inset-0 translate-y-px"
              style={{
                background: `linear-gradient(to right, transparent, rgba(255,255,255,0.06) 20%, rgba(255,255,255,0.06) 80%, transparent)`,
              }}
            />
          </div>
        </div>

        {/* ── Right: Info + Screenshot ── */}
        <div className="flex-1 p-4 md:p-5 md:max-w-[60%]">
          <div
            className="relative h-full rounded-[22px] px-6 py-7 md:px-7 md:py-8 flex flex-col gap-4 overflow-hidden"
            style={{
              ...panelSurface,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.09)",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.035) 100%)",
                backdropFilter: "blur(18px) saturate(125%)",
                WebkitBackdropFilter: "blur(18px) saturate(125%)",
              }}
            />

            <div
              className="absolute inset-0 pointer-events-none opacity-70"
              style={{
                background: `radial-gradient(circle at 85% 18%, ${theme.innerGlow} 0%, transparent 48%)`,
              }}
            />

            {/* Title & Tagline */}
            <div className="relative z-[1]">
              <h3 className="text-xl md:text-[1.75rem] font-bold text-white tracking-tight [text-shadow:0_1px_0_rgba(255,255,255,0.05)]">
                {title}
              </h3>
              <p
                className="text-sm mt-1.5 font-medium tracking-wide"
                style={{ color: `${theme.accent}90` }}
              >
                {tagline}
              </p>
            </div>

            {/* URL — embossed pill link */}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`
              relative z-[1] inline-flex items-center gap-2 text-xs font-mono
              px-3 py-1.5 rounded-lg w-fit
              ${theme.text}
              transition-all duration-200
              hover:brightness-125
            `}
              style={{
                background: `${theme.accent}08`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.12)`,
                border: `1px solid ${theme.highlightBorder}`,
              }}
            >
              <ExternalLink className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[280px]">{displayUrl}</span>
            </a>

            {/* Screenshot — inset frame */}
            <div
              className="relative z-[1] mt-3 rounded-xl overflow-hidden"
              style={{
                boxShadow: [
                  `inset 0 2px 4px rgba(0,0,0,0.3)`,
                  `inset 0 0 0 1px rgba(255,255,255,0.04)`,
                  `0 1px 0 rgba(255,255,255,0.03)`,
                ].join(", "),
                border: `1px solid rgba(0,0,0,0.3)`,
                background: "rgba(0,0,0,0.25)",
              }}
            >
              {loading && (
                <div className="flex items-center justify-center h-44 md:h-52">
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                      style={{
                        borderColor: `${theme.accent}40`,
                        borderTopColor: "transparent",
                      }}
                    />
                    <span className="text-[11px] text-white/30 tracking-wide">
                      Loading preview&hellip;
                    </span>
                  </div>
                </div>
              )}

              {!loading && error && (
                <div className="flex items-center justify-center h-44 md:h-52">
                  <span className="text-xs text-white/25 tracking-wide">
                    Preview unavailable
                  </span>
                </div>
              )}

              {!loading && screenshotSrc && (
                <motion.img
                  variants={screenshotVariants}
                  initial="hidden"
                  animate="visible"
                  src={screenshotSrc}
                  alt={`Screenshot of ${title}`}
                  className="w-full h-auto object-cover object-top max-h-[280px]"
                />
              )}

              {/* Screenshot inner top shadow for depth */}
              <div
                className="absolute inset-x-0 top-0 h-8 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(0,0,0,0.2), transparent)",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Corner accents ── */}
      <div
        className="absolute top-0 left-0 w-16 h-16 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 0% 0%, ${theme.accent}08 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-24 h-24 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 100% 100%, ${theme.accent}06 0%, transparent 70%)`,
        }}
      />
    </motion.div>
  );
}
