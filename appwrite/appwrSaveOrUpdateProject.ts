import { tablesDB } from "./appwriteConfig";
import { ID } from "appwrite";

interface ProjectParams {
  projectId?: string; // optional → if provided, we try update first
  title: string;
  description: string;
  moreInfo?: string;
  demoUrl?: string;
  screenshots: Screenshot[];
  stack: string[];
}

// Helper function to save screenshots and return their IDs
async function saveScreenshots(screenshots: Screenshot[]): Promise<string[]> {
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const screenshotsTableId = process.env.NEXT_PUBLIC_APPWRITE_SCREENSHOTS_TABLE_ID!;

  const screenshotIds: string[] = [];

  for (const screenshot of screenshots) {
    try {
      const response = await tablesDB.createRow({
        databaseId,
        tableId: screenshotsTableId,
        rowId: screenshot.fileId || ID.unique(),
        data: {
          url: screenshot.url,
          fileId: screenshot.fileId || null,
        },
      });
      screenshotIds.push(response.$id);
    } catch (error) {
      console.error("Error saving screenshot:", error);
    }
  }

  return screenshotIds;
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
  const tableId = process.env.NEXT_PUBLIC_APPWRITE_PROJECTS_TABLE_ID;

  if (!tableId) {
    console.error("❌ Missing environment variable: NEXT_PUBLIC_APPWRITE_PROJECTS_TABLE_ID");
    throw new Error("Missing required environment variable: NEXT_PUBLIC_APPWRITE_PROJECTS_TABLE_ID");
  }
  const rowId = projectId || crypto.randomUUID(); // reuse if provided, else new

  try {
    // Save screenshots records and prepare URL/fileId arrays for project row
    const screenshotIds = await saveScreenshots(screenshots);
    const screenshotUrls = screenshots.map((s) => s.url);
    const screenshotFileIds = screenshots.map((s) => s.fileId || null);

    console.log("💾 Saving project with screenshot IDs:", screenshotIds);

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
        screenshotUrls, // Array of screenshot URLs for display
        screenshotFileIds, // Parallel array of fileIds for deletion
        stack, // Send as array directly
      },
    });

    console.log("✅ Project updated:", response);
    return response;
  } catch (error: any) {
    // Save screenshots for create operation and prepare arrays
    const screenshotIds = await saveScreenshots(screenshots);
    const screenshotUrls = screenshots.map((s) => s.url);
    const screenshotFileIds = screenshots.map((s) => s.fileId || null);

    console.log("💾 Creating new project with screenshot IDs:", screenshotIds);

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
          screenshotUrls, // Array of screenshot URLs for display
          screenshotFileIds, // Parallel array of fileIds for deletion
          stack, // Send as array directly
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
