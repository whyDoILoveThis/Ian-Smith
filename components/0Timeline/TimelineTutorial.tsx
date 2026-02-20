// components/0Timeline/TimelineTutorial.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import TimelineHoverCard from "./TimelineHoverCard";

type CursorType = "drag" | "scroll" | "click" | "double-click" | "hover";

/** Steps that target buttons in the header (hidden inside mobile dropdown) */
const HEADER_BUTTON_STEP_IDS = new Set([
  "timelines",
  "users",
  "ai",
  "today",
  "first-last",
  "show-all",
]);

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  selector?: string; // CSS selector to find the element
  fallbackArea?: { top: number; left: number; width: number; height: number }; // Percentage-based fallback
  cursorType: CursorType;
  dragOffset?: { x: number; y: number }; // For drag animations
  tip?: string;
  showFakeNode?: boolean; // Show a temporary node under the cursor
  mobileDescription?: string; // Alternate description for mobile
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "drag",
    title: "Drag to Pan Through Time",
    description:
      "Click and hold, then drag left or right to navigate through the timeline. Release quickly for momentum!",
    fallbackArea: { top: 30, left: 5, width: 90, height: 55 },
    cursorType: "drag",
    dragOffset: { x: -300, y: 0 },
  },
  {
    id: "zoom",
    title: "Scroll to Zoom In & Out",
    description:
      "Hold Alt and use your mouse wheel to zoom in and out. Zooming centers on your cursor position.",
    fallbackArea: { top: 30, left: 15, width: 70, height: 55 },
    cursorType: "scroll",
    tip: "Alt + Scroll Wheel to zoom",
    mobileDescription:
      "Pinch with two fingers to zoom in and out. Zooming centers between your fingers.",
  },
  {
    id: "timelines",
    title: "Switch Between Timelines",
    description:
      "Click the timeline button to see all available timelines, create new ones, or preview nodes.",
    selector: '[aria-label="Open timelines"]',
    cursorType: "click",
    tip: "Use the 👁️ icon to preview without switching",
    mobileDescription:
      "Tap the timeline button in the menu to see all available timelines, create new ones, or preview nodes.",
  },
  {
    id: "users",
    title: "Explore Other Users",
    description:
      "Browse timelines created by other people. Get inspired by their nodes and stories!",
    selector: '[aria-label="Browse users"]',
    cursorType: "click",
    mobileDescription:
      "Tap the Users button in the menu to browse timelines from other people.",
  },
  {
    id: "ai",
    title: "AI Timeline Generator",
    description:
      "Generate entire timelines from a text prompt! Just describe a topic and AI creates the nodes.",
    selector: '[aria-label="Generate timeline with AI"]',
    cursorType: "click",
    tip: 'Try: "History of space exploration"',
    mobileDescription:
      "Tap the AI button in the menu to generate entire timelines from a text prompt!",
  },
  {
    id: "today",
    title: "Jump to Today",
    description: "Instantly center the timeline on today's date.",
    selector: '[aria-label="Jump to today"]',
    cursorType: "click",
    mobileDescription:
      "Tap 'Today' in the menu to instantly center the timeline on today's date.",
  },
  {
    id: "first-last",
    title: "Jump to First or Last Node",
    description:
      "Quickly navigate to the earliest or most recent node on your timeline.",
    selector: '[aria-label="Jump to first node"]',
    cursorType: "click",
    mobileDescription:
      "Tap 'First' or 'Last' in the menu to quickly jump to the earliest or most recent node.",
  },
  {
    id: "create",
    title: "Click the Timeline to Create Nodes",
    description:
      "Click on the horizontal timeline line to add a new node at that date. A form will appear to fill in the details.",
    selector: "[data-timeline-line]",
    cursorType: "click",
    tip: "You must be signed in to create nodes",
    mobileDescription:
      "Tap on the horizontal timeline line to add a new node at that date. A form will appear to fill in the details.",
  },
  {
    id: "view",
    title: "Hover Nodes to See Details",
    description:
      "Hover over any node dot to see a preview card. Click the expand button to see full details with images.",
    selector: "[data-timeline-line]",
    cursorType: "hover",
    showFakeNode: true,
    mobileDescription:
      "Tap on any node dot to see a preview card. Tap the expand button to see full details with images.",
  },
  {
    id: "show-all",
    title: "Show All Node Cards",
    description:
      "Toggle to display all node cards at once, or hide them to see just the dots.",
    selector: "[aria-pressed]",
    cursorType: "click",
    mobileDescription:
      "Tap 'Show All' in the menu to display all node cards at once, or hide them to see just the dots.",
  },
];

