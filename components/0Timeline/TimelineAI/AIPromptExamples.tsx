// components/0Timeline/TimelineAI/AIPromptExamples.tsx
"use client";

import React from "react";
import {
  History,
  Dumbbell,
  Briefcase,
  GraduationCap,
  Heart,
  Rocket,
} from "lucide-react";

interface AIPromptExamplesProps {
  onSelect: (prompt: string) => void;
}

const examples = [
  {
    icon: History,
    label: "Historical",
    prompt:
      "Create a timeline of World War II major events from 1939 to 1945, including key battles, turning points, and the end of the war",
    color: "from-red-500 to-orange-500",
  },
  {
    icon: Dumbbell,
    label: "Fitness",
    prompt:
      "Design a 12-week workout and nutrition plan to help me lose 20 pounds and build lean muscle. Include weekly milestones and key phases",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Briefcase,
    label: "Project",
    prompt:
      "Create a 6-month product development timeline from ideation to launch, including research, design, development, testing, and marketing phases",
    color: "from-blue-500 to-indigo-500",
  },
  {
    icon: GraduationCap,
    label: "Learning",
    prompt:
      "Build a 3-month roadmap to learn full-stack web development, from HTML basics to deploying a complete application",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: Heart,
    label: "Personal",
    prompt:
      "Create a wedding planning timeline for the next 8 months, from venue booking to the big day",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: Rocket,
    label: "Startup",
    prompt:
      "Map out the first year of a tech startup, from incorporation to Series A funding, including product milestones and team growth",
    color: "from-cyan-500 to-blue-500",
  },
];

export default function AIPromptExamples({ onSelect }: AIPromptExamplesProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        Quick Examples
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {examples.map((example) => (
          <button
            key={example.label}
            onClick={() => onSelect(example.prompt)}
            className="group flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-transparent bg-gray-50 dark:bg-gray-800 hover:bg-gradient-to-r transition-all duration-200"
            style={{
              backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))`,
            }}
          >
            <div
              className={`p-1.5 rounded-md bg-gradient-to-br ${example.color} text-white shadow-sm`}
            >
              <example.icon size={14} />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
              {example.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
