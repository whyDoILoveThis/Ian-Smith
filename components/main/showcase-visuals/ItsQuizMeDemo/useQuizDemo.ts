"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { DemoQuestion, DemoPhase } from "./types";
import { DEMO_PRESETS, getTypeConfig } from "./types";

export function useQuizDemo() {
  const [phase, setPhase] = useState<DemoPhase>("setup");
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [questions, setQuestions] = useState<DemoQuestion[]>([]);

  /* Auto-cycle the preset selection during setup */
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

  /* Generate quiz via AI API */
  const handleGenerate = useCallback(async () => {
    setPhase("generating");
    const topic = DEMO_PRESETS[selectedPreset].label;
    try {
      const res = await fetch("/api/its-quiz-me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          config: {
            topic,
            questionCount: 5,
            questionTypes: { trueFalse: 20, multipleChoice: 80, typed: 0 },
            aiSettings: {
              style: "knowledge",
              difficulty: "medium",
              creativity: 50,
            },
          },
        }),
      });
      const data = await res.json();
      if (data.quiz?.questions?.length) {
        const qs: DemoQuestion[] = data.quiz.questions.map(
          (q: any, i: number) => ({
            id: q.id ?? i + 1,
            type: q.type ?? "multiple-choice",
            question: q.question,
            options: q.options ?? [],
            correctAnswer: q.correctAnswer,
          }),
        );
        setQuestions(qs);
      }
    } catch {
      // Silently fall through — move to question phase with whatever we have
    }
    setCurrentQuestion(0);
    setAnswers({});
    setPhase("question");
  }, [selectedPreset]);

  const handleSelectAnswer = useCallback(
    (answer: string) => {
      setAnswers((prev) => ({ ...prev, [currentQuestion]: answer }));
    },
    [currentQuestion],
  );

  const handleNext = useCallback(() => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((i) => i + 1);
    }
  }, [currentQuestion, questions.length]);

  const handlePrevious = useCallback(() => {
    if (currentQuestion > 0) {
      setCurrentQuestion((i) => i - 1);
    }
  }, [currentQuestion]);

  const handleSubmit = useCallback(() => {
    setPhase("result");
  }, []);

  const handleReset = useCallback(() => {
    setPhase("setup");
    setCurrentQuestion(0);
    setAnswers({});
    setQuestions([]);
  }, []);

  /* Derived values */
  const correctCount = questions.filter(
    (dq, i) => answers[i] === dq.correctAnswer,
  ).length;

  const scorePercent = questions.length
    ? Math.round((correctCount / questions.length) * 100)
    : 0;

  const q = questions[currentQuestion] ?? null;
  const currentAnswer = q ? (answers[currentQuestion] ?? null) : null;
  const typeConfig = getTypeConfig(q?.type ?? "multiple-choice");

  return {
    phase,
    selectedPreset,
    currentQuestion,
    answers,
    questions,
    q,
    currentAnswer,
    typeConfig,
    correctCount,
    scorePercent,
    handleGenerate,
    handleSelectAnswer,
    handleNext,
    handlePrevious,
    handleSubmit,
    handleReset,
  };
}
