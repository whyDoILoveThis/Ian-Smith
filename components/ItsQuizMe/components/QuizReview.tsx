"use client";

import { Button } from "@/components/ui/button";
import type { QuizResult } from "@/types/Quiz.type";
import {
  RotateCcw,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Trophy,
  Star,
  ThumbsUp,
  BookOpen,
  Zap,
  MessageSquare,
} from "lucide-react";

interface QuizReviewProps {
  result: QuizResult;
  topic: string;
  onRetry: () => void;
  onNewQuiz: () => void;
}

export default function QuizReview({
  result,
  topic,
  onRetry,
  onNewQuiz,
}: QuizReviewProps) {
  const getScoreConfig = (percentage: number) => {
    if (percentage === 100)
      return {
        color: "text-emerald-500",
        gradient: "from-emerald-400 to-emerald-600",
        bg: "bg-emerald-500",
        bgLight: "bg-emerald-500/10",
        borderColor: "border-emerald-500/30",
        message: "Perfect Score!",
        icon: Trophy,
        emoji: "🏆",
      };
    if (percentage >= 80)
      return {
        color: "text-emerald-500",
        gradient: "from-emerald-400 to-cyan-500",
        bg: "bg-emerald-500",
        bgLight: "bg-emerald-500/10",
        borderColor: "border-emerald-500/30",
        message: "Excellent Work!",
        icon: Star,
        emoji: "🌟",
      };
    if (percentage >= 60)
      return {
        color: "text-yellow-500",
        gradient: "from-yellow-400 to-orange-500",
        bg: "bg-yellow-500",
        bgLight: "bg-yellow-500/10",
        borderColor: "border-yellow-500/30",
        message: "Good Job!",
        icon: ThumbsUp,
        emoji: "👍",
      };
    if (percentage >= 40)
      return {
        color: "text-orange-500",
        gradient: "from-orange-400 to-red-500",
        bg: "bg-orange-500",
        bgLight: "bg-orange-500/10",
        borderColor: "border-orange-500/30",
        message: "Keep Practicing!",
        icon: BookOpen,
        emoji: "📚",
      };
    return {
      color: "text-red-500",
      gradient: "from-red-400 to-pink-500",
      bg: "bg-red-500",
      bgLight: "bg-red-500/10",
      borderColor: "border-red-500/30",
      message: "Room for Improvement",
      icon: Zap,
      emoji: "💪",
    };
  };

  const scoreConfig = getScoreConfig(result.percentage);
  const ScoreIcon = scoreConfig.icon;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Score Header Card */}
      <div className="relative rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-8 shadow-xl shadow-black/5 dark:shadow-black/20 mb-6 overflow-hidden">
        {/* Decorative gradient blobs */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative text-center">
          {/* Emoji with glow */}
          <div className="text-7xl mb-4 animate-bounce">
            {scoreConfig.emoji}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 dark:from-purple-400 dark:via-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
            Quiz Complete!
          </h1>
          <p className="text-muted-foreground mb-8">{topic}</p>

          {/* Score Circle */}
          <div className="inline-flex items-center justify-center mb-4">
            <div className="relative w-44 h-44">
              {/* Background circle */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="88"
                  cy="88"
                  r="72"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-slate-200 dark:text-slate-800"
                />
                <circle
                  cx="88"
                  cy="88"
                  r="72"
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                  className={scoreConfig.color}
                  style={{
                    stroke: `url(#scoreGradient)`,
                    strokeDasharray: `${(result.percentage / 100) * 452} 452`,
                    transition: "stroke-dasharray 1s ease-out",
                  }}
                />
                <defs>
                  <linearGradient
                    id="scoreGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop
                      offset="0%"
                      className={
                        scoreConfig.gradient.includes("emerald")
                          ? "text-emerald-400"
                          : scoreConfig.gradient.includes("yellow")
                            ? "text-yellow-400"
                            : scoreConfig.gradient.includes("orange")
                              ? "text-orange-400"
                              : "text-red-400"
                      }
                      stopColor="currentColor"
                    />
                    <stop
                      offset="100%"
                      className={
                        scoreConfig.gradient.includes("cyan")
                          ? "text-cyan-500"
                          : scoreConfig.gradient.includes("orange")
                            ? "text-orange-500"
                            : scoreConfig.gradient.includes("red")
                              ? "text-pink-500"
                              : "text-emerald-600"
                      }
                      stopColor="currentColor"
                    />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-bold ${scoreConfig.color}`}>
                  {result.percentage}%
                </span>
                <span className="text-sm text-muted-foreground mt-1">
                  {result.score} / {result.totalQuestions} correct
                </span>
              </div>
            </div>
          </div>

          {/* Score Message */}
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${scoreConfig.bgLight} ${scoreConfig.borderColor} border`}
          >
            <ScoreIcon className={`w-5 h-5 ${scoreConfig.color}`} />
            <span className={`text-lg font-semibold ${scoreConfig.color}`}>
              {scoreConfig.message}
            </span>
          </div>
        </div>
      </div>

      {/* Review Section */}
      <div className="relative rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 shadow-xl shadow-black/5 dark:shadow-black/20 mb-6 overflow-hidden">
        <div className="absolute top-1/2 -right-20 w-40 h-40 bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-500" />
            Review Your Answers
          </h2>

          <div className="space-y-4">
            {result.feedback.map((item, index) => (
              <div
                key={item.questionId}
                className={`p-5 rounded-xl border-2 transition-all ${
                  item.isCorrect
                    ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10"
                    : "border-red-500/30 bg-red-500/5 hover:bg-red-500/10"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Status Icon */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
                      item.isCorrect
                        ? "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30"
                        : "bg-gradient-to-br from-red-400 to-red-600 shadow-red-500/30"
                    }`}
                  >
                    {item.isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : (
                      <XCircle className="w-5 h-5 text-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Question Number */}
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Question {index + 1}
                    </span>

                    {/* Question Text */}
                    <p className="font-semibold text-foreground/90 mt-1 mb-4 leading-relaxed">
                      {item.question}
                    </p>

                    {/* Answers */}
                    <div className="space-y-2 text-sm mb-4">
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                          item.isCorrect ? "bg-emerald-500/20" : "bg-red-500/20"
                        }`}
                      >
                        <span className="text-muted-foreground">
                          Your answer:
                        </span>
                        <span
                          className={`font-medium ${item.isCorrect ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}
                        >
                          {item.userAnswer || "No answer"}
                        </span>
                      </div>

                      {!item.isCorrect && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 ml-2">
                          <span className="text-muted-foreground">
                            Correct:
                          </span>
                          <span className="font-medium text-emerald-700 dark:text-emerald-300">
                            {item.correctAnswer}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* AI Feedback */}
                    <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold text-white">
                            AI
                          </span>
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {item.feedback}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions Card */}
      <div className="relative rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-4 shadow-xl shadow-black/5 dark:shadow-black/20 overflow-hidden">
        <div className="relative flex gap-3">
          <Button
            variant="outline"
            onClick={onRetry}
            className="flex-1 h-12 rounded-xl border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Retry Quiz
          </Button>
          <Button
            onClick={onNewQuiz}
            className="flex-1 h-12 rounded-xl bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-500 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] transition-all duration-300 border-0 gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            New Quiz
          </Button>
        </div>
      </div>
    </div>
  );
}
