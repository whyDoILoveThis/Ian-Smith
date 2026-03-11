import { tablesDB, client } from "./appwriteConfig";
import { ID, Realtime, Channel } from "appwrite";

const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const tableId = process.env.NEXT_PUBLIC_APPWRITE_BUG_REPORTS_TABLE_ID!;

export interface BugReport {
  $id: string;
  message: string;
  category?: string;
  page?: string;
  createdAt: string;
}

function rowToBugReport(row: any): BugReport {
  return {
    $id: row.$id,
    message: row.message ?? "",
    category: row.category ?? undefined,
    page: row.page ?? undefined,
    createdAt: row.createdAt ?? row.$createdAt ?? "",
  };
}

export async function appwrSubmitBugReport(message: string, category?: string) {
  try {
    const response = await tablesDB.createRow({
      databaseId,
      tableId,
      rowId: ID.unique(),
      data: {
        message,
        createdAt: new Date().toISOString(),
        page: typeof window !== "undefined" ? window.location.pathname : "",
        ...(category ? { category } : {}),
      },
    });
    return response;
  } catch (error: any) {
    console.error("Bug report error:", error?.message, error?.code, error);
    throw error;
  }
}

export async function appwrGetBugReports(): Promise<BugReport[]> {
  try {
    const response = await tablesDB.listRows({ databaseId, tableId });
    return response.rows.map(rowToBugReport);
  } catch (error: any) {
    console.error("Fetch bug reports error:", error?.message, error?.code, error);
    throw error;
  }
}

export async function appwrDeleteBugReport(id: string) {
  try {
    await tablesDB.deleteRow({ databaseId, tableId, rowId: id });
  } catch (error: any) {
    console.error("Delete bug report error:", error?.message, error?.code, error);
    throw error;
  }
}

export type BugReportEvent = 
  | { type: "create"; report: BugReport }
  | { type: "update"; report: BugReport }
  | { type: "delete"; id: string };

const realtime = typeof window !== "undefined" ? new Realtime(client) : null;

export async function subscribeBugReports(callback: (event: BugReportEvent) => void) {
  if (!realtime) throw new Error("Realtime is only available in the browser");
  const channel = Channel.tablesdb(databaseId).table(tableId).row();
  const subscription = await realtime.subscribe(channel, (response: any) => {
    const events: string[] = response.events ?? [];
    const payload = response.payload;
    if (events.some((e: string) => e.includes(".create"))) {
      callback({ type: "create", report: rowToBugReport(payload) });
    } else if (events.some((e: string) => e.includes(".update"))) {
      callback({ type: "update", report: rowToBugReport(payload) });
    } else if (events.some((e: string) => e.includes(".delete"))) {
      callback({ type: "delete", id: payload.$id });
    }
  });
  return () => subscription.close();
}
