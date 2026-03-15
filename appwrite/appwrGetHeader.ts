import { tablesDB } from "./appwriteConfig";
import { toProxyUrl } from "@/lib/appwriteProxy";




export const appwrGetHeader = async (): Promise<Header | null> => {
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const tableId = process.env.NEXT_PUBLIC_APPWRITE_HEADER_TABLE_ID!;
  const rowId = "HEADER_DOC"; // fixed ID so you only have one header

  try {
    // 🔎 Fetch the single row by ID
    const row = await tablesDB.getRow(databaseId, tableId, rowId);

    if (row) {
      const header = row as unknown as Header;
      if (header.imageUrl) header.imageUrl = toProxyUrl(header.imageUrl);
      return header;
    } else {
      console.log("No such row!");
      return null;
    }
  } catch (error: any) {
    if (error.code === 404) {
      console.log("No such row!");
      return null;
    }
    console.error("Error fetching header:", error);
    throw error;
  }
};
