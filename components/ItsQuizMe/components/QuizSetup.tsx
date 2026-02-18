"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { QuizConfig } from "@/types/Quiz.type";
import {
  Sparkles,
  Brain,
  Zap,
  BookOpen,
  FlaskConical,
  Bird,
  Globe,
  Code,
  Music,
  HelpCircle,
  Wand2,
  Settings2,
  ChevronDown,
} from "lucide-react";
import type { QuizStyle, QuizDifficulty } from "@/types/Quiz.type";

interface QuizSetupProps {
  onSubmit: (config: QuizConfig) => void;
  isLoading: boolean;
}

const PRESET_TOPICS = [
  { label: "ADHD Assessment", icon: Zap },
  { label: "Autism Spectrum Screening", icon: Brain },
  { label: "General IQ Test", icon: Sparkles },
  { label: "RF Awareness & Safety", icon: Zap },
  { label: "Basic Mathematics", icon: BookOpen },
  { label: "General Science", icon: FlaskConical },
  { label: "Chicken Breeds", icon: Bird },
  { label: "World Geography", icon: Globe },
  { label: "Computer Science Basics", icon: Code },
  { label: "Music Theory", icon: Music },
];

const STYLE_OPTIONS: {
  value: QuizStyle;
  label: string;
  description: string;
}[] = [
  {
    value: "auto",
    label: "Auto-detect",
    description: "AI analyzes your prompt to determine the best style",
  },
  {
    value: "knowledge",
    label: "Knowledge/Trivia",
    description: "Factual questions testing understanding",
  },
  {
    value: "self-assessment",
    label: "Self-Assessment",
    description: "Questions about your experiences & traits",
  },
  {
    value: "opinion",
    label: "Opinion/Preference",
    description: "Questions about your preferences",
  },
];

const DIFFICULTY_OPTIONS: { value: QuizDifficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "mixed", label: "Mixed" },
];

