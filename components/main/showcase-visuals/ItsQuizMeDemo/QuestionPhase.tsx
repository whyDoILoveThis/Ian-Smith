"use client";

import { motion } from "framer-motion";
import type { DemoQuestion, TypeConfig } from "./types";

interface QuestionPhaseProps {
  currentQuestion: number;
  questions: DemoQuestion[];
  q: DemoQuestion;
  typeConfig: TypeConfig;
  currentAnswer: string | null;
  answers: Record<number, string>;
  handleSelectAnswer: (answer: string) => void;
  handleNext: () => void;
  handlePrevious: () => void;
  handleSubmit: () => void;
}

export default function QuestionPhase({
  currentQuestion,
  questions,
  q,
  typeConfig,
  currentAnswer,
  answers,
  handleSelectAnswer,
  handleNext,
  handlePrevious,
  handleSubmit,
}: QuestionPhaseProps) {
  return (
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
            <span className="text-sm text-white/30">of {questions.length}</span>
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
              width: `${questions.length ? ((currentQuestion + 1) / questions.length) * 100 : 0}%`,
            }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Nav dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {questions.map((_, i) => (
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
                      isSelected ? "text-purple-300" : "text-white/70"
                    }`}
                  >
                    {option}
                  </span>
                  {isSelected && (
                    <span className="text-purple-400 text-lg">✓</span>
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

          {currentQuestion === questions.length - 1 ? (
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
  );
}
