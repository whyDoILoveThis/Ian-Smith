// components/0Timeline/TimelineAI/AITimelineModal.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  X,
  Wand2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import AIPromptExamples from "./AIPromptExamples";
import AILoadingAnimation from "./AILoadingAnimation";
import AIGeneratedPreview from "./AIGeneratedPreview";
import TutorialModeGuard from "../TutorialModeGuard";
import type { GeneratedTimeline, GeneratedNode } from "./types";

// Re-export types for convenience
export type { GeneratedTimeline, GeneratedNode };

interface AITimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (timeline: GeneratedTimeline) => Promise<void>;
  onPreviewClose: (timeline: GeneratedTimeline | null) => void;
  isSignedIn: boolean;
  existingPreview?: GeneratedTimeline | null;
}

type ModalState =
  | "input"
  | "loading"
  | "preview"
  | "saving"
  | "error"
  | "success";

export default function AITimelineModal({
  isOpen,
  onClose,
  onGenerate,
  onPreviewClose,
  isSignedIn,
  existingPreview,
}: AITimelineModalProps) {
  const [prompt, setPrompt] = useState("");
  const [modalState, setModalState] = useState<ModalState>("input");
  const [generatedTimeline, setGeneratedTimeline] =
    useState<GeneratedTimeline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // When modal opens, check for existing preview
  useEffect(() => {
    if (isOpen) {
      if (existingPreview) {
        setGeneratedTimeline(existingPreview);
        setModalState("preview");
      } else {
        setModalState("input");
      }
      setError(null);
    }
  }, [isOpen, existingPreview]);

  // Handle close - preserve preview state
  const handleClose = () => {
    if (modalState === "preview" && generatedTimeline) {
      onPreviewClose(generatedTimeline);
    } else {
      onPreviewClose(null);
    }
    onClose();
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setModalState("loading");
    setError(null);

    try {
      const response = await fetch("/api/generate-timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate timeline");
      }

      setGeneratedTimeline(data.timeline);
      setModalState("preview");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setModalState("error");
    }
  };

  const handleConfirm = async () => {
    if (!generatedTimeline) return;

    setModalState("saving");
    try {
      await onGenerate(generatedTimeline);
      setModalState("success");
      setTimeout(() => {
        onPreviewClose(null); // Clear the preview after successful save
        onClose();
        setPrompt("");
        setGeneratedTimeline(null);
        setModalState("input");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to save timeline");
      setModalState("error");
    }
  };

  const handleRetry = () => {
    setModalState("input");
    setError(null);
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
    textareaRef.current?.focus();
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] mx-4 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl">
        <TutorialModeGuard onClose={handleClose} />
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-violet-500/10 via-cyan-500/10 to-pink-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-lg">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                AI Timeline Generator
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Describe your timeline and let AI create it for you
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Not signed in warning */}
          {!isSignedIn && (
            <div className="mx-6 mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <AlertCircle
                className="text-amber-500 flex-shrink-0 mt-0.5"
                size={18}
              />
              <div>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  Sign in to save your timelines
                </p>
                <p className="text-xs text-amber-500/80 dark:text-amber-400/70 mt-0.5">
                  You can preview AI-generated timelines, but you&apos;ll need
                  to sign in to save them permanently.
                </p>
              </div>
            </div>
          )}

          {/* Input State */}
          {modalState === "input" && (
            <div className="p-6 space-y-4">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the timeline you want to create...

Examples:
• Create a timeline of the American Revolutionary War with major battles and events
• Generate a 12-week fitness plan to build muscle and lose fat
• My project milestones: Started in January, MVP in March, Beta in June..."
                  className="w-full h-40 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                />
                <div className="absolute bottom-3 right-3 text-xs text-gray-400 dark:text-gray-500">
                  {prompt.length}/2000
                </div>
              </div>

              <AIPromptExamples onSelect={handleExampleClick} />

              <button
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                className="w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                <Wand2 size={18} />
                Generate Timeline
              </button>
            </div>
          )}

          {/* Loading State */}
          {modalState === "loading" && (
            <div className="p-6">
              <AILoadingAnimation prompt={prompt} />
            </div>
          )}

          {/* Preview State */}
          {modalState === "preview" && generatedTimeline && (
            <div className="p-6 space-y-4">
              <AIGeneratedPreview timeline={generatedTimeline} />

              <div className="flex gap-3">
                <button
                  onClick={handleRetry}
                  className="flex-1 py-3 px-4 rounded-xl font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                >
                  Regenerate
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 py-3 px-4 rounded-xl font-medium border border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-all flex items-center justify-center gap-2"
                >
                  <Calendar size={18} />
                  View on Timeline
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!isSignedIn}
                  className="flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg hover:shadow-xl"
                >
                  <CheckCircle2 size={18} />
                  {isSignedIn ? "Create Timeline" : "Sign in to Save"}
                </button>
              </div>
            </div>
          )}

          {/* Saving State */}
          {modalState === "saving" && (
            <div className="p-6 flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Creating your timeline...
              </p>
            </div>
          )}

          {/* Error State */}
          {modalState === "error" && (
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                <AlertCircle
                  className="text-red-500 flex-shrink-0 mt-0.5"
                  size={20}
                />
                <div>
                  <p className="font-medium text-red-600 dark:text-red-400">
                    Something went wrong
                  </p>
                  <p className="text-sm text-red-500/80 dark:text-red-400/70 mt-1">
                    {error}
                  </p>
                </div>
              </div>
              <button
                onClick={handleRetry}
                className="w-full py-3 px-4 rounded-xl font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Success State */}
          {modalState === "success" && (
            <div className="p-6 flex flex-col items-center justify-center py-16">
              <div className="p-4 rounded-full bg-emerald-500/20">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              </div>
              <p className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                Timeline Created!
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                Redirecting to your new timeline...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
