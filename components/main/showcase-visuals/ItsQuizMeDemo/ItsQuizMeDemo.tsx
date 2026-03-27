"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useQuizDemo } from "./useQuizDemo";
import SetupPhase from "./SetupPhase";
import GeneratingPhase from "./GeneratingPhase";
import QuestionPhase from "./QuestionPhase";
import ResultPhase from "./ResultPhase";

const QuizMeDemo = () => {
  const {
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
  } = useQuizDemo();

  return (
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
          Interactive Demo
        </span>
      </div>
      <div className="p-6 md:p-8 min-h-[420px] flex flex-col">
        <AnimatePresence mode="wait">
          {phase === "setup" && (
            <SetupPhase
              selectedPreset={selectedPreset}
              handleGenerate={handleGenerate}
            />
          )}

          {phase === "generating" && (
            <GeneratingPhase selectedPreset={selectedPreset} />
          )}

          {phase === "question" && q && (
            <QuestionPhase
              currentQuestion={currentQuestion}
              questions={questions}
              q={q}
              typeConfig={typeConfig}
              currentAnswer={currentAnswer}
              answers={answers}
              handleSelectAnswer={handleSelectAnswer}
              handleNext={handleNext}
              handlePrevious={handlePrevious}
              handleSubmit={handleSubmit}
            />
          )}

          {phase === "result" && (
            <ResultPhase
              selectedPreset={selectedPreset}
              questions={questions}
              answers={answers}
              correctCount={correctCount}
              scorePercent={scorePercent}
              handleReset={handleReset}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default QuizMeDemo;
