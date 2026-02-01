// components/0Timeline/TimelineAI/types.ts

export interface GeneratedTimeline {
  name: string;
  description?: string;
  color?: string;
  nodes: GeneratedNode[];
}

export interface GeneratedNode {
  title: string;
  description?: string;
  dateMs: number;
  color?: string;
}
