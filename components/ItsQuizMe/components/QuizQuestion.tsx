"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { QuizQuestion as QuizQuestionType } from "@/types/Quiz.type";
import {
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle2,
  XCircle,
  Type,
  ToggleLeft,
  ListChecks,
} from "lucide-react";

interface QuizQuestionProps {
  question: QuizQuestionType;
  currentAnswer: string;
  onAnswer: (answer: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: () => void;
  currentIndex: number;
  totalQuestions: number;
  isLastQuestion: boolean;
  isFirstQuestion: boolean;
}

export default function QuizQuestion({
  question,
  currentAnswer,
  onAnswer,
  onNext,
  onPrevious,
  onSubmit,
  currentIndex,
  totalQuestions,
  isLastQuestion,
  isFirstQuestion,
}: QuizQuestionProps) {
  const [typedAnswer, setTypedAnswer] = useState(currentAnswer);

  // Sync typed answer when navigating between questions
  useEffect(() => {
    setTypedAnswer(currentAnswer);
  }, [currentAnswer, question.id]);

  const handleTypedSubmit = () => {
    onAnswer(typedAnswer.trim());
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case "true-false":
        return {
          label: "True or False",
          icon: ToggleLeft,
          gradient: "from-blue-500 to-blue-600",
          bg: "bg-blue-500/10 border-blue-500/20",
          text: "text-blue-600 dark:text-blue-400",
        };
      case "multiple-choice":
        return {
          label: "Multiple Choice",
          icon: ListChecks,
          gradient: "from-emerald-500 to-emerald-600",
          bg: "bg-emerald-500/10 border-emerald-500/20",
          text: "text-emerald-600 dark:text-emerald-400",
        };
      case "typed":
        return {
          label: "Type Your Answer",
          icon: Type,
          gradient: "from-violet-500 to-violet-600",
          bg: "bg-violet-500/10 border-violet-500/20",
          text: "text-violet-600 dark:text-violet-400",
        };
      default:
        return {
          label: type,
          icon: CheckCircle2,
          gradient: "from-gray-500 to-gray-600",
          bg: "bg-gray-500/10 border-gray-500/20",
          text: "text-gray-600 dark:text-gray-400",
        };
    }
  };

  const typeConfig = getTypeConfig(question.type);
  const TypeIcon = typeConfig.icon;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Header Card */}
      <div className="relative rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 shadow-xl shadow-black/5 dark:shadow-black/20 mb-6 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
              {currentIndex + 1}
            </span>
            <span className="text-muted-foreground">of {totalQuestions}</span>
          </div>
          <span
            className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border ${typeConfig.bg} ${typeConfig.text}`}
          >
            <TypeIcon className="w-3.5 h-3.5" />
            {typeConfig.label}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50">
          <div
            className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 transition-all duration-500 ease-out rounded-full relative overflow-hidden"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          >
            <div className="absolute inset-0 bg-white/30 animate-pulse" />
          </div>
        </div>

        {/* Question Navigation Dots */}
        <div className="flex justify-center gap-1.5 mt-4 flex-wrap">
          {Array.from({ length: totalQuestions }).map((_, index) => (
            <div
              key={index}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "bg-gradient-to-r from-purple-500 to-blue-500 scale-125 shadow-md shadow-purple-500/30"
                  : index < currentIndex
                    ? "bg-emerald-500/60"
                    : "bg-slate-200 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question Card */}
      <div className="relative rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-8 shadow-xl shadow-black/5 dark:shadow-black/20 mb-6 overflow-hidden">
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Question Text */}
        <div className="relative mb-8">
          <h2 className="text-xl md:text-2xl font-semibold leading-relaxed text-foreground/90">
            {question.question}
          </h2>
        </div>

        {/* Answer Options */}
        <div className="relative space-y-3">
          {question.type === "typed" ? (
            <div className="space-y-3">
              <textarea
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                onBlur={handleTypedSubmit}
                placeholder="Type your answer here..."
                className="w-full h-36 px-5 py-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all placeholder:text-muted-foreground/50 text-lg"
              />
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                Your answer will be evaluated by AI for correctness
              </p>
            </div>
          ) : (
            question.options?.map((option, index) => (
              <button
                key={index}
                onClick={() => onAnswer(option)}
                className={`group w-full p-4 rounded-xl border-2 text-left transition-all duration-300 hover:scale-[1.01] ${
                  currentAnswer === option
                    ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10"
                    : "border-slate-200/50 dark:border-slate-700/50 hover:border-purple-500/50 hover:bg-purple-500/5 bg-white/50 dark:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                      currentAnswer === option
                        ? "bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-md shadow-purple-500/30"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 group-hover:text-purple-600 dark:group-hover:text-purple-400"
                    }`}
                  >
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span
                    className={`flex-1 font-medium transition-colors ${
                      currentAnswer === option
                        ? "text-purple-700 dark:text-purple-300"
                        : ""
                    }`}
                  >
                    {option}
                  </span>
                  {currentAnswer === option && (
                    <CheckCircle2 className="w-5 h-5 text-purple-500 animate-in zoom-in duration-200" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Navigation Card */}
      <div className="relative rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-4 shadow-xl shadow-black/5 dark:shadow-black/20 overflow-hidden">
        <div className="relative flex gap-3">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={isFirstQuestion}
            className="flex-1 h-12 rounded-xl border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Previous
          </Button>

          {isLastQuestion ? (
            <Button
              onClick={onSubmit}
              disabled={!currentAnswer && question.type !== "typed"}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] transition-all duration-300 border-0"
            >
              <Send className="w-5 h-5 mr-2" />
              Submit Quiz
            </Button>
          ) : (
            <Button
              onClick={onNext}
              disabled={!currentAnswer && question.type !== "typed"}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-500 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] transition-all duration-300 border-0"
            >
              Next
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
