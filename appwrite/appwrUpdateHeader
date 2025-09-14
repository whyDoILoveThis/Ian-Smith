import { Client, ID, TablesDB } from "appwrite";

const client = new Client()
  .setEndpoint("https://<REGION>.cloud.appwrite.io/v1")
  .setProject("<PROJECT_ID>");

const tablesDB = new TablesDB(client);

interface Params {
  header: string;
  tagline: string;
  imageUrl?: string;
}

export async function appwrUpdateHeader({
  header,
  tagline,
  imageUrl,
}: Params) {
  const databaseId = "<DATABASE_ID>";
  const tableId = "<TABLE_ID>";
  const rowId = "header_doc"; // fixed ID so you only have one header

  try {
    // 🔎 Try updating first
    const response = await tablesDB.updateRow({databaseId, tableId, rowId, data: {
      header,
      tagline,
      imageUrl: imageUrl || null,
    }});
    console.log("✅ Header updated:", response);
    return response;
  } catch (error: any) {
    if (error.code === 404) {
      // 🆕 Row doesn't exist, so create it
      const response = await tablesDB.createRow({
        databaseId,
        tableId,
        rowId, // fixed ID
        data:{
          header,
          tagline,
          imageUrl: imageUrl || null,
        }}
      );
      console.log("🆕 Header created:", response);
      return response;
    } else {
      console.error("❌ Unexpected error:", error);
      throw error;
    }
  }
}
