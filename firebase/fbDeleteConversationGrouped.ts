"use server";

import { db } from "@/lib/firebaseConfig";
import { doc, updateDoc, arrayRemove, deleteDoc } from "firebase/firestore";

// 🔹 Delete ALL sessions for a user (delete whole user doc)
export async function fbDeleteUserSessions(userId: string): Promise<void> {
  const ref = doc(db, "conversationSessions", userId);
  await deleteDoc(ref);
}

// 🔹 Delete ONE conversation from a user's doc
export async function fbDeleteConversationByUser(
  userId: string,
  conversationId: string
): Promise<void> {
  const ref = doc(db, "conversationSessions", userId);
  // Using arrayRemove requires you to match full object
  // → Safer: fetch, filter, then update
  const snap = await (await import("firebase/firestore")).getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  const conversations: any[] = data.conversations ?? [];

  const filtered = conversations.filter((c) => c.id !== conversationId);

  await updateDoc(ref, { conversations: filtered });
}
