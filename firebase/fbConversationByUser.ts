// firebase/fbConversationByUser.ts
import { db } from "@/lib/firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";

import type { Conversation } from "@/components/main/AI/types"; // adjust path

const COLLECTION = "conversation_sessions";

/**
 * Save conversations for a userId (fingerprint).
 * It merges: existing conversations are updated by id; new ones are prepended.
 */
export async function fbSaveConversationSessionByUser(
  userId: string,
  conversations: Conversation[]
) {
  if (!userId) throw new Error("userId required");
  const ref = doc(db, COLLECTION, userId);
  const snap = await getDoc(ref);

  const existing: Conversation[] =
    (snap.exists() && (snap.data() as DocumentData).sessions) || [];

  // Merge: update existing by id, else prepend new conversations
  const merged = [...existing];

  for (const conv of conversations) {
    const idx = merged.findIndex((c) => c.id === conv.id);
    if (idx >= 0) {
      // update the conversation in-place (replace)
      merged[idx] = conv;
    } else {
      // prepend newest to keep recency at front
      merged.unshift(conv);
    }
  }

  await setDoc(
    ref,
    {
      sessions: merged,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/** Read full sessions for a userId (returns [] if none) */
export async function fbGetConversationSessionsByFingerprint(
  userId: string
): Promise<Conversation[]> {
  if (!userId) return [];
  const ref = doc(db, COLLECTION, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return [];
  const data = snap.data() as DocumentData;
  return (data.sessions as Conversation[]) || [];
}
