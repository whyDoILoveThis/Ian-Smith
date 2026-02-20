"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { HelpCircle, CheckCircle2, XCircle } from "lucide-react";

/* ===================================================================
   DEMO DATA – fake quiz questions for the interactive preview
   =================================================================== */

interface DemoQuestion {
  id: number;
  type: "true-false" | "multiple-choice" | "typed";
  question: string;
  options: string[];
  correctAnswer: string;
}

const DEMO_QUESTIONS: DemoQuestion[] = [
  {
    id: 1,
    type: "multiple-choice",
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctAnswer: "Mars",
  },
  {
    id: 2,
    type: "true-false",
    question:
      "The Great Wall of China is visible from space with the naked eye.",
    options: ["True", "False"],
    correctAnswer: "False",
  },
  {
    id: 3,
    type: "multiple-choice",
    question: "What is the time complexity of binary search?",
    options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
    correctAnswer: "O(log n)",
  },
  {
    id: 4,
    type: "multiple-choice",
    question: "Which element has the chemical symbol 'Au'?",
    options: ["Silver", "Aluminum", "Gold", "Argon"],
    correctAnswer: "Gold",
  },
  {
    id: 5,
    type: "true-false",
    question: "TypeScript is a superset of JavaScript.",
    options: ["True", "False"],
    correctAnswer: "True",
  },
];

/* Demo preset topics */
const DEMO_PRESETS = [
  { label: "General Science", icon: "🔬" },
  { label: "Computer Science", icon: "💻" },
  { label: "World Geography", icon: "🌍" },
  { label: "Music Theory", icon: "🎵" },
  { label: "Mathematics", icon: "📐" },
  { label: "History", icon: "📜" },
];

/* ===================================================================
   Quiz type badge config
   =================================================================== */

function getTypeConfig(type: string) {
  switch (type) {
    case "true-false":
      return {
        label: "True or False",
        gradient: "from-blue-500 to-blue-600",
        bg: "bg-blue-500/10 border-blue-500/20",
        text: "text-blue-400",
        dotColor: "bg-blue-500",
      };
    case "multiple-choice":
      return {
        label: "Multiple Choice",
        gradient: "from-emerald-500 to-emerald-600",
        bg: "bg-emerald-500/10 border-emerald-500/20",
        text: "text-emerald-400",
        dotColor: "bg-emerald-500",
      };
    case "typed":
      return {
        label: "Type Your Answer",
        gradient: "from-violet-500 to-violet-600",
        bg: "bg-violet-500/10 border-violet-500/20",
        text: "text-violet-400",
        dotColor: "bg-violet-500",
      };
    default:
      return {
        label: type,
        gradient: "from-gray-500 to-gray-600",
        bg: "bg-gray-500/10 border-gray-500/20",
        text: "text-gray-400",
        dotColor: "bg-gray-500",
      };
  }
}

/* ===================================================================
   Feature badge (same style as TimelineShowcase)
   =================================================================== */

function FeatureBadge({
  icon,
  label,
  delay,
}: {
  icon: string;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/10 backdrop-blur-sm"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.45 }}
    >
      <span className="text-base">{icon}</span>
      <span className="text-sm font-medium text-white/70">{label}</span>
    </motion.div>
  );
}

/* ===================================================================
   Floating particles (purple/blue tint for quiz theme)
   =================================================================== */

function useFloatingParticles(count = 14) {
  const [particles, setParticles] = useState<
    {
      id: number;
      x: number;
      delay: number;
      duration: number;
      size: number;
      opacity: number;
    }[]
  >([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 8,
        duration: 12 + Math.random() * 10,
        size: 2 + Math.random() * 4,
        opacity: 0.15 + Math.random() * 0.2,
      })),
    );
  }, [count]);

  return particles;
}

/* ===================================================================
   Demo phase type
   =================================================================== */

type DemoPhase = "setup" | "generating" | "question" | "result";

/* ===================================================================
   MAIN SHOWCASE
   =================================================================== */

