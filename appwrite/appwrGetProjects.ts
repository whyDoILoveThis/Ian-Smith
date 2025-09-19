import { tablesDB } from "./appwriteConfig";

export async function appwrFetchProjects(): Promise<Project[]> {
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const tableId = process.env.NEXT_PUBLIC_APPWRITE_PROJECTS_TABLE_ID!;

  try {
    const response = await tablesDB.listRows({
      databaseId,
      tableId,
    });

    // Appwrite rows are in `response.rows`
    const projects = response.rows.map((row: any) => ({
      $id: row.$id,
      ...row.data,
    }));

    console.log("📦 Projects fetched:", projects);
    return projects;
  } catch (error) {
    console.error("❌ Error fetching projects:", error);
    return [];
  }
}