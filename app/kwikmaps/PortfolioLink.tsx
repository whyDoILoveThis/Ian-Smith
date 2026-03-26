"use client";
import Link from "next/link";
import React from "react";
import {
  ItsTaglineRenderer,
  ItsTagline,
  ItsTaglineGroup,
  useAiRewordGroup,
} from "@/components/ItsToastRenderer";
import ReportBug from "@/components/KwikMaps/components/ReportBug";

export const TinyFeedbackBtn = ({
  onClick,
  setFeedbackOpen,
}: {
  onClick?: () => void;
  setFeedbackOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}) => (
  <button
    className="btn btn-squish btn-blue ml-1"
    onClick={() => {
      if (setFeedbackOpen !== null && setFeedbackOpen !== undefined)
        setFeedbackOpen(true);
    }}
  >
    Feedback
  </button>
);

const PortfolioLink = () => {
  const [hovered, setHovered] = React.useState(false);
  const [feedbackOpen, setFeedbackOpen] = React.useState(false);

  const { texts, rewordAll } = useAiRewordGroup([
    "👋 Hi there! I worked very hard on this project!",
    "It would mean a great deal if you took a sec to leave feedback! 😁",
    "Press the feedback button, and type anything you like — even just a single emoji!",
    "Your input helps me improve and decide what to build next. Thanks a ton! 🙏",
  ]);

  // Reword all taglines each time the renderer loops
  const handleLoopCycle = React.useCallback(() => {
    rewordAll([18, 18, 18, 18]);
  }, [rewordAll]);

  return (
    <article
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
      }}
      className="relative flex justify-center w-full text-center text-xs bg-slate-100 dark:bg-slate-800/80"
    >
      {/* Hidden sizer — keeps the container tall enough for the longest tagline text */}
      <div aria-hidden className="invisible px-4 py-1.5 text-xs leading-snug">
        {texts.reduce((a, b) => (a.length >= b.length ? a : b), "")}
      </div>
      <ReportBug open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <Link
        href="/"
        className="absolute inset-0 flex items-center justify-center gap-1"
      >
        <span
          className={`inline-block transition-all duration-200  text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ${hovered ? "-translate-x-1" : ""}`}
        >
          ←
        </span>{" "}
        Ian&apos;s Portfolio Home
      </Link>
      <ItsTaglineRenderer
        intervals={[10000, 15000]}
        className="absolute inset-0 z-10"
        loop
        onComplete={handleLoopCycle}
      >
        <ItsTaglineGroup intervals={[3000, 6000, 6000, 6000]}>
          <ItsTagline
            text={texts[0]}
            className="text-xs border-b border-blue-500 bg-blue-600/20 rounded-sm text-slate-600 dark:text-slate-300 backdrop-blur-md"
          />
          <ItsTagline
            dontCloseIfHovered
            className="text-xs p-1 pr-4 border-b border-blue-500 bg-blue-600/20 rounded-sm text-slate-600 dark:text-slate-300 backdrop-blur-md"
          >
            {texts[1]}
            <TinyFeedbackBtn setFeedbackOpen={setFeedbackOpen} />
          </ItsTagline>
          <ItsTagline
            dontCloseIfHovered
            className="p-1 pr-4 text-xs border-b border-blue-500 bg-blue-600/20 rounded-sm text-slate-600 dark:text-slate-300 backdrop-blur-md"
          >
            {texts[2]}
            <TinyFeedbackBtn setFeedbackOpen={setFeedbackOpen} />
          </ItsTagline>
          <ItsTagline
            dontCloseIfHovered
            className="text-xs p-1 pr-4 border-b border-blue-500 bg-blue-600/20 rounded-sm text-slate-600 dark:text-slate-300 backdrop-blur-md"
          >
            {texts[3]}
            <TinyFeedbackBtn setFeedbackOpen={setFeedbackOpen} />
          </ItsTagline>
        </ItsTaglineGroup>
        <ItsTaglineGroup
          className="border-b border-purple-500 bg-purple-600/20 rounded-sm text-slate-600 dark:text-slate-300 backdrop-blur-md"
          intervals={[4000, 7000]}
          dontCloseIfHovered
        >
          <ItsTagline
            dontCloseIfHovered
            duration={3500}
            className="text-xs p-1 pr-4 "
          >
            <Link
              href="/"
              className="w-full flex justify-center items-center h-full"
            >
              ✨ Check out my other projects!
            </Link>
          </ItsTagline>
          <ItsTagline duration={3000} className="text-xs ">
            <Link
              href="/"
              className="w-full flex justify-center items-center h-full"
            >
              {" "}
              ← Back to Portfolio Home{" "}
            </Link>
          </ItsTagline>
        </ItsTaglineGroup>
      </ItsTaglineRenderer>
    </article>
  );
};

export default PortfolioLink;
