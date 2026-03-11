"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  appwrGetBugReports,
  appwrDeleteBugReport,
  subscribeBugReports,
  BugReport,
} from "@/appwrite/appwrBugReport";
import {
  Bug,
  MessageSquarePlus,
  Lightbulb,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Filter,
  X,
  Inbox,
  ChevronDown,
  Search,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

/* ── category meta ── */
const CATEGORY_META: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  bug: {
    label: "Bug",
    color: "text-red-400",
    bg: "bg-red-500/15 border-red-500/20",
    icon: <Bug size={13} />,
  },
  problem: {
    label: "Problem",
    color: "text-amber-400",
    bg: "bg-amber-500/15 border-amber-500/20",
    icon: <AlertTriangle size={13} />,
  },
  idea: {
    label: "Idea",
    color: "text-emerald-400",
    bg: "bg-emerald-500/15 border-emerald-500/20",
    icon: <Lightbulb size={13} />,
  },
  limitation: {
    label: "Limitation",
    color: "text-violet-400",
    bg: "bg-violet-500/15 border-violet-500/20",
    icon: <AlertTriangle size={13} />,
  },
  feedback: {
    label: "Feedback",
    color: "text-indigo-400",
    bg: "bg-indigo-500/15 border-indigo-500/20",
    icon: <MessageSquarePlus size={13} />,
  },
};

function getCategoryMeta(cat?: string) {
  if (!cat) return CATEGORY_META.feedback;
  return CATEGORY_META[cat] ?? CATEGORY_META.feedback;
}

function formatPage(page?: string) {
  if (!page || page === "/") return "Home";
  return page
    .replace(/^\//, "")
    .split("/")[0]
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year:
      new Date(dateStr).getFullYear() !== new Date().getFullYear()
        ? "numeric"
        : undefined,
  });
}

