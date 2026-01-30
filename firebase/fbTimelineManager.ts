// firebase/fbTimelineManager.ts
import { db } from "@/lib/firebaseConfig";
import {
  doc,
  setDoc,
  updateDoc,
  getDocs,
  deleteDoc,
  collection,
} from "firebase/firestore";

const TIMELINES_COLLECTION = "timelines";

/**
 * Save or update a timeline in Firestore.
 * If timelineId is provided, updates the existing doc. Otherwise creates a new one.
 */
export async function fbSaveOrUpdateTimeline({
  timelineId,
  userId,
  name,
  description,
  color,
}: Timeline): Promise<Timeline> {
  try {
    const id =
      timelineId ||
      `timeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const docRef = doc(db, TIMELINES_COLLECTION, id);

    const timelineData = {
      userId: userId ?? null,
      name,
      description: description ?? null,
      color: color ?? null,
      updatedAt: new Date().toISOString(),
    };

    if (timelineId) {
      // Update existing
      await updateDoc(docRef, timelineData);
    } else {
      // Create new
      await setDoc(docRef, {
        ...timelineData,
        createdAt: new Date().toISOString(),
      });
    }

    return {
      timelineId: id,
      userId: userId ?? undefined,
      name,
      description: description ?? null,
      color: color ?? null,
    };
  } catch (error) {
    console.error("Error saving/updating timeline:", error);
    throw error;
  }
}

/**
 * Fetch all timelines from Firestore.
 */
export async function fbFetchTimelines(): Promise<Timeline[]> {
  try {
    const collectionRef = collection(db, TIMELINES_COLLECTION);
    const querySnapshot = await getDocs(collectionRef);

    const timelines: Timeline[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      timelines.push({
        timelineId: doc.id,
        userId: data.userId ?? undefined,
        name: data.name ?? "",
        description: data.description ?? null,
        color: data.color ?? null,
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
      });
    });

    // Sort by createdAt descending (newest first)
    timelines.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    console.log("fbFetchTimelines fetched", timelines.length, "timelines");
    return timelines;
  } catch (error) {
    console.error("Error fetching timelines:", error);
    throw error;
  }
}

/**
 * Delete a timeline from Firestore by timelineId.
 */
export async function fbDeleteTimeline(timelineId: string): Promise<void> {
  try {
    const docRef = doc(db, TIMELINES_COLLECTION, timelineId);
    await deleteDoc(docRef);
    console.log("Timeline deleted:", timelineId);
  } catch (error) {
    console.error("Error deleting timeline:", error);
    throw error;
  }
}
