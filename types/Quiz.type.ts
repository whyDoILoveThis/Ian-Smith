export type QuestionType = "true-false" | "multiple-choice" | "typed";

export type QuizStyle = "knowledge" | "self-assessment" | "opinion" | "auto";
export type QuizDifficulty = "easy" | "medium" | "hard" | "mixed";

export interface AISettings {
  style: QuizStyle;
  difficulty: QuizDifficulty;
  creativity: number; // 0-100 (maps to temperature 0.1-1.0)
}

export interface QuizConfig {
  topic: string;
  questionCount: number;
  questionTypes: {
    trueFalse: number; // percentage 0-100
    multipleChoice: number; // percentage 0-100
    typed: number; // percentage 0-100
  };
  aiSettings: AISettings;
  instantFeedback?: boolean; // show correct/wrong after each question
}

export interface QuizQuestion {
  id: number;
  type: QuestionType;
  question: string;
  options?: string[]; // For multiple choice
  correctAnswer: string;
}

export interface Quiz {
  id: string;
  topic: string;
  questions: QuizQuestion[];
  createdAt: string;
}

export interface UserAnswer {
  questionId: number;
  answer: string;
}

export interface QuestionFeedback {
  questionId: number;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  feedback: string;
  options?: string[];
  type: QuestionType;
}

export interface QuizResult {
  quizId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  feedback: QuestionFeedback[];
  quizStyle?: QuizStyle;
  summary?: string; // AI-generated summary for self-assessments
}
