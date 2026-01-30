// appwrite/appwrNodeManager.ts
import { tablesDB } from "./appwriteConfig";
import { ID } from "appwrite";

const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const tableId = process.env.NEXT_PUBLIC_APPWRITE_TIMELINE_TABLE_ID!;

/**
 * Save or update a timeline node row in Appwrite Tables.
 * Accepts TimelineNode shape (nodeId optional, dateMs number).
 */
export async function appwrSaveOrUpdateNode({
  nodeId,
  title,
  description,
  link,
  dateMs,
}: TimelineNode) {
  if (!tableId) {
    console.error("❌ Missing env NEXT_PUBLIC_APPWRITE_TIMELINE_TABLE_ID");
    throw new Error("Missing NEXT_PUBLIC_APPWRITE_TIMELINE_TABLE_ID");
  }

  const rowId = nodeId || ID.unique();
  const rowData = {
    title,
    description: description ?? null,
    link: link ?? null,
    dateMs: dateMs ?? Date.now(), // store ISO in Appwrite
  };

  try {
    // try update
    const updated = await tablesDB.updateRow({
      databaseId,
      tableId,
      rowId,
      data: rowData,
    });
    return updated;
  } catch (error: any) {
    // if not found/create
    if (error?.code === 404 || /not found/i.test(String(error))) {
      const created = await tablesDB.createRow({
        databaseId,
        tableId,
        rowId,
        data: rowData,
      });
      return created;
    }
    console.error("Error saving/updating node:", error);
    throw error;
  }
}

/**
 * Fetch all timeline nodes and map to TimelineNode (dateMs number).
 */
export async function appwrFetchNodes(): Promise<TimelineNode[]> {

  const res = await tablesDB.listRows({
    databaseId,
    tableId,
    // optional: limit, queries...
  });

  console.log("appwrFetchNodes listRows raw response:", res);
  console.log("appwrFetchNodes response type:", typeof res);
  console.log("appwrFetchNodes response keys:", Object.keys(res));
  console.log("appwrFetchNodes response.rows:", (res as any).rows);
  console.log("appwrFetchNodes response.documents:", (res as any).documents);
  console.log("appwrFetchNodes response.items:", (res as any).items);
  console.log("appwrFetchNodes response as array?:", Array.isArray(res));

  // support different SDK return shapes defensively:
  let rawRows: any[] = [];
  
  if (Array.isArray(res)) {
    rawRows = res;
  } else if ((res as any).rows && Array.isArray((res as any).rows)) {
    rawRows = (res as any).rows;
  } else if ((res as any).documents && Array.isArray((res as any).documents)) {
    rawRows = (res as any).documents;
  } else if ((res as any).items && Array.isArray((res as any).items)) {
    rawRows = (res as any).items;
  }

  console.log("appwrFetchNodes extracted rows count:", rawRows.length);

  const mapped: TimelineNode[] = rawRows.map((r: any) => {
    const data = r.data ?? r.$data ?? {};
    // try to read date as number or parse ISO
    let dateMs: number;
    if (typeof data.dateMs === "number") dateMs = data.dateMs;
    else if (typeof data.date === "string") dateMs = new Date(data.date).getTime();
    else if (typeof r.date === "string") dateMs = new Date(r.date).getTime();
    else dateMs = Date.now();

    return {
      nodeId: r.$id ?? r.id ?? undefined,
      title: data.title ?? r.title ?? "",
      description: data.description ?? r.description ?? null,
      link: data.link ?? r.link ?? null,
      dateMs,
    };
  });

  console.log("appwrFetchNodes mapped rows count:", mapped.length);
  return mapped;
}
