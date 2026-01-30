// firebase/fbTimelineNodeManager.ts
import { db } from "@/lib/firebaseConfig";
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
} from "firebase/firestore";

const TIMELINE_COLLECTION = "timeline_nodes";

/**
 * Save or update a timeline node in Firestore.
 * If nodeId is provided, updates the existing doc. Otherwise creates a new one.
 */
export async function fbSaveOrUpdateNode({
  nodeId,
  timelineId,
  title,
  description,
  link,
  dateMs,
  images,
  color,
}: TimelineNode): Promise<TimelineNode> {
  try {
    // Generate ID if not provided
    const id = nodeId || `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const docRef = doc(db, TIMELINE_COLLECTION, id);

    const nodeData = {
      timelineId: timelineId ?? null,
      title,
      description: description ?? null,
      link: link ?? null,
      dateMs,
      images: images ?? [],
      color: color ?? null,
      updatedAt: new Date().toISOString(),
    };

    if (nodeId) {
      // Update existing
      await updateDoc(docRef, nodeData);
    } else {
      // Create new
      await setDoc(docRef, {
        ...nodeData,
        createdAt: new Date().toISOString(),
      });
    }

    return {
      nodeId: id,
      timelineId: timelineId ?? undefined,
      title,
      description: description ?? null,
      link: link ?? null,
      dateMs,
      images: images ?? [],
      color: color ?? null,
    };
  } catch (error) {
    console.error("Error saving/updating timeline node:", error);
    throw error;
  }
}

/**
 * Fetch timeline nodes from Firestore, optionally filtered by timelineId.
 */
export async function fbFetchNodes(timelineId?: string): Promise<TimelineNode[]> {
  try {
    const collectionRef = collection(db, TIMELINE_COLLECTION);
    
    let querySnapshot;
    if (timelineId) {
      const q = query(collectionRef, where("timelineId", "==", timelineId));
      querySnapshot = await getDocs(q);
    } else {
      querySnapshot = await getDocs(collectionRef);
    }

    const nodes: TimelineNode[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      nodes.push({
        nodeId: doc.id,
        timelineId: data.timelineId ?? undefined,
        title: data.title ?? "",
        description: data.description ?? null,
        link: data.link ?? null,
        dateMs: data.dateMs ?? Date.now(),
        images: data.images ?? [],
        color: data.color ?? null,
      });
    });

    // Sort by dateMs ascending
    nodes.sort((a, b) => a.dateMs - b.dateMs);

    console.log("fbFetchNodes fetched", nodes.length, "nodes", timelineId ? `for timeline ${timelineId}` : "(all)");
    return nodes;
  } catch (error) {
    console.error("Error fetching timeline nodes:", error);
    throw error;
  }
}

/**
 * Delete a timeline node from Firestore by nodeId.
 */
export async function fbDeleteNode(nodeId: string): Promise<void> {
  try {
    const docRef = doc(db, TIMELINE_COLLECTION, nodeId);
    await deleteDoc(docRef);
    console.log("Timeline node deleted:", nodeId);
  } catch (error) {
    console.error("Error deleting timeline node:", error);
    throw error;
  }
}
