"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  SECTIONS,
  IMPACT_META,
  type Cheat,
  type Impact,
  type CheatSection,
} from "./cheatsData";

type FilterImpact = Impact | "all";

const IMPACT_ORDER: Impact[] = ["green", "blue", "yellow", "red"];

function highlight(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-yellow-300/30 px-0.5 text-yellow-100">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function CheatCard({
  cheat,
  query,
  highlightCard,
  onCopy,
  copied,
}: {
  cheat: Cheat;
  query: string;
  highlightCard: boolean;
  onCopy: (code: string) => void;
  copied: boolean;
}) {
  const meta = IMPACT_META[cheat.impact];
  return (
    <button
      type="button"
      onClick={() => onCopy(cheat.code)}
      data-cheat-code={cheat.code}
      className={[
        "group relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left backdrop-blur-xl transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]",
        meta.glow,
        highlightCard ? "ring-2 ring-white/60 scale-[1.02]" : "",
      ].join(" ")}
    >
      {/* gradient sheen */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      {/* impact accent bar */}
      <span
        aria-hidden
        className={`absolute left-0 top-0 h-full w-1 ${meta.dot} opacity-80`}
      />

      <div className="relative flex min-w-0 flex-1 items-center gap-3">
        <span
          className={`flex h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot} ring-4 ${meta.ring}`}
          aria-label={meta.label}
          title={`${meta.label} — ${meta.description}`}
        />
        <div className="min-w-0">
          <div className="text-sm font-bold tracking-tight text-white sm:text-base">
            {highlight(cheat.name, query)}
          </div>
          <div className="mt-0.5 font-mono text-[14px] font-semibold tracking-wider text-white/70">
            {highlight(cheat.code, query)}
          </div>
          <div className="mt-1 text-xs text-white/50 sm:text-sm">
            {highlight(cheat.description, query)}
          </div>
        </div>
      </div>

      <div className="relative flex shrink-0 items-center gap-2">
        <span
          className={`hidden rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider sm:inline-block ${meta.bg} ${meta.text}`}
        >
          {meta.label}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-white/40 transition-colors group-hover:text-white/80">
          {copied ? "Copied!" : "Copy"}
        </span>
      </div>
    </button>
  );
}

function SectionBlock({
  section,
  query,
  filterImpact,
  highlightedCode,
  onCopy,
  copiedCode,
}: {
  section: CheatSection;
  query: string;
  filterImpact: FilterImpact;
  highlightedCode: string | null;
  onCopy: (code: string) => void;
  copiedCode: string | null;
}) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return section.cheats.filter((c) => {
      if (filterImpact !== "all" && c.impact !== filterImpact) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    });
  }, [section.cheats, query, filterImpact]);

  if (filtered.length === 0) return null;

  return (
    <section id={`section-${section.id}`} className="scroll-mt-32">
      <div className="mb-3 flex items-center gap-3">
        <span className="text-2xl" aria-hidden>
          {section.emoji}
        </span>
        <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
          {section.title}
        </h2>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-white/50">
          {filtered.length}
        </span>
        <div className="ml-2 h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((cheat) => (
          <CheatCard
            key={`${section.id}-${cheat.code}`}
            cheat={cheat}
            query={query}
            highlightCard={highlightedCode === cheat.code}
            onCopy={onCopy}
            copied={copiedCode === cheat.code}
          />
        ))}
      </div>
    </section>
  );
}

