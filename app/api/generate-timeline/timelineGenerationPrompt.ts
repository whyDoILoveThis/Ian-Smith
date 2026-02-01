// app/api/generate-timeline/timelineGenerationPrompt.ts

export function timelineGenerationPrompt(userPrompt: string): string {
  return `Create a timeline for: "${userPrompt}"

Colors: #ef4444=negative, #f97316=milestone, #22c55e=success, #06b6d4=neutral, #3b82f6=planning, #8b5cf6=special, #ec4899=celebration

Respond with JSON only:
{"name":"Title","description":"Brief desc","color":"#hex","nodes":[{"title":"Event","description":"1-2 sentences","dateMs":${Date.now()},"color":"#hex"}]}

Rules:
- dateMs = Unix ms (13 digits), today=${Date.now()}
- Generate 5-15 nodes, chronological
- Brief but informative descriptions
- JSON only, no markdown`;
}
