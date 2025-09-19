import { tablesDB } from "./appwriteConfig";

interface ProjectParams {
  projectId?: string; // optional → if provided, we try update first
  title: string;
  description: string;
  moreInfo?: string;
  demoUrl?: string;
  screenshots: Screenshot[];
  stack: string[];
}

export async function appwrSaveOrUpdateProject({
  projectId,
  title,
  description,
  moreInfo,
  demoUrl,
  screenshots,
  stack,
}: ProjectParams) {
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const tableId = process.env.NEXT_PUBLIC_APPWRITE_PROJECTS_TABLE_ID!;
  const rowId = projectId || crypto.randomUUID(); // reuse if provided, else new

  try {
    // 🔎 Try update first
    const response = await tablesDB.updateRow({
      databaseId,
      tableId,
      rowId,
      data: {
        title,
        description,
        moreInfo: moreInfo || null,
        demoUrl: demoUrl || null,
        screenshots,
        stack,
      },
    });

    console.log("✅ Project updated:", response);
    return response;
  } catch (error: any) {
    if (error.code === 404) {
      // 🆕 Doesn't exist, create new
      const response = await tablesDB.createRow({
        databaseId,
        tableId,
        rowId,
        data: {
          title,
          description,
          moreInfo: moreInfo || null,
          demoUrl: demoUrl || null,
          screenshots,
          stack,
        },
      });

      console.log("🆕 Project created:", response);
      return response;
    } else {
      console.error("❌ Unexpected error saving project:", error);
      throw error;
    }
  }
}
