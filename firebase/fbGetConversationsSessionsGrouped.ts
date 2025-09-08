// lib/fbConversationByUser.ts
"use client";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  runTransaction,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

/**
 * Types
 */
export type Message = { role: "user" | "assistant"; content: string };

export type Conversation = {
  id: string;
  title?: string | null;
  messages: Message[];
  fingerprint?: string | null;
  updatedAt?: Date | null;
};

export type SessionFull = {
  id: string; // user doc id (fingerprint)
  sessions: Conversation[]; // conversations array stored on the user doc
  updatedAt?: Date | null;
};

export type UserSummary = {
  id: string; // user doc id (fingerprint)
  sessionCount: number;
  lastUpdated?: Date | null;
  messageCount?: number; // total messages across sessions (optional)
};

/**
 * Helpers
 */
function tsToDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Timestamp) return v.toDate();
  // sometimes stored as iso string
  const maybe = new Date(v);
  return isNaN(maybe.getTime()) ? null : maybe;
}

function snapshotToUserSummary(docSnap: QueryDocumentSnapshot<DocumentData>): UserSummary {
  const data = docSnap.data();
  const sessions: any[] = Array.isArray(data.sessions) ? data.sessions : [];
  const sessionCount = sessions.length;
  let messageCount = 0;
  for (const s of sessions) {
    messageCount += Array.isArray(s.messages) ? s.messages.length : 0;
  }
  return {
    id: docSnap.id,
    sessionCount,
    lastUpdated: tsToDate(data.updatedAt ?? data.updated_at ?? data.updated),
    messageCount,
  };
}

/**
 * fbGetAllUserSessions
 * Fetch summaries for all user documents in the "conversation_sessions" collection.
 */
export async function fbGetAllUserSessions(): Promise<UserSummary[]> {
  const colRef = collection(db, "conversation_sessions");
  const snaps = await getDocs(colRef);
  const list: UserSummary[] = [];
  snaps.forEach((d) => {
    list.push(snapshotToUserSummary(d));
  });

  // Sort by most recently updated first (nulls last)
  list.sort((a, b) => {
    const at = a.lastUpdated?.getTime() ?? 0;
    const bt = b.lastUpdated?.getTime() ?? 0;
    return bt - at;
  });

  return list;
}

/**
 * fbGetUserSessionsById
 * Load the full sessions (conversations) stored on a single user document.
 * Returns SessionFull, or throws if not found.
 */
export async function fbGetUserSessionsById(userId: string): Promise<SessionFull> {
  const docRef = doc(db, "conversation_sessions", userId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    return { id: userId, sessions: [], updatedAt: null };
  }

  const data = snap.data();
  const rawSessions: any[] = Array.isArray(data.sessions) ? data.sessions : [];

  // Normalize each conversation: ensure id, messages array, convert timestamps
  const sessions: Conversation[] = rawSessions.map((s: any) => {
    const messages = Array.isArray(s.messages) ? s.messages : [];
    return {
      id: String(s.id ?? s._id ?? uuidFallback()), // keep something stable
      title: s.title ?? s.name ?? null,
      messages: messages.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content ?? ""),
      })),
      fingerprint: s.fingerprint ?? null,
      updatedAt: tsToDate(s.updatedAt ?? s.updated_at ?? null),
    };
  });

  return {
    id: snap.id,
    sessions,
    updatedAt: tsToDate(data.updatedAt ?? data.updated_at ?? null),
  };
}

/**
 * fbDeleteUserSessionByConversationId
 * Remove one conversation (by its conversationId) from a user's sessions array.
 * Uses a transaction to avoid clobbering concurrent writes.
 */
export async function fbDeleteUserSessionByConversationId(
  userId: string,
  conversationId: string
): Promise<void> {
  const docRef = doc(db, "conversation_sessions", userId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists()) {
      throw new Error("User session document not found");
    }
    const data = snap.data();
    const sessions = Array.isArray(data.sessions) ? data.sessions : [];

    const filtered = sessions.filter((s: any) => String(s.id) !== String(conversationId));

    // if nothing changed, no need to write
    if (filtered.length === sessions.length) {
      return;
    }

    tx.update(docRef, {
      sessions: filtered,
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * small helper to produce a fallback id if a conversation lacks an id
 * (keeps function self-contained, we avoid importing uuid dependency here)
 */
function uuidFallback() {
  // RFC4122-lite
  return "x" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}
