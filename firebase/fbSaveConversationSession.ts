// portfolioBotFirebase.ts (helper)
import { db } from "@/lib/firebaseConfig";
import { doc, setDoc, updateDoc } from "firebase/firestore";

export async function fbSaveConversationSession(
  sessionId: string,
  conversations: any[]
) {
  try {
    const docRef = doc(db, "botSessions", sessionId);
    // Use setDoc with merge:true so we update existing session or create new one
    await setDoc(
      docRef,
      { conversations, updatedAt: new Date() },
      { merge: true }
    );
    console.log("Session saved successfully:", sessionId);
  } catch (err) {
    console.error("Error saving session:", err);
  }
}
