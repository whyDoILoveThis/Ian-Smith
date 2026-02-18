export type QuestionType = "true-false" | "multiple-choice" | "typed";

export interface QuizConfig {
  topic: string;
  questionCount: number;
  questionTypes: {
    trueFalse: number; // percentage 0-100
    multipleChoice: number; // percentage 0-100
    typed: number; // percentage 0-100
  };
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
}

export interface QuizResult {
  quizId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  feedback: QuestionFeedback[];
}
