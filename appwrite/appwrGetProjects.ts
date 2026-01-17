import { tablesDB } from "./appwriteConfig";
import { appwrImgDelete } from "./appwrStorage";

// Helper function to fetch full screenshot records by IDs
async function fetchScreenshotRecords(
  screenshotIds: (string | any)[],
  databaseId: string
): Promise<any[]> {
  const screenshotsTableId = process.env.NEXT_PUBLIC_APPWRITE_SCREENSHOTS_TABLE_ID;
  
  console.log("🖼️ Fetching screenshots, IDs:", screenshotIds);
  console.log("🖼️ Screenshots table ID:", screenshotsTableId);
  
  if (!screenshotsTableId || !screenshotIds || screenshotIds.length === 0) {
    console.warn("⚠️ No screenshots table ID or screenshot IDs");
    return [];
  }

  const screenshots: any[] = [];

  for (const id of screenshotIds) {
    try {
      console.log("🖼️ Processing screenshot ID:", id, "Type:", typeof id);
      
      // If id is an object, it might already have the data
      if (typeof id === "object" && id.url) {
        console.log("🖼️ Screenshot object with URL found:", id);
        screenshots.push({ url: id.url, fileId: id.fileId });
        continue;
      }

      // If id is a string, fetch the record
      if (typeof id === "string") {
        console.log("🖼️ Fetching screenshot record by ID:", id);
        const record = await tablesDB.getRow(databaseId, screenshotsTableId, id);
        console.log("🖼️ Retrieved screenshot record:", record);
        
        if (record) {
          const screenshotData = {
            url: record.url || record.data?.url,
            fileId: record.fileId || record.data?.fileId,
          };
          console.log("🖼️ Extracted screenshot data:", screenshotData);
          screenshots.push(screenshotData);
        }
      }
    } catch (error) {
      console.error(`❌ Error fetching screenshot ${id}:`, error);
    }
  }

  console.log("🖼️ Final screenshots array:", screenshots);
  return screenshots;
}

export async function appwrFetchProjects(): Promise<Project[]> {
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const tableId = process.env.NEXT_PUBLIC_APPWRITE_PROJECTS_TABLE_ID;

  if (!tableId) {
    console.error("❌ Missing environment variable: NEXT_PUBLIC_APPWRITE_PROJECTS_TABLE_ID");
    return [];
  }

  try {
    const response = await tablesDB.listRows({
      databaseId,
      tableId,
    });

    console.log("📦 Raw response from Appwrite:", response);

    // Appwrite rows are in `response.rows`
    const projects = await Promise.all(
      response.rows.map(async (row: any) => {
        console.log("📝 Raw row data:", row);
        
        // Read screenshot URL and fileId arrays from project row
        const urlsField = row.screenshotUrls || row.data?.screenshotUrls || [];
        const fileIdsField = row.screenshotFileIds || row.data?.screenshotFileIds || [];

        let screenshotUrls: string[] = [];
        let screenshotFileIds: (string | null)[] = [];

        try {
          screenshotUrls = typeof urlsField === "string"
            ? JSON.parse(urlsField)
            : (Array.isArray(urlsField) ? urlsField : []);
        } catch (e) {
          console.warn("⚠️ Failed to parse screenshotUrls:", urlsField);
          screenshotUrls = [];
        }

        try {
          screenshotFileIds = typeof fileIdsField === "string"
            ? JSON.parse(fileIdsField)
            : (Array.isArray(fileIdsField) ? fileIdsField : []);
        } catch (e) {
          console.warn("⚠️ Failed to parse screenshotFileIds:", fileIdsField);
          screenshotFileIds = [];
        }

        console.log("📝 Parsed screenshotUrls:", screenshotUrls, "fileIds:", screenshotFileIds);

        // Build screenshots array pairing URLs and fileIds by index
        const screenshotsArray = screenshotUrls.map((url: string, idx: number) => ({
          url,
          fileId: screenshotFileIds[idx] || null,
        }));

        const projectData = {
          $id: row.$id,
          title: row.title || row.data?.title,
          description: row.description || row.data?.description,
          moreInfo: row.moreInfo || row.data?.moreInfo,
          demoUrl: row.demoUrl || row.data?.demoUrl,
          screenshots: screenshotsArray,
          stack: row.stack || row.data?.stack || [],
        };

        console.log("📝 Final project data:", projectData);
        return projectData;
      })
    );

    console.log("📦 Projects fetched:", projects);
    return projects;
  } catch (error) {
    console.error("❌ Error fetching projects:", error);
    return [];
  }
}

export async function appwrDeleteProject(
  projectId: string,
  screenshots?: Screenshot[]
): Promise<void> {
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const tableId = process.env.NEXT_PUBLIC_APPWRITE_PROJECTS_TABLE_ID;

  if (!tableId) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_APPWRITE_PROJECTS_TABLE_ID");
  }

  try {
    // Delete all associated screenshot files from storage
    if (screenshots && screenshots.length > 0) {
      for (const screenshot of screenshots) {
        if (screenshot.fileId) {
          await appwrImgDelete(screenshot.fileId);
        }
      }
    }

    // Delete the project row from the database
    await tablesDB.deleteRow({
      databaseId,
      tableId,
      rowId: projectId,
    });

    console.log(`✅ Project ${projectId} deleted`);
  } catch (error) {
    console.error("❌ Error deleting project:", error);
    throw error;
  }
}