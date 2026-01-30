// firebase/fbUserManager.ts
import { db } from "@/lib/firebaseConfig";
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  collection,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";

const USERS_COLLECTION = "timeline_users";

/**
 * Get or create a user in Firestore.
 * If user exists, returns their data. Otherwise creates a new user.
 */
export async function fbGetOrCreateUser({
  clerkUserId,
  displayName,
  email,
  imageUrl,
}: {
  clerkUserId: string;
  displayName: string;
  email?: string | null;
  imageUrl?: string | null;
}): Promise<TimelineUser> {
  try {
    const docRef = doc(db, USERS_COLLECTION, clerkUserId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      // User exists, update their info (in case profile changed) and return
      const existingData = docSnap.data();
      await updateDoc(docRef, {
        displayName,
        email: email ?? null,
        imageUrl: imageUrl ?? null,
        updatedAt: new Date().toISOString(),
      });

      return {
        odId: docSnap.id,
        clerkUserId: docSnap.id,
        displayName,
        email: email ?? null,
        imageUrl: imageUrl ?? null,
        timelineUids: existingData.timelineUids ?? [],
        createdAt: existingData.createdAt,
        updatedAt: new Date().toISOString(),
      };
    }

    // Create new user
    const userData = {
      clerkUserId,
      displayName,
      email: email ?? null,
      imageUrl: imageUrl ?? null,
      timelineUids: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(docRef, userData);

    return {
      odId: clerkUserId,
      ...userData,
    };
  } catch (error) {
    console.error("Error getting/creating user:", error);
    throw error;
  }
}

/**
 * Fetch a user by their Clerk user ID.
 */
export async function fbFetchUserById(
  clerkUserId: string
): Promise<TimelineUser | null> {
  try {
    const docRef = doc(db, USERS_COLLECTION, clerkUserId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      odId: docSnap.id,
      clerkUserId: docSnap.id,
      displayName: data.displayName ?? "",
      email: data.email ?? null,
      imageUrl: data.imageUrl ?? null,
      timelineUids: data.timelineUids ?? [],
      createdAt: data.createdAt ?? null,
      updatedAt: data.updatedAt ?? null,
    };
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;
  }
}

/**
 * Fetch all users from Firestore.
 */
export async function fbFetchAllUsers(): Promise<TimelineUser[]> {
  try {
    const collectionRef = collection(db, USERS_COLLECTION);
    const querySnapshot = await getDocs(collectionRef);

    const users: TimelineUser[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        odId: doc.id,
        clerkUserId: doc.id,
        displayName: data.displayName ?? "",
        email: data.email ?? null,
        imageUrl: data.imageUrl ?? null,
        timelineUids: data.timelineUids ?? [],
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
      });
    });

    // Sort by displayName
    users.sort((a, b) => a.displayName.localeCompare(b.displayName));

    console.log("fbFetchAllUsers fetched", users.length, "users");
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}

/**
 * Add a timeline ID to a user's timelineUids array.
 */
export async function fbAddTimelineToUser(
  clerkUserId: string,
  timelineId: string
): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, clerkUserId);
    await updateDoc(docRef, {
      timelineUids: arrayUnion(timelineId),
      updatedAt: new Date().toISOString(),
    });
    console.log("Added timeline", timelineId, "to user", clerkUserId);
  } catch (error) {
    console.error("Error adding timeline to user:", error);
    throw error;
  }
}

/**
 * Remove a timeline ID from a user's timelineUids array.
 */
export async function fbRemoveTimelineFromUser(
  clerkUserId: string,
  timelineId: string
): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, clerkUserId);
    await updateDoc(docRef, {
      timelineUids: arrayRemove(timelineId),
      updatedAt: new Date().toISOString(),
    });
    console.log("Removed timeline", timelineId, "from user", clerkUserId);
  } catch (error) {
    console.error("Error removing timeline from user:", error);
    throw error;
  }
}

/**
 * Update a user's profile info.
 */
export async function fbUpdateUser({
  clerkUserId,
  displayName,
  email,
  imageUrl,
}: {
  clerkUserId: string;
  displayName?: string;
  email?: string | null;
  imageUrl?: string | null;
}): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, clerkUserId);
    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (displayName !== undefined) updateData.displayName = displayName;
    if (email !== undefined) updateData.email = email;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

    await updateDoc(docRef, updateData);
    console.log("Updated user:", clerkUserId);
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}
