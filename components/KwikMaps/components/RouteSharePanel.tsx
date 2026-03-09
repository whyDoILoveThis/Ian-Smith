"use client";

import React, { useRef, useState } from "react";
import { Coordinate } from "@/types/KwikMaps.type";
import {
  buildGoogleMapsUrl,
  routeToJSON,
  parseRouteJSON,
  routeToShareParam,
} from "../utils/routeShare";
import {
  Share2,
  ExternalLink,
  Download,
  Upload,
  Copy,
  Check,
  Link2,
  FileJson,
} from "lucide-react";

interface Props {
  coordinates: Coordinate[];
  optimizedRoute: Coordinate[] | null;
  onImportRoute: (coords: Coordinate[]) => void;
}

export function RouteSharePanel({
  coordinates,
  optimizedRoute,
  onImportRoute,
}: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const route = optimizedRoute ?? coordinates;
  const hasRoute = route.length > 0;

  const flash = (key: string) => {
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyLink = async () => {
    const param = routeToShareParam(coordinates, optimizedRoute);
    const url = `${window.location.origin}/kwikmaps?route=${param}`;
    await navigator.clipboard.writeText(url);
    flash("link");
  };

  const handleOpenGoogleMaps = () => {
    const url = buildGoogleMapsUrl(route);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDownloadJSON = () => {
    const json = routeToJSON(coordinates, optimizedRoute);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kwikmaps-route-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyJSON = async () => {
    const json = routeToJSON(coordinates, optimizedRoute);
    await navigator.clipboard.writeText(json);
    flash("json");
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError("");
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseRouteJSON(text);
      if (parsed && parsed.length > 0) {
        onImportRoute(parsed);
      } else {
        setImportError("Invalid route file");
      }
    };
    reader.readAsText(file);

    // Reset input so the same file can be re-imported
    e.target.value = "";
  };

  return (
    <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Share2 size={20} className="text-blue-400" />
        Share & Export Route
      </h3>

      {/* Export actions */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {/* Copy shareable link */}
        <button
          onClick={handleCopyLink}
          disabled={!hasRoute}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/25 text-white text-sm font-medium transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {copied === "link" ? (
            <Check size={16} className="text-green-400" />
          ) : (
            <Link2 size={16} className="text-cyan-400" />
          )}
          {copied === "link" ? "Copied!" : "Copy Link"}
        </button>

        {/* Open in Google Maps */}
        <button
          onClick={handleOpenGoogleMaps}
          disabled={!hasRoute}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/25 text-white text-sm font-medium transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ExternalLink size={16} className="text-emerald-400" />
          Google Maps
        </button>

        {/* Download JSON */}
        <button
          onClick={handleDownloadJSON}
          disabled={!hasRoute}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/25 text-white text-sm font-medium transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Download size={16} className="text-purple-400" />
          Download JSON
        </button>

        {/* Copy JSON */}
        <button
          onClick={handleCopyJSON}
          disabled={!hasRoute}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/25 text-white text-sm font-medium transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {copied === "json" ? (
            <Check size={16} className="text-green-400" />
          ) : (
            <FileJson size={16} className="text-amber-400" />
          )}
          {copied === "json" ? "Copied!" : "Copy JSON"}
        </button>
      </div>

      {/* Import */}
      <div className="pt-3 border-t border-white/10">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500/30 to-purple-500/30 hover:from-indigo-500/50 hover:to-purple-500/50 border border-indigo-400/20 hover:border-indigo-400/40 text-white text-sm font-medium transition-all duration-200"
        >
          <Upload size={16} />
          Import Route from JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileImport}
          className="hidden"
        />
        {importError && (
          <p className="mt-2 text-red-400 text-xs text-center">{importError}</p>
        )}
      </div>
    </div>
  );
}
