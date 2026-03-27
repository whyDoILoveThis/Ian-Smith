"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import type { DemoQuestion } from "./types";
import { DEMO_PRESETS } from "./types";

interface ResultPhaseProps {
  selectedPreset: number;
  questions: DemoQuestion[];
  answers: Record<number, string>;
  correctCount: number;
  scorePercent: number;
  handleReset: () => void;
}

export default function ResultPhase({
  selectedPreset,
  questions,
  answers,
  correctCount,
  scorePercent,
  handleReset,
}: ResultPhaseProps) {
  return (
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
              {correctCount}/{questions.length} correct
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
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4 md:p-6 mb-4 overflow-hidden">
        <h4 className="text-sm font-semibold text-white/60 mb-4 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-gradient-to-b from-purple-500 to-blue-500" />
          Review Your Answers
        </h4>

        <div className="space-y-4">
          {questions.map((dq, idx) => {
            const userAnswer = answers[idx] ?? null;
            const isCorrect = userAnswer === dq.correctAnswer;

            return (
              <motion.div
                key={dq.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + idx * 0.08 }}
                className={`p-4 sm:p-5 rounded-xl border-2 transition-all ${
                  isCorrect
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-red-500/30 bg-red-500/5"
                }`}
              >
                {/* Question header row */}
                <div className="flex items-center gap-2.5 mb-3">
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
                  <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
                    Question {idx + 1}
                  </span>
                </div>

                {/* Question text */}
                <p className="text-sm font-semibold text-white/80 mb-4 leading-relaxed">
                  {dq.question}
                </p>

                {/* Options review */}
                <div className="space-y-2">
                  {dq.options.map((option, optIdx) => {
                    const isSelected = userAnswer === option;
                    const isCorrectOption = dq.correctAnswer === option;
                    const isWrongSelection = isSelected && !isCorrectOption;

                    return (
                      <div
                        key={optIdx}
                        className={`flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                          isCorrectOption
                            ? "border-emerald-500/40 bg-emerald-500/10"
                            : isWrongSelection
                              ? "border-red-500/40 bg-red-500/10"
                              : "border-white/5 bg-white/[0.02]"
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
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
                          className={`flex-1 text-sm ${
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
                            className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${
                              isCorrectOption
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-red-500/20 text-red-300"
                            }`}
                          >
                            Your response
                          </span>
                        )}
                        {isCorrectOption && !isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        )}
                        {isCorrectOption && isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        )}
                        {isWrongSelection && (
                          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
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
            <span className="text-[9px] font-bold text-white">AI</span>
          </div>
          <p className="text-sm text-white/50 leading-relaxed">
            Great effort on this quiz! You showed strong knowledge in several
            areas. The real quiz includes detailed AI feedback on every question
            to help you learn and improve.
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
  );
}
