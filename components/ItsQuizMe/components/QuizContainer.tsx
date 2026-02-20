"use client";

import { useState, useCallback } from "react";
import QuizSetup from "./QuizSetup";
import QuizQuestion from "./QuizQuestion";
import QuizReview from "./QuizReview";
import type {
  Quiz,
  QuizConfig,
  QuizResult,
  UserAnswer,
} from "@/types/Quiz.type";
import { Sparkles, AlertTriangle, RotateCcw } from "lucide-react";

const scrollToTop = () => {
  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 50);
};

type QuizState = "setup" | "taking" | "grading" | "review";

export default function QuizContainer() {
  const [state, setState] = useState<QuizState>("setup");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedAction, setLastFailedAction] = useState<
    "generate" | "grade" | null
  >(null);
  const [lastConfig, setLastConfig] = useState<QuizConfig | null>(null);
  const [instantFeedback, setInstantFeedback] = useState(false);

  const handleSetupSubmit = useCallback(async (config: QuizConfig) => {
    setIsLoading(true);
    setError(null);
    setLastConfig(config);
    setLastFailedAction(null);
    setInstantFeedback(!!config.instantFeedback);

    try {
      const response = await fetch("/api/its-quiz-me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", config }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate quiz");
      }

      setQuiz(data.quiz);
      setAnswers([]);
      setCurrentQuestionIndex(0);
      setState("taking");
      scrollToTop();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLastFailedAction("generate");
      scrollToTop();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAnswer = useCallback(
    (answer: string) => {
      if (!quiz) return;

      const questionId = quiz.questions[currentQuestionIndex].id;

      setAnswers((prev) => {
        const existing = prev.findIndex((a) => a.questionId === questionId);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { questionId, answer };
          return updated;
        }
        return [...prev, { questionId, answer }];
      });
    },
    [quiz, currentQuestionIndex],
  );

  const handleNext = useCallback(() => {
    if (!quiz) return;
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      scrollToTop();
    }
  }, [quiz, currentQuestionIndex]);

  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      scrollToTop();
    }
  }, [currentQuestionIndex]);

  const handleSubmit = useCallback(async () => {
    if (!quiz) return;

    scrollToTop();
    setState("grading");
    setIsLoading(true);
    setError(null);
    setLastFailedAction(null);

    try {
      const response = await fetch("/api/its-quiz-me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grade",
          quizId: quiz.id,
          questions: quiz.questions,
          answers,
          quizStyle: lastConfig?.aiSettings?.style || "auto",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to grade quiz");
      }

      setResult(data.result);
      setState("review");
      scrollToTop();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLastFailedAction("grade");
      setState("taking");
      scrollToTop();
    } finally {
      setIsLoading(false);
    }
  }, [quiz, answers, lastConfig]);

  const handleRetry = useCallback(() => {
    setAnswers([]);
    setCurrentQuestionIndex(0);
    setResult(null);
    setState("taking");
  }, []);

  const handleNewQuiz = useCallback(() => {
    setQuiz(null);
    setAnswers([]);
    setCurrentQuestionIndex(0);
    setResult(null);
    setLastFailedAction(null);
    setLastConfig(null);
    setState("setup");
  }, []);

  const handleRegrade = useCallback(async () => {
    if (!quiz) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/its-quiz-me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grade",
          quizId: quiz.id,
          questions: quiz.questions,
          answers,
          quizStyle: lastConfig?.aiSettings?.style || "auto",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to regrade quiz");
      }

      setResult(data.result);
      scrollToTop();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [quiz, answers, lastConfig]);

  const handleErrorRetry = useCallback(() => {
    setError(null);

    if (lastFailedAction === "generate" && lastConfig) {
      // Retry generating the quiz with the same config
      handleSetupSubmit(lastConfig);
    } else if (lastFailedAction === "grade" && quiz) {
      // Retry grading the quiz
      handleSubmit();
    } else {
      // Fallback: go back to setup
      handleNewQuiz();
    }
  }, [
    lastFailedAction,
    lastConfig,
    quiz,
    handleSetupSubmit,
    handleSubmit,
    handleNewQuiz,
  ]);

  const getCurrentAnswer = useCallback(() => {
    if (!quiz) return "";
    const questionId = quiz.questions[currentQuestionIndex].id;
    return answers.find((a) => a.questionId === questionId)?.answer || "";
  }, [quiz, currentQuestionIndex, answers]);

  // Loading overlay for grading
  if (state === "grading") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="relative rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-12 shadow-xl shadow-black/5 dark:shadow-black/20 text-center overflow-hidden">
          {/* Decorative gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10 animate-pulse" />

          <div className="relative">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 mb-6 shadow-lg shadow-purple-500/25 animate-pulse">
              <Sparkles
                className="w-10 h-10 text-white animate-spin"
                style={{ animationDuration: "3s" }}
              />
            </div>
            <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 dark:from-purple-400 dark:via-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
              Grading Your Quiz
            </h2>
            <p className="text-muted-foreground">
              AI is analyzing your answers...
            </p>

            {/* Animated dots */}
            <div className="flex justify-center gap-1 mt-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-purple-500 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error display
  if (error) {
    return (
      <div className="max-w-md mx-auto">
        <div className="relative rounded-2xl border border-red-500/30 bg-red-500/5 dark:bg-red-500/10 backdrop-blur-xl p-8 shadow-xl text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-orange-500/5" />

          <div className="relative">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 mb-4 shadow-lg shadow-red-500/25">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-red-700 dark:text-red-300">
              Something went wrong
            </h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <button
              onClick={handleErrorRetry}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-medium shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-105 transition-all duration-300"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  switch (state) {
    case "setup":
      return <QuizSetup onSubmit={handleSetupSubmit} isLoading={isLoading} />;

    case "taking":
      if (!quiz) return null;
      return (
        <QuizQuestion
          question={quiz.questions[currentQuestionIndex]}
          currentAnswer={getCurrentAnswer()}
          onAnswer={handleAnswer}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onSubmit={handleSubmit}
          currentIndex={currentQuestionIndex}
          totalQuestions={quiz.questions.length}
          isLastQuestion={currentQuestionIndex === quiz.questions.length - 1}
          isFirstQuestion={currentQuestionIndex === 0}
          instantFeedback={instantFeedback}
        />
      );

    case "review":
      if (!result || !quiz) return null;
      return (
        <QuizReview
          result={result}
          topic={quiz.topic}
          onRetry={handleRetry}
          onNewQuiz={handleNewQuiz}
          onRegrade={handleRegrade}
          isRegrading={isLoading}
        />
      );

    default:
      return null;
  }
}