export default function GTASACheatsApp() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [filterImpact, setFilterImpact] = useState<FilterImpact>("all");
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // total counts per impact for legend chips
  const counts = useMemo(() => {
    const c: Record<Impact, number> = { green: 0, blue: 0, yellow: 0, red: 0 };
    for (const s of SECTIONS) for (const x of s.cheats) c[x.impact]++;
    return c;
  }, []);

  const totalCheats = useMemo(
    () => SECTIONS.reduce((a, s) => a + s.cheats.length, 0),
    [],
  );

  // flat search suggestions (top 8 matches across all sections)
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const results: { cheat: Cheat; section: CheatSection }[] = [];
    for (const s of SECTIONS) {
      for (const c of s.cheats) {
        if (
          c.code.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
        ) {
          results.push({ cheat: c, section: s });
          if (results.length >= 8) return results;
        }
      }
    }
    return results;
  }, [query]);

  const sectionsToRender = useMemo(() => {
    if (activeTab === "all") return SECTIONS;
    const found = SECTIONS.find((s) => s.id === activeTab);
    return found ? [found] : SECTIONS;
  }, [activeTab]);

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => {
        setCopiedCode((cur) => (cur === code ? null : cur));
      }, 1400);
    } catch {
      /* ignore */
    }
  };

  const jumpToCheat = (cheat: Cheat, section: CheatSection) => {
    // Switch to the relevant tab so it's visible
    if (activeTab !== "all" && activeTab !== section.id) {
      setActiveTab(section.id);
    }
    setShowSuggestions(false);
    setHighlightedCode(cheat.code);

    // Wait for DOM update, then scroll
    window.setTimeout(() => {
      const el = document.querySelector(
        `[data-cheat-code="${cheat.code}"]`,
      ) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 60);

    window.setTimeout(() => {
      setHighlightedCode((cur) => (cur === cheat.code ? null : cur));
    }, 2200);
  };

  // close suggestion popover on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#05070d] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -left-32 top-0 h-[40rem] w-[40rem] rounded-full bg-fuchsia-600/20 blur-[140px]" />
        <div className="absolute right-[-10rem] top-1/3 h-[36rem] w-[36rem] rounded-full bg-sky-500/20 blur-[140px]" />
        <div className="absolute bottom-[-10rem] left-1/3 h-[32rem] w-[32rem] rounded-full bg-emerald-500/15 blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.04),transparent_60%)]" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
      </div>

      <div
        ref={containerRef}
        className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
      >
        {/* Header */}
        <header className="mb-8 text-center sm:mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-white/60 backdrop-blur-xl">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            PC Edition · {totalCheats} cheats indexed
          </div>
          <h1 className="bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl lg:text-6xl">
            GTA: San Andreas
          </h1>
          <p className="mt-2 bg-gradient-to-r from-fuchsia-300 via-sky-300 to-emerald-300 bg-clip-text text-base font-semibold uppercase tracking-[0.3em] text-transparent sm:text-lg">
            Complete Cheat Codex
          </p>
        </header>

        {/* Search + filter bar */}
        <div className="sticky top-2 z-30 mb-6">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-3 backdrop-blur-2xl shadow-2xl shadow-black/40 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search by name, code, or effect…"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-white/30 focus:bg-white/[0.07] focus:ring-2 focus:ring-white/10"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setShowSuggestions(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
                    aria-label="Clear search"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                    </svg>
                  </button>
                )}

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-white/10 bg-black/80 shadow-2xl shadow-black/60 backdrop-blur-2xl">
                    <ul className="max-h-80 overflow-y-auto py-1">
                      {suggestions.map(({ cheat, section }) => {
                        const meta = IMPACT_META[cheat.impact];
                        return (
                          <li key={`sug-${cheat.code}`}>
                            <button
                              type="button"
                              onClick={() => jumpToCheat(cheat, section)}
                              className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-white/[0.07]"
                            >
                              <span
                                className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold text-white">
                                  {highlight(cheat.name, query)}
                                </div>
                                <div className="font-mono text-[11px] font-semibold tracking-wider text-white/60">
                                  {highlight(cheat.code, query)}
                                </div>
                                <div className="text-xs text-white/40">
                                  {highlight(cheat.description, query)}
                                </div>
                              </div>
                              <span className="hidden text-[10px] uppercase tracking-wider text-white/40 sm:inline">
                                {section.title}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              {/* Impact filter */}
              <div className="flex flex-wrap items-center gap-1.5">
                <FilterChip
                  active={filterImpact === "all"}
                  onClick={() => setFilterImpact("all")}
                  label="All"
                  count={totalCheats}
                />
                {IMPACT_ORDER.map((imp) => (
                  <FilterChip
                    key={imp}
                    active={filterImpact === imp}
                    onClick={() => setFilterImpact(imp)}
                    label={IMPACT_META[imp].label}
                    count={counts[imp]}
                    impact={imp}
                  />
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/5 pt-3 text-[11px] text-white/50">
              <span className="font-semibold uppercase tracking-wider text-white/40">
                Legend:
              </span>
              {IMPACT_ORDER.map((imp) => (
                <span
                  key={`lg-${imp}`}
                  className="inline-flex items-center gap-1.5"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${IMPACT_META[imp].dot}`}
                  />
                  <span className={IMPACT_META[imp].text}>
                    {IMPACT_META[imp].label}
                  </span>
                  <span className="text-white/40">
                    — {IMPACT_META[imp].description}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 -mx-1 overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-1.5 px-1">
            <TabButton
              active={activeTab === "all"}
              onClick={() => setActiveTab("all")}
              label="All"
              emoji="✨"
              count={totalCheats}
            />
            {SECTIONS.map((s) => (
              <TabButton
                key={s.id}
                active={activeTab === s.id}
                onClick={() => setActiveTab(s.id)}
                label={s.title}
                emoji={s.emoji}
                count={s.cheats.length}
              />
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-10 pb-20">
          {sectionsToRender.map((section) => (
            <SectionBlock
              key={section.id}
              section={section}
              query={query}
              filterImpact={filterImpact}
              highlightedCode={highlightedCode}
              onCopy={handleCopy}
              copiedCode={copiedCode}
            />
          ))}

          {/* Empty state */}
          {sectionsToRender.every(
            (section) =>
              section.cheats.filter((c) => {
                const q = query.trim().toLowerCase();
                if (filterImpact !== "all" && c.impact !== filterImpact)
                  return false;
                if (!q) return true;
                return (
                  c.code.toLowerCase().includes(q) ||
                  c.name.toLowerCase().includes(q) ||
                  c.description.toLowerCase().includes(q)
                );
              }).length === 0,
          ) && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-center backdrop-blur-xl">
              <div className="text-5xl">🕵️</div>
              <h3 className="mt-3 text-lg font-bold text-white">
                No cheats found
              </h3>
              <p className="mt-1 text-sm text-white/50">
                Try a different search term or impact filter.
              </p>
            </div>
          )}
        </div>

        <footer className="border-t border-white/5 pt-6 text-center text-xs text-white/30">
          Click any cheat to copy. Use cheats responsibly — some may corrupt
          save files or disable trophies.
        </footer>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  emoji,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  emoji: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all duration-300 backdrop-blur-xl",
        active
          ? "border-white/30 bg-white/15 text-white shadow-[0_0_24px_-4px_rgba(255,255,255,0.3)]"
          : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:bg-white/[0.07] hover:text-white",
      ].join(" ")}
    >
      <span aria-hidden>{emoji}</span>
      <span>{label}</span>
      <span
        className={[
          "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
          active ? "bg-white/20 text-white" : "bg-white/10 text-white/50",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  impact,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  impact?: Impact;
}) {
  const meta = impact ? IMPACT_META[impact] : null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition",
        active
          ? meta
            ? `border-white/20 ${meta.bg} ${meta.text}`
            : "border-white/30 bg-white/15 text-white"
          : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white",
      ].join(" ")}
    >
      {meta && <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />}
      <span>{label}</span>
      <span className="rounded-full bg-black/30 px-1.5 py-0.5 text-[9px] font-bold text-white/70">
        {count}
      </span>
    </button>
  );
}
