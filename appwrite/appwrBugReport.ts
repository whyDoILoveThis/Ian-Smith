import { tablesDB } from "./appwriteConfig";
import { ID } from "appwrite";

const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const tableId = process.env.NEXT_PUBLIC_APPWRITE_BUG_REPORTS_TABLE_ID!;

export async function appwrSubmitBugReport(message: string) {
  try {
    const response = await tablesDB.createRow({
      databaseId,
      tableId,
      rowId: ID.unique(),
      data: {
        message,
        createdAt: new Date().toISOString(),
        page: typeof window !== "undefined" ? window.location.pathname : "",
      },
    });
    return response;
  } catch (error: any) {
    console.error("Bug report error:", error?.message, error?.code, error);
    throw error;
  }
}