export default function BugReportsCMS() {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  /* filters */
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterPage, setFilterPage] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await appwrGetBugReports();
      setReports(data.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch (err: any) {
      setError(err?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* realtime subscription */
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    subscribeBugReports((event) => {
      if (event.type === "create") {
        setReports((prev) => {
          if (prev.some((r) => r.$id === event.report.$id)) return prev;
          return [event.report, ...prev];
        });
      } else if (event.type === "update") {
        setReports((prev) =>
          prev.map((r) => (r.$id === event.report.$id ? event.report : r)),
        );
      } else if (event.type === "delete") {
        setReports((prev) => prev.filter((r) => r.$id !== event.id));
      }
    }).then((unsub) => {
      cleanup = unsub;
    });
    return () => cleanup?.();
  }, []);

  /* derived data */
  const uniqueCategories = useMemo(
    () => [...new Set(reports.map((r) => r.category || "feedback"))],
    [reports],
  );
  const uniquePages = useMemo(
    () => [...new Set(reports.map((r) => r.page || "/"))],
    [reports],
  );

  const filtered = useMemo(() => {
    let list = reports;
    if (filterCategory)
      list = list.filter((r) => (r.category || "feedback") === filterCategory);
    if (filterPage) list = list.filter((r) => (r.page || "/") === filterPage);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) => r.message.toLowerCase().includes(q));
    }
    return list;
  }, [reports, filterCategory, filterPage, searchQuery]);

  const activeFilters = (filterCategory ? 1 : 0) + (filterPage ? 1 : 0);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setPendingDeleteId(null);
    try {
      await appwrDeleteBugReport(id);
      setReports((prev) => prev.filter((r) => r.$id !== id));
    } catch {
      /* silently fail — stays in list */
    } finally {
      setDeletingId(null);
    }
  };

  /* ── stats ── */
  const stats = useMemo(() => {
    const cats: Record<string, number> = {};
    for (const r of reports) {
      const c = r.category || "feedback";
      cats[c] = (cats[c] || 0) + 1;
    }
    return cats;
  }, [reports]);

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* ── Header row ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Feedback & Bugs
          </h2>
          <p className="text-sm text-white/40 mt-0.5">
            {reports.length} report{reports.length !== 1 && "s"} total
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-sm font-medium transition-all disabled:opacity-40"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Stat pills ── */}
      {!loading && reports.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {Object.entries(stats)
            .sort(([, a], [, b]) => b - a)
            .map(([cat, count]) => {
              const meta = getCategoryMeta(cat);
              const isActive = filterCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(isActive ? null : cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                    isActive
                      ? `${meta.bg} ${meta.color} ring-1 ring-current/30 scale-105`
                      : `bg-white/[0.03] border-white/8 text-white/50 hover:bg-white/[0.06] hover:text-white/70`
                  }`}
                >
                  {meta.icon}
                  {meta.label}
                  <span
                    className={`ml-0.5 tabular-nums ${isActive ? "opacity-80" : "opacity-40"}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
        </div>
      )}

      {/* ── Search + Filters bar ── */}
      <div className="flex items-center gap-2 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/8 text-white placeholder-white/25 text-sm focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Page filter */}
        <div className="relative">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              filterPage
                ? "bg-blue-500/15 border-blue-500/20 text-blue-400"
                : "bg-white/[0.04] border-white/8 text-white/50 hover:bg-white/[0.06] hover:text-white/70"
            }`}
          >
            <Filter size={13} />
            Page
            {filterPage && (
              <span className="text-[10px] opacity-70">
                ({formatPage(filterPage)})
              </span>
            )}
            <ChevronDown
              size={12}
              className={`transition-transform duration-200 ${filtersOpen ? "rotate-180" : ""}`}
            />
          </button>
          <AnimatePresence>
            {filtersOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-1.5 z-50 w-56 rounded-xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden"
              >
                <div className="p-1.5">
                  <button
                    onClick={() => {
                      setFilterPage(null);
                      setFiltersOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                      !filterPage
                        ? "bg-white/10 text-white font-medium"
                        : "text-white/50 hover:bg-white/5 hover:text-white/70"
                    }`}
                  >
                    All pages
                  </button>
                  {uniquePages.map((page) => (
                    <button
                      key={page}
                      onClick={() => {
                        setFilterPage(page);
                        setFiltersOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                        filterPage === page
                          ? "bg-white/10 text-white font-medium"
                          : "text-white/50 hover:bg-white/5 hover:text-white/70"
                      }`}
                    >
                      {formatPage(page)}
                      <span className="ml-1.5 opacity-40">({page})</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Clear all filters */}
        {activeFilters > 0 && (
          <button
            onClick={() => {
              setFilterCategory(null);
              setFilterPage(null);
              setSearchQuery("");
            }}
            className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white/40 hover:text-white/70 text-xs font-medium transition-all"
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>

      {/* ── Loading ── */}
      {loading && reports.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-white/10" />
            <div className="absolute inset-0 rounded-full border-2 border-t-indigo-400 animate-spin" />
          </div>
          <p className="text-white/40 text-sm mt-4">Loading reports...</p>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 mb-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-400 shrink-0" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/8 flex items-center justify-center mb-4">
            <Inbox size={28} className="text-white/20" />
          </div>
          <p className="text-white/40 text-sm font-medium">
            {reports.length === 0
              ? "No reports yet"
              : "No reports match your filters"}
          </p>
          {activeFilters > 0 && (
            <button
              onClick={() => {
                setFilterCategory(null);
                setFilterPage(null);
                setSearchQuery("");
              }}
              className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* ── Report cards ── */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.map((report) => {
            const meta = getCategoryMeta(report.category);
            const isDeleting = deletingId === report.$id;
            return (
              <motion.div
                key={report.$id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.2 }}
                className={`group relative rounded-xl border bg-white/[0.02] hover:bg-white/[0.04] border-white/[0.06] hover:border-white/[0.1] transition-all duration-200 ${isDeleting ? "opacity-40 pointer-events-none" : ""}`}
              >
                <div className="px-4 py-3.5">
                  {/* Top row: category + page + time + delete */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${meta.bg} ${meta.color}`}
                    >
                      {meta.icon}
                      {meta.label}
                    </span>
                    {report.page && (
                      <span className="text-[11px] text-white/25 font-mono">
                        {report.page}
                      </span>
                    )}
                    <span className="ml-auto text-[11px] text-white/20 tabular-nums">
                      {timeAgo(report.createdAt)}
                    </span>
                    <button
                      onClick={() => setPendingDeleteId(report.$id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/15 text-white/20 hover:text-red-400 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {/* Message */}
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                    {report.message}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ── Delete confirm modal ── */}
      <AnimatePresence>
        {pendingDeleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            onClick={() => setPendingDeleteId(null)}
          >
            <div className="absolute inset-0 bg-black/60" />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-11 h-11 rounded-full bg-red-500/15 flex items-center justify-center mb-3">
                  <Trash2 size={20} className="text-red-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">
                  Delete report?
                </h3>
                <p className="text-xs text-white/45">
                  This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setPendingDeleteId(null)}
                  className="flex-1 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white text-xs font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(pendingDeleteId)}
                  className="flex-1 px-4 py-2 rounded-xl bg-red-500/80 hover:bg-red-500 border border-red-400/25 text-white text-xs font-medium transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