export default function ItsQuizMeShowcase() {
  const particles = useFloatingParticles(12);

  /* -- Demo state machine -- */
  const [phase, setPhase] = useState<DemoPhase>("setup");
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* -- Auto-cycle the setup preset selection -- */
  const presetCycleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase !== "setup") return;
    presetCycleRef.current = setInterval(() => {
      setSelectedPreset((p) => (p + 1) % DEMO_PRESETS.length);
    }, 2000);
    return () => {
      if (presetCycleRef.current) clearInterval(presetCycleRef.current);
    };
  }, [phase]);

  /* -- Generate button handler -- */
  const handleGenerate = useCallback(() => {
    setPhase("generating");
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    phaseTimerRef.current = setTimeout(() => {
      setPhase("question");
      setCurrentQuestion(0);
      setAnswers({});
    }, 2200);
  }, []);

  /* -- Answer selection -- */
  const handleSelectAnswer = useCallback(
    (answer: string) => {
      setAnswers((prev) => ({ ...prev, [currentQuestion]: answer }));
    },
    [currentQuestion],
  );

  /* -- Navigation -- */
  const handleNext = useCallback(() => {
    if (currentQuestion < DEMO_QUESTIONS.length - 1) {
      setCurrentQuestion((i) => i + 1);
    }
  }, [currentQuestion]);

  const handlePrevious = useCallback(() => {
    if (currentQuestion > 0) {
      setCurrentQuestion((i) => i - 1);
    }
  }, [currentQuestion]);

  /* -- Submit quiz -- */
  const handleSubmit = useCallback(() => {
    setPhase("result");
  }, []);

  /* -- Reset demo -- */
  const handleReset = useCallback(() => {
    setPhase("setup");
    setCurrentQuestion(0);
    setAnswers({});
  }, []);

  /* -- Cleanup -- */
  useEffect(() => {
    return () => {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    };
  }, []);

  /* -- Score calculation for results -- */
  const correctCount = DEMO_QUESTIONS.filter(
    (dq, i) => answers[i] === dq.correctAnswer,
  ).length;
  const scorePercent = Math.round((correctCount / DEMO_QUESTIONS.length) * 100);

  const q = DEMO_QUESTIONS[currentQuestion];
  const currentAnswer = q ? (answers[currentQuestion] ?? null) : null;
  const typeConfig = q
    ? getTypeConfig(q.type)
    : getTypeConfig("multiple-choice");

  return (
    <section className="relative w-full max-w-5xl mx-auto my-24 px-4">
      {/* -- Background glow -- */}
      <div className="absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, #8b5cf6 0%, #6366f1 40%, transparent 70%)",
          }}
        />
      </div>

      {/* -- Floating particles -- */}
      <div className="absolute inset-0 -z-5 overflow-hidden rounded-3xl pointer-events-none">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              bottom: -10,
              width: p.size,
              height: p.size,
              background: `radial-gradient(circle, rgba(139,92,246,${p.opacity}) 0%, transparent 70%)`,
            }}
            animate={{
              y: [0, -600],
              opacity: [0, p.opacity, p.opacity * 0.8, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* -- Card -- */}
      <motion.div
        className="relative z-10 rounded-3xl border border-white/10 overflow-clip
          bg-gradient-to-b from-white/[0.06] to-white/[0.02]
          backdrop-blur-xl shadow-2xl shadow-purple-500/5"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-t-3xl" />

        <div className="p-8 md:p-12 lg:p-16">
          {/* -- Header row -- */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
            <div className="max-w-md flex-shrink-0">
              <motion.span
                className="inline-block px-3 py-1 mb-4 rounded-full text-xs font-semibold uppercase tracking-wider
                  bg-purple-500/20 text-purple-300 border border-purple-500/30"
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 }}
              >
                AI-Powered
              </motion.span>

              <motion.h2
                className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight
                  bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                ItsQuizMe
              </motion.h2>

              <motion.p
                className="mt-4 text-base md:text-lg text-white/50 leading-relaxed"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                Generate{" "}
                <span className="text-white/70 font-semibold">
                  AI-powered quizzes
                </span>{" "}
                on any topic instantly. Features multiple question types,{" "}
                <span className="text-white/70 font-semibold">
                  adaptive difficulty
                </span>
                , self-assessment mode, and detailed AI feedback on every
                answer.
              </motion.p>

              <div className="flex flex-wrap gap-2 mt-6">
                <FeatureBadge icon="🧠" label="AI Generated" delay={0.35} />
                <FeatureBadge icon="📝" label="3 Question Types" delay={0.4} />
                <FeatureBadge icon="🎯" label="AI Grading" delay={0.45} />
                <FeatureBadge icon="⚙️" label="Customizable" delay={0.5} />
              </div>
            </div>
          </div>

          {/* -- Interactive Quiz Demo -- */}
          <motion.div
            className="relative rounded-2xl border border-white/[0.06] bg-neutral-950/60 overflow-hidden"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            {/* Demo badge */}
            <div className="absolute top-3 right-3 z-10">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                Interactive Demo — sample questions only
              </span>
            </div>
            <div className="p-6 md:p-8 min-h-[420px] flex flex-col">
              <AnimatePresence mode="wait">
                {/* ====== SETUP PHASE ====== */}
                {phase === "setup" && (
                  <motion.div
                    key="setup"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.35 }}
                    className="flex-1 flex flex-col"
                  >
                    {/* Mini header */}
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 mb-4 shadow-lg shadow-purple-500/25">
                        <HelpCircle className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white/90">
                        ItsQuizMe
                      </h3>
                      <p className="text-sm text-white/40 mt-1">
                        Generate an AI-powered quiz on any topic
                      </p>
                    </div>

                    {/* Topic input (decorative) */}
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-4">
                      <label className="block text-xs font-semibold text-white/50 mb-2">
                        What would you like to be quizzed on?
                      </label>
                      <div className="w-full h-10 px-4 rounded-lg border border-white/10 bg-white/[0.04] flex items-center">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={selectedPreset}
                            className="text-sm text-purple-300"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                          >
                            {DEMO_PRESETS[selectedPreset].icon}{" "}
                            {DEMO_PRESETS[selectedPreset].label}
                          </motion.span>
                        </AnimatePresence>
                      </div>

                      {/* Quick picks */}
                      <div className="mt-3">
                        <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
                          Quick picks
                        </span>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {DEMO_PRESETS.map((preset, i) => (
                            <span
                              key={preset.label}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-full border transition-all duration-300 ${
                                i === selectedPreset
                                  ? "border-purple-500/50 bg-purple-500/20 text-purple-300 shadow-sm shadow-purple-500/20"
                                  : "border-white/10 bg-white/[0.03] text-white/40"
                              }`}
                            >
                              {preset.icon} {preset.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Question count + type mix preview */}
                    <div className="flex gap-3 mb-4">
                      <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-medium text-white/50">
                            Questions
                          </span>
                          <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                            10
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
                            style={{ width: "40%" }}
                          />
                        </div>
                      </div>
                      <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <span className="text-xs font-medium text-white/50 block mb-2">
                          Type Mix
                        </span>
                        <div className="w-full h-5 rounded-full overflow-hidden flex">
                          <div
                            className="bg-blue-500/80 flex items-center justify-center"
                            style={{ width: "30%" }}
                          >
                            <span className="text-[9px] font-bold text-white">
                              30%
                            </span>
                          </div>
                          <div
                            className="bg-emerald-500/80 flex items-center justify-center"
                            style={{ width: "50%" }}
                          >
                            <span className="text-[9px] font-bold text-white">
                              50%
                            </span>
                          </div>
                          <div
                            className="bg-violet-500/80 flex items-center justify-center"
                            style={{ width: "20%" }}
                          >
                            <span className="text-[9px] font-bold text-white">
                              20%
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between text-[9px] text-white/30 mt-1">
                          <span>T/F</span>
                          <span>MC</span>
                          <span>Typed</span>
                        </div>
                      </div>
                    </div>

                    {/* Generate button */}
                    <button
                      onClick={handleGenerate}
                      className="group relative w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] transition-all duration-300 overflow-hidden cursor-pointer"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      <span className="relative flex items-center justify-center gap-2">
                        ✨ Generate Quiz
                      </span>
                    </button>

                    {/* More options note */}
                    <p className="text-center text-[11px] text-white/25 mt-3">
                      Full app includes AI settings, quiz style selection,
                      difficulty levels, creativity control &amp; more
                    </p>
                  </motion.div>
                )}

                {/* ====== GENERATING PHASE ====== */}
                {phase === "generating" && (
                  <motion.div
                    key="generating"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.35 }}
                    className="flex-1 flex flex-col items-center justify-center"
                  >
                    <div className="relative">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 mb-6 shadow-lg shadow-purple-500/25">
                        <motion.span
                          className="text-3xl"
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        >
                          ✨
                        </motion.span>
                      </div>
                      {/* Pulsing ring */}
                      <motion.div
                        className="absolute inset-0 rounded-2xl border-2 border-purple-500/30"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    </div>
                    <h3 className="text-xl font-bold text-white/90 mb-2">
                      Generating Your Quiz
                    </h3>
                    <p className="text-sm text-white/40 mb-4">
                      AI is crafting questions on{" "}
                      <span className="text-purple-300">
                        {DEMO_PRESETS[selectedPreset].label}
                      </span>
                      ...
                    </p>
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2.5 h-2.5 rounded-full bg-purple-500"
                          animate={{ y: [0, -8, 0] }}
                          transition={{
                            duration: 0.6,
                            delay: i * 0.15,
                            repeat: Infinity,
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* ====== QUESTION PHASE ====== */}
                {phase === "question" && q && (
                  <motion.div
                    key={`question-${currentQuestion}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1 flex flex-col"
                  >
                    {/* Progress header */}
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                            {currentQuestion + 1}
                          </span>
                          <span className="text-sm text-white/30">
                            of {DEMO_QUESTIONS.length}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${typeConfig.bg} ${typeConfig.text}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${typeConfig.dotColor}`}
                          />
                          {typeConfig.label}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-2 rounded-full bg-white/5 mb-2 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500"
                          animate={{
                            width: `${((currentQuestion + 1) / DEMO_QUESTIONS.length) * 100}%`,
                          }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>

                      {/* Nav dots */}
                      <div className="flex justify-center gap-1.5 mt-3">
                        {DEMO_QUESTIONS.map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                              i === currentQuestion
                                ? "bg-gradient-to-r from-purple-500 to-blue-500 scale-125 shadow-sm shadow-purple-500/30"
                                : answers[i] !== undefined
                                  ? "bg-emerald-500/60"
                                  : "bg-white/10"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Question card */}
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 mb-4 flex-1">
                      {/* Question text */}
                      <h3 className="text-lg md:text-xl font-semibold text-white/90 mb-6 leading-relaxed">
                        {q.question}
                      </h3>

                      {/* Answer options */}
                      <div className="space-y-2.5">
                        {q.options.map((option, idx) => {
                          const isSelected = currentAnswer === option;

                          return (
                            <button
                              key={idx}
                              onClick={() => handleSelectAnswer(option)}
                              className={`group w-full p-3.5 rounded-xl border-2 text-left transition-all duration-300 cursor-pointer ${
                                isSelected
                                  ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10"
                                  : "border-white/10 hover:border-purple-500/50 hover:bg-purple-500/5 bg-white/[0.02]"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                    isSelected
                                      ? "bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-sm shadow-purple-500/30"
                                      : "bg-white/5 text-white/40 group-hover:bg-purple-500/20 group-hover:text-purple-300"
                                  }`}
                                >
                                  {String.fromCharCode(65 + idx)}
                                </span>
                                <span
                                  className={`flex-1 text-sm font-medium transition-colors ${
                                    isSelected
                                      ? "text-purple-300"
                                      : "text-white/70"
                                  }`}
                                >
                                  {option}
                                </span>
                                {isSelected && (
                                  <span className="text-purple-400 text-lg">
                                    ✓
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Navigation buttons */}
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex gap-3">
                        <button
                          onClick={handlePrevious}
                          disabled={currentQuestion === 0}
                          className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white/70 hover:border-white/20 text-sm font-medium transition-all cursor-pointer disabled:opacity-30 disabled:cursor-default disabled:hover:text-white/50 disabled:hover:border-white/10"
                        >
                          ← Previous
                        </button>

                        {currentQuestion === DEMO_QUESTIONS.length - 1 ? (
                          <button
                            onClick={handleSubmit}
                            disabled={!currentAnswer}
                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-default"
                          >
                            Submit Quiz →
                          </button>
                        ) : (
                          <button
                            onClick={handleNext}
                            disabled={!currentAnswer}
                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-default"
                          >
                            Next →
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ====== RESULT PHASE ====== */}
                {phase === "result" && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4 }}
                    className="flex-1 flex flex-col"
                  >
                    {/* Score header */}
                    <div className="text-center mb-6">
                      {/* Emoji */}
                      <motion.div
                        className="text-5xl mb-4"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        {scorePercent >= 80
                          ? "🏆"
                          : scorePercent >= 60
                            ? "🌟"
                            : scorePercent >= 40
                              ? "👍"
                              : "💪"}
                      </motion.div>

                      <h3 className="text-2xl font-bold text-white/90 mb-2">
                        Quiz Complete!
                      </h3>
                      <p className="text-sm text-white/40 mb-4">
                        {DEMO_PRESETS[selectedPreset].label}
                      </p>

                      {/* Score ring */}
                      <div className="relative w-36 h-36 mx-auto mb-4">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="72"
                            cy="72"
                            r="60"
                            strokeWidth="10"
                            fill="none"
                            className="stroke-white/5"
                          />
                          <motion.circle
                            cx="72"
                            cy="72"
                            r="60"
                            strokeWidth="10"
                            fill="none"
                            strokeLinecap="round"
                            stroke="url(#quizScoreGrad)"
                            initial={{ strokeDasharray: "0 377" }}
                            animate={{
                              strokeDasharray: `${(scorePercent / 100) * 377} 377`,
                            }}
                            transition={{ duration: 1, delay: 0.3 }}
                          />
                          <defs>
                            <linearGradient
                              id="quizScoreGrad"
                              x1="0%"
                              y1="0%"
                              x2="100%"
                              y2="100%"
                            >
                              <stop offset="0%" stopColor="#a78bfa" />
                              <stop offset="50%" stopColor="#3b82f6" />
                              <stop offset="100%" stopColor="#06b6d4" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <motion.span
                            className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                          >
                            {scorePercent}%
                          </motion.span>
                          <span className="text-xs text-white/30 mt-1">
                            {correctCount}/{DEMO_QUESTIONS.length} correct
                          </span>
                        </div>
                      </div>

                      {/* Score message badge */}
                      <div
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 ${
                          scorePercent >= 80
                            ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                            : scorePercent >= 60
                              ? "bg-yellow-500/10 border border-yellow-500/30 text-yellow-400"
                              : "bg-orange-500/10 border border-orange-500/30 text-orange-400"
                        }`}
                      >
                        <span className="text-sm font-semibold">
                          {scorePercent >= 80
                            ? "Excellent Work!"
                            : scorePercent >= 60
                              ? "Good Job!"
                              : "Keep Practicing!"}
                        </span>
                      </div>
                    </div>

                    {/* Review all questions */}
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-4">
                      <h4 className="text-sm font-semibold text-white/60 mb-4 flex items-center gap-2">
                        <span className="w-1 h-4 rounded-full bg-gradient-to-b from-purple-500 to-blue-500" />
                        Review Your Answers
                      </h4>

                      <div className="space-y-3">
                        {DEMO_QUESTIONS.map((dq, idx) => {
                          const userAnswer = answers[idx] ?? null;
                          const isCorrect = userAnswer === dq.correctAnswer;

                          return (
                            <motion.div
                              key={dq.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.15 + idx * 0.08 }}
                              className={`p-3.5 rounded-xl border-2 transition-all ${
                                isCorrect
                                  ? "border-emerald-500/30 bg-emerald-500/5"
                                  : "border-red-500/30 bg-red-500/5"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {/* Status icon */}
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md ${
                                    isCorrect
                                      ? "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30"
                                      : "bg-gradient-to-br from-red-400 to-red-600 shadow-red-500/30"
                                  }`}
                                >
                                  {isCorrect ? (
                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-white" />
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  {/* Question label */}
                                  <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
                                    Question {idx + 1}
                                  </span>
                                  <p className="text-sm font-semibold text-white/80 mt-0.5 mb-3 leading-relaxed">
                                    {dq.question}
                                  </p>

                                  {/* Options review */}
                                  <div className="space-y-1.5">
                                    {dq.options.map((option, optIdx) => {
                                      const isSelected = userAnswer === option;
                                      const isCorrectOption =
                                        dq.correctAnswer === option;
                                      const isWrongSelection =
                                        isSelected && !isCorrectOption;

                                      return (
                                        <div
                                          key={optIdx}
                                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all ${
                                            isCorrectOption
                                              ? "border-emerald-500/40 bg-emerald-500/10"
                                              : isWrongSelection
                                                ? "border-red-500/40 bg-red-500/10"
                                                : "border-white/5 bg-white/[0.02]"
                                          }`}
                                        >
                                          <span
                                            className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                              isCorrectOption
                                                ? "bg-emerald-500 text-white"
                                                : isWrongSelection
                                                  ? "bg-red-500 text-white"
                                                  : "bg-white/5 text-white/30"
                                            }`}
                                          >
                                            {String.fromCharCode(65 + optIdx)}
                                          </span>
                                          <span
                                            className={`flex-1 text-xs ${
                                              isCorrectOption
                                                ? "text-emerald-300 font-medium"
                                                : isWrongSelection
                                                  ? "text-red-300"
                                                  : "text-white/50"
                                            }`}
                                          >
                                            {option}
                                          </span>
                                          {isSelected && (
                                            <span
                                              className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${
                                                isCorrectOption
                                                  ? "bg-emerald-500/20 text-emerald-300"
                                                  : "bg-red-500/20 text-red-300"
                                              }`}
                                            >
                                              Your response
                                            </span>
                                          )}
                                          {isCorrectOption && !isSelected && (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                          )}
                                          {isCorrectOption && isSelected && (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                          )}
                                          {isWrongSelection && (
                                            <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>

                    {/* AI summary card */}
                    <div className="w-full p-4 rounded-xl bg-white/[0.03] border border-white/10 mb-4 text-left">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[9px] font-bold text-white">
                            AI
                          </span>
                        </div>
                        <p className="text-sm text-white/50 leading-relaxed">
                          Great effort on this quiz! You showed strong knowledge
                          in several areas. The real quiz includes detailed AI
                          feedback on every question to help you learn and
                          improve.
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 w-full">
                      <button
                        onClick={handleReset}
                        className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white/70 hover:border-white/20 text-sm font-medium transition-all cursor-pointer"
                      >
                        ↻ Try Again
                      </button>
                      <button
                        onClick={handleReset}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 cursor-pointer"
                      >
                        + New Quiz
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* -- Divider -- */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-8" />

          {/* -- Bottom - CTA -- */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <motion.p
              className="text-white/30 text-sm"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              Built with React &amp; AI &mdash; supports knowledge quizzes,
              self-assessments &amp; opinion polls
            </motion.p>

            <Link href="/itsquizme">
              <motion.button
                className="group relative px-8 py-3.5 rounded-2xl text-sm font-bold
                  bg-gradient-to-r from-purple-500 to-blue-500
                  hover:from-purple-400 hover:to-blue-400
                  text-white shadow-xl shadow-purple-500/25
                  transition-shadow hover:shadow-purple-500/40 cursor-pointer"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.55 }}
              >
                <span className="flex items-center gap-2">
                  Try ItsQuizMe
                  <svg
                    className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </span>
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
