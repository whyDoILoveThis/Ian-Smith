interface Timeline {
  timelineId?: string; // optional -> update if present
  userId?: string; // Clerk user ID of the owner
  name: string;
  description?: string | null;
  color?: string | null; // optional color for UI distinction
  createdAt?: string;
  updatedAt?: string;
}
