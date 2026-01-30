interface TimelineUser {
  odId?: string; // Firestore document ID (same as clerkUserId)
  clerkUserId: string; // Clerk user ID
  displayName: string;
  email?: string | null;
  imageUrl?: string | null;
  timelineUids: string[]; // Array of timeline IDs owned by this user
  createdAt?: string;
  updatedAt?: string;
}