interface TimelineTutorialProps {
  onClose: () => void;
}

export default function TimelineTutorial({ onClose }: TimelineTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const mobileMenuOpenRef = useRef(false);

  // Detect mobile (matches Tailwind md: breakpoint)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Signal to other components (e.g. ItsDropdown) that tutorial is active
  useEffect(() => {
    document.body.dataset.tutorialActive = "true";
    return () => {
      delete document.body.dataset.tutorialActive;
    };
  }, []);

  // For the hover demo - ghost hover cycles, but real hover overrides
  const [ghostHovered, setGhostHovered] = useState(false);
  const [realHovered, setRealHovered] = useState(false);
  const [sampleNodeExpanded, setSampleNodeExpanded] = useState(false);
  const ghostCycleRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const ghostIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const step = TUTORIAL_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TUTORIAL_STEPS.length - 1;

  // Ghost hover animation cycle for the hover step - synced with hoverMove animation
  // Restarts from scratch whenever real hover releases so CSS + JS stay in sync
  const startGhostCycle = useCallback(() => {
    // Clear any existing timers
    ghostCycleRef.current.forEach((t) => clearTimeout(t));
    ghostCycleRef.current = [];
    if (ghostIntervalRef.current) clearInterval(ghostIntervalRef.current);

    const cycle = () => {
      const t1 = setTimeout(() => setGhostHovered(true), 1000);
      const t2 = setTimeout(() => setGhostHovered(false), 3000);
      ghostCycleRef.current = [t1, t2];
    };

    cycle();
    ghostIntervalRef.current = setInterval(cycle, 4000);
  }, []);

  useEffect(() => {
    if (step.id !== "view") {
      setGhostHovered(false);
      ghostCycleRef.current.forEach((t) => clearTimeout(t));
      if (ghostIntervalRef.current) clearInterval(ghostIntervalRef.current);
      return;
    }

    if (!realHovered) {
      // (Re)start the ghost cycle and reset the CSS animation so they stay in sync
      setAnimKey((k) => k + 1);
      startGhostCycle();
    } else {
      // Pause the ghost cycle while the user is truly hovering
      ghostCycleRef.current.forEach((t) => clearTimeout(t));
      if (ghostIntervalRef.current) clearInterval(ghostIntervalRef.current);
      setGhostHovered(false);
    }

    return () => {
      ghostCycleRef.current.forEach((t) => clearTimeout(t));
      if (ghostIntervalRef.current) clearInterval(ghostIntervalRef.current);
    };
  }, [step.id, realHovered, startGhostCycle]);

  // Determine if the sample node should show its card
  const showSampleCard = realHovered || ghostHovered;

  // Find and measure the target element
  const updateHighlight = useCallback(() => {
    const needsMobileMenu = isMobile && HEADER_BUTTON_STEP_IDS.has(step.id);

    if (needsMobileMenu) {
      // On mobile, ensure the dropdown is open so buttons are visible
      const trigger = document.querySelector(
        "[data-tutorial-mobile-trigger]",
      ) as HTMLElement | null;

      if (trigger) {
        // Check if the dropdown menu is currently visible
        const dropdown = trigger.closest(".relative.inline-block");
        const menu = dropdown?.querySelector(
          '[role="menu"]',
        ) as HTMLElement | null;
        const isOpen =
          menu &&
          !menu.classList.contains("pointer-events-none") &&
          menu.classList.contains("opacity-100");

        if (!isOpen && !mobileMenuOpenRef.current) {
          // Click the trigger to open it
          trigger.click();
          mobileMenuOpenRef.current = true;
          // Wait for animation, then re-measure
          setTimeout(() => updateHighlight(), 250);
          return;
        }

        // Now find the actual target button inside the open dropdown
        if (step.selector) {
          // Search inside the dropdown content specifically
          const el = menu?.querySelector(step.selector) as HTMLElement | null;
          if (el) {
            const rect = el.getBoundingClientRect();
            const paddingX = 8;
            const paddingY = 6;
            setHighlightRect(
              new DOMRect(
                rect.left - paddingX,
                rect.top - paddingY,
                rect.width + paddingX * 2,
                rect.height + paddingY * 2,
              ),
            );
            return;
          }
        }
      }

      // Fallback: highlight the hamburger menu itself if we can't find the button
      if (trigger) {
        const rect = trigger.getBoundingClientRect();
        const pad = 8;
        setHighlightRect(
          new DOMRect(
            rect.left - pad,
            rect.top - pad,
            rect.width + pad * 2,
            rect.height + pad * 2,
          ),
        );
        return;
      }
    } else {
      // Not a mobile-menu step: close the dropdown if we opened it
      if (isMobile && mobileMenuOpenRef.current) {
        const trigger = document.querySelector(
          "[data-tutorial-mobile-trigger]",
        ) as HTMLElement | null;
        if (trigger) {
          const dropdown = trigger.closest(".relative.inline-block");
          const menu = dropdown?.querySelector(
            '[role="menu"]',
          ) as HTMLElement | null;
          const isOpen =
            menu &&
            !menu.classList.contains("pointer-events-none") &&
            menu.classList.contains("opacity-100");
          if (isOpen) {
            trigger.click(); // close
          }
        }
        mobileMenuOpenRef.current = false;
      }
    }

    // Desktop path (or non-header-button steps on mobile)
    if (step.selector) {
      const el = document.querySelector(step.selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        // Add padding around the element - more for timeline line
        const isTimelineLine = step.selector === "[data-timeline-line]";
        const paddingX = isTimelineLine ? 40 : 8;
        const paddingY = isTimelineLine ? 80 : 8; // Much larger vertical padding for the thin line
        const padded = new DOMRect(
          rect.left - paddingX,
          rect.top - paddingY,
          rect.width + paddingX * 2,
          rect.height + paddingY * 2,
        );
        setHighlightRect(padded);
        return;
      }
    }
    // Use fallback area (percentage-based)
    if (step.fallbackArea) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setHighlightRect(
        new DOMRect(
          (step.fallbackArea.left / 100) * vw,
          (step.fallbackArea.top / 100) * vh,
          (step.fallbackArea.width / 100) * vw,
          (step.fallbackArea.height / 100) * vh,
        ),
      );
    }
  }, [step, isMobile]);

  useEffect(() => {
    updateHighlight();
    setAnimKey((k) => k + 1);

    // Recalculate on resize
    window.addEventListener("resize", updateHighlight);
    return () => window.removeEventListener("resize", updateHighlight);
  }, [currentStep, updateHighlight]);

  // Clean up mobile menu on close
  const handleClose = useCallback(() => {
    if (mobileMenuOpenRef.current) {
      const trigger = document.querySelector(
        "[data-tutorial-mobile-trigger]",
      ) as HTMLElement | null;
      if (trigger) {
        const dropdown = trigger.closest(".relative.inline-block");
        const menu = dropdown?.querySelector(
          '[role="menu"]',
        ) as HTMLElement | null;
        const isOpen =
          menu &&
          !menu.classList.contains("pointer-events-none") &&
          menu.classList.contains("opacity-100");
        if (isOpen) trigger.click();
      }
      mobileMenuOpenRef.current = false;
    }
    onClose();
  }, [onClose]);

  const handleNext = () => {
    if (isLast) {
      handleClose();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "Enter") handleNext();
    else if (e.key === "ArrowLeft") handlePrev();
    else if (e.key === "Escape") handleClose();
  };

  // Calculate cursor position (center of highlight)
  const cursorX = highlightRect
    ? highlightRect.left + highlightRect.width / 2
    : 0;
  const cursorY = highlightRect
    ? highlightRect.top + highlightRect.height / 2
    : 0;

  // For hover step, the ghost cursor should animate to/from the sample node position
  // Sample node is at cursorX, cursorY - ghost starts offset and moves to it
  const sampleNodeX = cursorX;
  const sampleNodeY = cursorY;

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] pointer-events-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      autoFocus
    >
      {/* Overlay panels that leave a hole for interaction */}
      {highlightRect && (
        <>
          {/* Top panel */}
          <div
            className="absolute left-0 right-0 top-0 bg-black/85 pointer-events-auto"
            style={{ height: highlightRect.top }}
          />
          {/* Bottom panel */}
          <div
            className="absolute left-0 right-0 bottom-0 bg-black/85 pointer-events-auto"
            style={{ top: highlightRect.bottom }}
          />
          {/* Left panel */}
          {currentStep !== 8 && currentStep !== 7 && (
            <div
              className="absolute left-0 bg-black/85 pointer-events-auto"
              style={{
                top: highlightRect.top,
                width: highlightRect.left,
                height: highlightRect.height,
              }}
            />
          )}
          {/* Right panel */}
          <div
            className="absolute right-0 bg-black/85 pointer-events-auto"
            style={{
              top: highlightRect.top,
              left: highlightRect.right,
              height: highlightRect.height,
            }}
          />
        </>
      )}
      {/* Fallback full overlay when no highlight */}
      {!highlightRect && (
        <div className="absolute inset-0 bg-black/85 pointer-events-auto" />
      )}

      {/* Highlight border with glow */}
      {highlightRect && (
        <div
          className="absolute pointer-events-none rounded-xl border-2 border-cyan-400 transition-all duration-300 ease-out"
          style={{
            left: highlightRect.left,
            top: highlightRect.top,
            width: highlightRect.width,
            height: highlightRect.height,
            boxShadow:
              "0 0 20px 4px rgba(6, 182, 212, 0.4), inset 0 0 20px 2px rgba(6, 182, 212, 0.1)",
          }}
        />
      )}

      {/* Ghost Cursor */}
      {highlightRect && (
        <div
          key={animKey}
          className="absolute pointer-events-none z-[103]"
          style={{
            left: step.showFakeNode ? sampleNodeX : cursorX,
            top: step.showFakeNode ? sampleNodeY : cursorY,
            animation: getCursorAnimation(step.cursorType, step.dragOffset),
          }}
        >
          {/* Cursor SVG */}
          <div
            className="relative"
            style={{ transform: "translate(-3px, -2px)" }}
          >
            <svg
              width="28"
              height="32"
              viewBox="0 0 24 28"
              className="drop-shadow-lg"
              style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.4))" }}
            >
              <path
                d="M5 2v20l5-5h9L5 2z"
                fill="white"
                stroke="#0e7490"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>

            {/* Click indicator */}
            {(step.cursorType === "click" ||
              step.cursorType === "double-click") && (
              <div
                className="absolute top-0 left-0"
                style={{
                  animation:
                    step.cursorType === "double-click"
                      ? "clickPulse 2s ease-in-out infinite"
                      : "clickPulse 2.5s ease-in-out infinite",
                }}
              >
                <div
                  className="w-10 h-10 rounded-full border-2 border-cyan-400 bg-cyan-400/20"
                  style={{ transform: "translate(0px, -8px)" }}
                />
              </div>
            )}

            {/* Scroll wheel indicator */}
            {step.cursorType === "scroll" && (
              <div
                className="absolute"
                style={{
                  left: "20px",
                  top: "10px",
                  animation: "scrollBounce 1.5s ease-in-out infinite",
                }}
              >
                <div className="w-6 h-10 rounded-full border-2 border-white bg-black/30 flex items-start justify-center pt-2">
                  <div
                    className="w-1.5 h-3 rounded-full bg-white"
                    style={{
                      animation: "scrollWheel 1.5s ease-in-out infinite",
                    }}
                  />
                </div>
                <div className="text-white text-xs mt-1 font-medium text-center">
                  ↕
                </div>
              </div>
            )}

            {/* Drag trail indicator */}
            {step.cursorType === "drag" && (
              <div
                className="absolute top-4 left-4 flex items-center gap-1"
                style={{ animation: "fadeInOut 2.5s ease-in-out infinite" }}
              >
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-cyan-400"
                    style={{ opacity: 1 - i * 0.2 }}
                  />
                ))}
                <span className="ml-2 text-white text-xs font-medium whitespace-nowrap">
                  drag
                </span>
              </div>
            )}

            {/* Double-click label */}
            {step.cursorType === "double-click" && (
              <div
                className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap"
                style={{ animation: "fadeInOut 2s ease-in-out infinite" }}
              >
                <span className="text-cyan-300 text-xs font-bold">× 2</span>
              </div>
            )}

            {/* Hover indicator label only - node is rendered separately */}
            {step.cursorType === "hover" && (
              <div className="absolute top-10 left-6 pointer-events-none">
                <div className="flex items-center gap-2 px-2 py-1 rounded bg-black/70 border border-white/20">
                  <div
                    className={`w-2 h-2 rounded-full transition-colors ${showSampleCard ? "bg-green-400" : "bg-cyan-400"}`}
                  />
                  <span className="text-white text-xs font-medium">
                    {showSampleCard ? "hovered!" : "hover"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sample node for hover demo - positioned separately on the timeline */}
      {highlightRect && step.showFakeNode && (
        <div
          className="absolute pointer-events-auto z-[102]"
          style={{
            left: sampleNodeX,
            top: sampleNodeY,
          }}
          onMouseEnter={() => setRealHovered(true)}
          onMouseLeave={() => setRealHovered(false)}
        >
          {/* Main node dot */}
          <div
            className="w-4 h-4 rounded-full bg-cyan-500 ring-1 ring-neutral-700 shadow-lg cursor-pointer hover:scale-110 transition-transform"
            style={{ transform: "translate(-8px, -8px)" }}
          />

          {/* Vertical line going up - only shows when hovered */}
          <div
            className={`absolute left-0 -translate-x-1/2 transition-all duration-300 origin-bottom ${
              showSampleCard ? "opacity-100" : "opacity-0"
            }`}
            style={{
              bottom: "8px",
              height: showSampleCard ? "80px" : "0px",
              width: "2px",
              backgroundColor: "#06b6d4",
            }}
          />

          {/* Top circle at end of line - only shows when hovered */}
          <div
            className={`absolute left-0 -translate-x-1/2 w-3 h-3 rounded-full border border-neutral-900 shadow-lg transition-all duration-300 ${
              showSampleCard ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            style={{
              bottom: showSampleCard ? "82px" : "8px",
              backgroundColor: "#06b6d4",
            }}
          />

          {/* Hover card above the line - only shows when hovered */}
          <div
            className={`absolute left-0 -translate-x-1/2 transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] origin-bottom ${
              showSampleCard
                ? "scale-y-100 opacity-100"
                : "scale-y-95 opacity-0 pointer-events-none"
            }`}
            style={{
              bottom: "96px",
            }}
          >
            <TimelineHoverCard
              event={{
                title: "Sample Node",
                description:
                  "This is an example description that shows on hover. You can hover the truncated text to expand it!",
                dateMs: Date.now(),
              }}
              onExpand={() => setSampleNodeExpanded(true)}
            />
          </div>
        </div>
      )}

      {/* Expanded sample node modal */}
      {sampleNodeExpanded && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 pointer-events-auto"
          onClick={() => setSampleNodeExpanded(false)}
        >
          <div
            className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Sample Node</h3>
              <button
                onClick={() => setSampleNodeExpanded(false)}
                className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-neutral-300 mb-4">
              This is an example description that shows on hover. You can hover
              the truncated text to expand it!
            </p>
            <div className="text-xs text-neutral-500">
              {new Date().toLocaleString()}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-green-400 text-sm">
                ✓ Great! You expanded the node card. In a real timeline, this
                would show the full node with images and more details.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info Card - smart positioning to never cover the highlight */}
      <div
        className="fixed left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-[102] pointer-events-auto"
        style={(() => {
          if (!highlightRect) return { bottom: "32px", top: "auto" };
          const vh = window.innerHeight;
          const cardH = 300; // approximate max card height
          const gap = 16;
          const spaceBelow = vh - highlightRect.bottom;
          const spaceAbove = highlightRect.top;
          // Prefer bottom, but only if the card won't overlap the highlight
          if (spaceBelow >= cardH + gap) return { bottom: "32px", top: "auto" };
          if (spaceAbove >= cardH + gap) return { top: "32px", bottom: "auto" };
          // Neither side has enough room – pick whichever has more room
          return spaceBelow >= spaceAbove
            ? { bottom: "32px", top: "auto" }
            : { top: "32px", bottom: "auto" };
        })()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-neutral-900/95 to-neutral-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-neutral-600 overflow-hidden">
          {/* Progress bar */}
          <div className="h-1.5 bg-neutral-700">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-500 ease-out"
              style={{
                width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%`,
              }}
            />
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>

          <div className="p-6">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-medium">
                {currentStep + 1} / {TUTORIAL_STEPS.length}
              </span>
              <div className="flex-1 h-px bg-neutral-700" />
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-white mb-2">{step.title}</h2>

            {/* Description */}
            <p className="text-neutral-300 text-sm leading-relaxed mb-4">
              {isMobile && step.mobileDescription
                ? step.mobileDescription
                : step.description}
            </p>

            {/* Mobile menu hint for header button steps */}
            {isMobile && HEADER_BUTTON_STEP_IDS.has(step.id) && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20 mb-4">
                <span className="text-violet-400 text-sm">📱</span>
                <span className="text-violet-200 text-sm">
                  Open the ☰ menu button to find this option
                </span>
              </div>
            )}

            {/* Tip */}
            {step.tip && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
                <span className="text-amber-400 text-sm">💡</span>
                <span className="text-amber-200 text-sm">
                  {isMobile && step.id === "zoom"
                    ? "Pinch with two fingers to zoom"
                    : step.tip}
                </span>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handlePrev}
                disabled={isFirst}
                className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isFirst
                    ? "text-neutral-600 cursor-not-allowed"
                    : "text-neutral-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <ChevronLeft size={16} />
                Back
              </button>

              {/* Dot indicators */}
              <div className="flex items-center gap-1.5">
                {TUTORIAL_STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === currentStep
                        ? "w-6 bg-gradient-to-r from-cyan-400 to-violet-400"
                        : i < currentStep
                          ? "w-2 bg-cyan-600"
                          : "w-2 bg-neutral-600 hover:bg-neutral-500"
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white transition-all shadow-lg shadow-cyan-500/20"
              >
                {isLast ? "Finish" : "Next"}
                {!isLast && <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes dragMove {
          0%, 10% { 
            transform: translate(0, 0); 
          }
          15% { 
            transform: translate(0, 2px); 
          }
          20%, 80% { 
            transform: translate(var(--drag-x, -200px), var(--drag-y, 0)); 
          }
          85% { 
            transform: translate(var(--drag-x, -200px), calc(var(--drag-y, 0) - 2px)); 
          }
          90%, 100% { 
            transform: translate(0, 0); 
          }
        }
        
        @keyframes clickPulse {
          0%, 40%, 100% { 
            opacity: 0;
            transform: translate(-16px, -16px) scale(0.5);
          }
          50% { 
            opacity: 1;
            transform: translate(-16px, -16px) scale(1);
          }
          70% { 
            opacity: 0;
            transform: translate(-16px, -16px) scale(1.5);
          }
        }
        
        @keyframes scrollWheel {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }
        
        @keyframes scrollBounce {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-4px); }
          75% { transform: translateY(4px); }
        }
        
        @keyframes hoverPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes hoverMove {
          0%, 10% { 
            transform: translate(40px, 20px);
          }
          25%, 75% { 
            transform: translate(0px, 0px);
          }
          90%, 100% { 
            transform: translate(40px, 20px);
          }
        }
        
        @keyframes fadeInOut {
          0%, 20%, 80%, 100% { opacity: 0; }
          30%, 70% { opacity: 1; }
        }
        
        @keyframes nodeGlow {
          0%, 100% { 
            box-shadow: 0 0 8px 2px rgba(6, 182, 212, 0.5);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 16px 4px rgba(6, 182, 212, 0.8);
            transform: scale(1.1);
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
}

function getCursorAnimation(
  type: CursorType,
  dragOffset?: { x: number; y: number },
): string {
  const duration = type === "double-click" ? "2s" : "2.5s";

  switch (type) {
    case "drag":
      return `dragMove ${duration} ease-in-out infinite`;
    case "click":
    case "double-click":
      return `hoverPulse ${duration} ease-in-out infinite`;
    case "scroll":
      return `hoverPulse 3s ease-in-out infinite`;
    case "hover":
      return `hoverMove 4s ease-in-out infinite`;
    default:
      return "";
  }
}

// Inject CSS variables for drag offset
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `:root { --drag-x: -200px; --drag-y: 0; }`;
  document.head.appendChild(style);
}
