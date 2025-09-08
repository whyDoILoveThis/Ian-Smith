import { db } from "@/lib/firebaseConfig";
import { doc, deleteDoc } from "firebase/firestore";

/**
 * Deletes a conversation session by ID from Firestore
 * @param sessionId - the ID of the session to delete
 */
export async function fbDeleteConversationSession(sessionId: string) {
  if (!sessionId) throw new Error("Session ID is required");

  try {
    const sessionRef = doc(db, "botSessions", sessionId);
    await deleteDoc(sessionRef);
    console.log(`Deleted session ${sessionId}`);
  } catch (err) {
    console.error("Failed to delete session:", err);
    throw err;
  }
}
