// /lib/fbSessions.ts
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  orderBy,
  DocumentData,
} from "firebase/firestore";

export type SessionSummary = {
  id: string;
  title?: string;
  updatedAt?: Date | null;
  messageCount?: number;
};

export type SessionFull = {
  id: string;
  conversations: any[]; // your saved conversations array
  updatedAt?: Date | null;
};

/**
 * Convert Firestore timestamp-ish to JS Date safely
 */
function toDate(val: any): Date | null {
  if (!val) return null;
  // Firestore Timestamp
  if (typeof val?.toDate === "function") return val.toDate();
  // ISO string or number
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Fetch session summaries from "botSessions" collection, newest first.
 */
export async function fbGetConversationSessions(): Promise<SessionSummary[]> {
  const colRef = collection(db, "botSessions");
  const q = query(colRef, orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);
  const results: SessionSummary[] = [];

  snap.forEach((d) => {
    const data = d.data() as DocumentData;
    const convs = data.conversations;
    const messageCount = Array.isArray(convs)
      ? convs.reduce((sum: number, c: any) => sum + (Array.isArray(c.messages) ? c.messages.length : 0), 0)
      : 0;

    results.push({
      id: d.id,
      title: (data?.conversations?.[0]?.title as string) || data.title || `Session ${d.id}`,
      updatedAt: toDate(data.updatedAt),
      messageCount,
    });
  });

  return results;
}

/**
 * Fetch a single session by id (full data).
 */
export async function fbGetConversationSessionById(id: string): Promise<SessionFull | null> {
  if (!id) return null;
  const docRef = doc(db, "botSessions", id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  const data = snap.data() as DocumentData;

  return {
    id: snap.id,
    conversations: Array.isArray(data.conversations) ? data.conversations : [],
    updatedAt: toDate(data.updatedAt),
  };
}
