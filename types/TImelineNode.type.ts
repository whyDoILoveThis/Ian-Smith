interface TimelineNode {
  nodeId?: string; // optional -> update if present
  timelineId?: string; // reference to parent timeline
  title: string;
  description?: string | null;
  link?: string | null;
  dateMs: number;
  images?: Screenshot[];
  color?: string | null; // dot color
}