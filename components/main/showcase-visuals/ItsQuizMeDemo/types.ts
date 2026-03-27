export interface DemoQuestion {
  id: number;
  type: "true-false" | "multiple-choice" | "typed";
  question: string;
  options: string[];
  correctAnswer: string;
}

export type DemoPhase = "setup" | "generating" | "question" | "result";

export interface TypeConfig {
  label: string;
  gradient: string;
  bg: string;
  text: string;
  dotColor: string;
}

export const DEMO_PRESETS = [
  { label: "General Science", icon: "🔬" },
  { label: "Computer Science", icon: "💻" },
  { label: "World Geography", icon: "🌍" },
  { label: "Music Theory", icon: "🎵" },
  { label: "Mathematics", icon: "📐" },
  { label: "History", icon: "📜" },
] as const;

export function getTypeConfig(type: string): TypeConfig {
  switch (type) {
    case "true-false":
      return {
        label: "True or False",
        gradient: "from-blue-500 to-blue-600",
        bg: "bg-blue-500/10 border-blue-500/20",
        text: "text-blue-400",
        dotColor: "bg-blue-500",
      };
    case "multiple-choice":
      return {
        label: "Multiple Choice",
        gradient: "from-emerald-500 to-emerald-600",
        bg: "bg-emerald-500/10 border-emerald-500/20",
        text: "text-emerald-400",
        dotColor: "bg-emerald-500",
      };
    case "typed":
      return {
        label: "Type Your Answer",
        gradient: "from-violet-500 to-violet-600",
        bg: "bg-violet-500/10 border-violet-500/20",
        text: "text-violet-400",
        dotColor: "bg-violet-500",
      };
    default:
      return {
        label: type,
        gradient: "from-gray-500 to-gray-600",
        bg: "bg-gray-500/10 border-gray-500/20",
        text: "text-gray-400",
        dotColor: "bg-gray-500",
      };
  }
}