export default function QuizSetup({ onSubmit, isLoading }: QuizSetupProps) {
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [trueFalse, setTrueFalse] = useState(30);
  const [multipleChoice, setMultipleChoice] = useState(50);
  const [typed, setTyped] = useState(20);

  // AI Settings
  const [showAISettings, setShowAISettings] = useState(false);
  const [quizStyle, setQuizStyle] = useState<QuizStyle>("auto");
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("medium");
  const [creativity, setCreativity] = useState(50);

  const totalPercentage = trueFalse + multipleChoice + typed;
  const isValidPercentage = totalPercentage === 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !isValidPercentage) return;

    onSubmit({
      topic: topic.trim(),
      questionCount,
      questionTypes: {
        trueFalse,
        multipleChoice,
        typed,
      },
      aiSettings: {
        style: quizStyle,
        difficulty,
        creativity,
      },
    });
  };

  const handlePresetClick = (preset: string) => {
    setTopic(preset);
  };

  // Auto-balance when one slider changes
  const handleTrueFalseChange = (value: number) => {
    const remaining = 100 - value;
    const mcRatio = multipleChoice / (multipleChoice + typed || 1);
    setTrueFalse(value);
    setMultipleChoice(Math.round(remaining * mcRatio));
    setTyped(remaining - Math.round(remaining * mcRatio));
  };

  const handleMultipleChoiceChange = (value: number) => {
    const remaining = 100 - value;
    const tfRatio = trueFalse / (trueFalse + typed || 1);
    setMultipleChoice(value);
    setTrueFalse(Math.round(remaining * tfRatio));
    setTyped(remaining - Math.round(remaining * tfRatio));
  };

  const handleTypedChange = (value: number) => {
    const remaining = 100 - value;
    const tfRatio = trueFalse / (trueFalse + multipleChoice || 1);
    setTyped(value);
    setTrueFalse(Math.round(remaining * tfRatio));
    setMultipleChoice(remaining - Math.round(remaining * tfRatio));
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 mb-6 shadow-lg shadow-purple-500/25">
          <HelpCircle className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 dark:from-purple-400 dark:via-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
          ItsQuizMe
        </h1>
        <p className="text-muted-foreground text-lg">
          Generate an AI-powered quiz on any topic
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Topic Input Card */}
        <div className="relative rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 shadow-xl shadow-black/5 dark:shadow-black/20 overflow-hidden">
          {/* Decorative gradient blob */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full blur-3xl pointer-events-none" />

          <label className="relative block text-sm font-semibold mb-3 text-foreground/80">
            What would you like to be quizzed on?
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter a topic... e.g., 'ADHD symptoms and coping strategies' or 'Basic algebra equations'"
            className="relative w-full h-28 px-4 py-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder:text-muted-foreground/50"
            disabled={isLoading}
          />

          {/* Preset Topics */}
          <div className="relative mt-4">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Quick picks
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
              {PRESET_TOPICS.map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handlePresetClick(preset.label)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-all duration-300 hover:scale-105 ${
                      topic === preset.label
                        ? "border-purple-500 bg-purple-500/20 text-purple-700 dark:text-purple-300 shadow-md shadow-purple-500/20"
                        : "border-slate-200/50 dark:border-slate-700/50 hover:border-purple-500/50 hover:bg-purple-500/10 bg-white/50 dark:bg-slate-800/50"
                    }`}
                    disabled={isLoading}
                  >
                    <Icon className="w-3 h-3" />
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* AI Settings Card */}
        <div className="relative rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/20 overflow-hidden">
          {/* Toggle Header */}
          <button
            type="button"
            onClick={() => setShowAISettings(!showAISettings)}
            className="w-full flex items-center justify-between p-6 hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                <Settings2 className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <span className="text-sm font-semibold text-foreground/80 block">
                  AI Generation Settings
                </span>
                <span className="text-xs text-muted-foreground">
                  Customize how the AI generates your quiz
                </span>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${showAISettings ? "rotate-180" : ""}`}
            />
          </button>

          {/* Collapsible Content */}
          <div
            className={`grid transition-all duration-300 ${showAISettings ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
          >
            <div className="overflow-hidden">
              <div className="px-6 pb-6 space-y-5">
                {/* Quiz Style */}
                <div>
                  <label className="text-sm font-semibold text-foreground/80 mb-3 block">
                    Quiz Style
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {STYLE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setQuizStyle(option.value)}
                        className={`p-3 rounded-xl border text-left transition-all duration-200 hover:scale-[1.02] ${
                          quizStyle === option.value
                            ? "border-amber-500 bg-amber-500/20 shadow-md shadow-amber-500/20"
                            : "border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 hover:border-amber-500/50 hover:bg-amber-500/10"
                        }`}
                        disabled={isLoading}
                      >
                        <span
                          className={`text-sm font-medium block ${quizStyle === option.value ? "text-amber-700 dark:text-amber-300" : ""}`}
                        >
                          {option.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="text-sm font-semibold text-foreground/80 mb-3 block">
                    Difficulty
                  </label>
                  <div className="flex gap-2">
                    {DIFFICULTY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDifficulty(option.value)}
                        className={`flex-1 py-2.5 px-4 rounded-xl border text-sm font-medium transition-all duration-200 hover:scale-[1.02] ${
                          difficulty === option.value
                            ? "border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-300 shadow-md shadow-amber-500/20"
                            : "border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 hover:border-amber-500/50 hover:bg-amber-500/10"
                        }`}
                        disabled={isLoading}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Creativity Slider */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/50 dark:border-amber-800/30">
                  <div className="flex justify-between items-center mb-3">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Wand2 className="w-4 h-4 text-amber-500" />
                      Creativity
                    </span>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {creativity}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={creativity}
                    onChange={(e) => setCreativity(Number(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-amber-100 dark:bg-amber-900/50 accent-amber-500"
                    disabled={isLoading}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>Predictable</span>
                    <span>Balanced</span>
                    <span>Creative</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="relative rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 shadow-xl shadow-black/5 dark:shadow-black/20 overflow-hidden">
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex items-center justify-between mb-4">
            <label className="text-sm font-semibold text-foreground/80">
              Number of Questions
            </label>
            <span className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
              {questionCount}
            </span>
          </div>
          <div className="relative">
            <input
              type="range"
              min={5}
              max={25}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full h-3 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-purple-100 via-blue-100 to-cyan-100 dark:from-purple-900/50 dark:via-blue-900/50 dark:to-cyan-900/50"
              style={{
                background: `linear-gradient(to right, rgb(147, 51, 234) 0%, rgb(59, 130, 246) ${((questionCount - 5) / 20) * 100}%, rgb(226, 232, 240) ${((questionCount - 5) / 20) * 100}%, rgb(226, 232, 240) 100%)`,
              }}
              disabled={isLoading}
            />
          </div>
          <div className="relative flex justify-between text-xs text-muted-foreground mt-2">
            <span>5 questions</span>
            <span>15 questions</span>
            <span>25 questions</span>
          </div>
        </div>

        {/* Question Types Card */}
        <div className="relative rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 shadow-xl shadow-black/5 dark:shadow-black/20 overflow-hidden">
          <div className="absolute top-1/2 -right-20 w-40 h-40 bg-gradient-to-br from-emerald-500/20 to-violet-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex items-center justify-between mb-6">
            <label className="text-sm font-semibold text-foreground/80">
              Question Type Mix
            </label>
            <span
              className={`text-sm font-bold px-3 py-1 rounded-full transition-all ${
                isValidPercentage
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shadow-sm shadow-emerald-500/20"
                  : "bg-red-500/20 text-red-700 dark:text-red-300 animate-pulse"
              }`}
            >
              {totalPercentage}%
            </span>
          </div>

          {/* Visual Preview Bar */}
          <div className="relative h-8 rounded-full overflow-hidden flex mb-6 shadow-inner bg-slate-100 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50">
            <div
              className="bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-300 flex items-center justify-center relative overflow-hidden"
              style={{ width: `${trueFalse}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-shimmer" />
              {trueFalse > 12 && (
                <span className="text-[11px] font-bold text-white drop-shadow-sm">
                  {trueFalse}%
                </span>
              )}
            </div>
            <div
              className="bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-300 flex items-center justify-center relative overflow-hidden"
              style={{ width: `${multipleChoice}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-shimmer" />
              {multipleChoice > 12 && (
                <span className="text-[11px] font-bold text-white drop-shadow-sm">
                  {multipleChoice}%
                </span>
              )}
            </div>
            <div
              className="bg-gradient-to-r from-violet-400 to-violet-500 transition-all duration-300 flex items-center justify-center relative overflow-hidden"
              style={{ width: `${typed}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-shimmer" />
              {typed > 12 && (
                <span className="text-[11px] font-bold text-white drop-shadow-sm">
                  {typed}%
                </span>
              )}
            </div>
          </div>

          <div className="relative space-y-5">
            {/* True/False */}
            <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30">
              <div className="flex justify-between items-center mb-3">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 shadow-sm shadow-blue-500/30" />
                  True / False
                </span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {trueFalse}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={trueFalse}
                onChange={(e) => handleTrueFalseChange(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-blue-100 dark:bg-blue-900/50 accent-blue-500"
                disabled={isLoading}
              />
            </div>

            {/* Multiple Choice */}
            <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30">
              <div className="flex justify-between items-center mb-3">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className="w-4 h-4 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-sm shadow-emerald-500/30" />
                  Multiple Choice
                </span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {multipleChoice}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={multipleChoice}
                onChange={(e) =>
                  handleMultipleChoiceChange(Number(e.target.value))
                }
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-emerald-100 dark:bg-emerald-900/50 accent-emerald-500"
                disabled={isLoading}
              />
            </div>

            {/* Typed Answer */}
            <div className="p-4 rounded-xl bg-violet-50/50 dark:bg-violet-950/30 border border-violet-200/50 dark:border-violet-800/30">
              <div className="flex justify-between items-center mb-3">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className="w-4 h-4 rounded-full bg-gradient-to-r from-violet-400 to-violet-500 shadow-sm shadow-violet-500/30" />
                  Typed Answer
                </span>
                <span className="text-sm font-bold text-violet-600 dark:text-violet-400">
                  {typed}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={typed}
                onChange={(e) => handleTypedChange(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-violet-100 dark:bg-violet-900/50 accent-violet-500"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
        {/* Submit Button */}
        <Button
          type="submit"
          className="relative w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-500 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] transition-all duration-300 border-0 overflow-hidden group text-white"
          disabled={!topic.trim() || !isValidPercentage || isLoading}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          {isLoading ? (
            <span className="relative flex items-center gap-3">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating Quiz...
            </span>
          ) : (
            <span className="relative flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Generate Quiz
            </span>
          )}
        </Button>
      </form>
    </div>
  );
}
