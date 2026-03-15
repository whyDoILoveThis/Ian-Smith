import { ID } from "appwrite";
import { storage, tablesDB } from "./appwriteConfig";
import { appwrImgUp, appwrImgDelete } from "./appwrStorage";
import { toProxyUrl } from "@/lib/appwriteProxy";

interface SaveSkillParams {
  file: File;
  text: string;
}

export async function appwrSaveSkill({ file, text }: SaveSkillParams) {
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const tableId = process.env.NEXT_PUBLIC_APPWRITE_SKILLS_TABLE_ID!;

  try {
    // 1️⃣ Upload file to Appwrite Storage
   
    const uploadedFileData = await appwrImgUp(file);

    // 3️⃣ Create new skill row in Appwrite DB
    const response = await tablesDB.createRow({
      databaseId,
      tableId,
      rowId: ID.unique(),
      data: {
        text: text,
        url: uploadedFileData.url,
        fileId: uploadedFileData.fileId, // keep fileId in case you want to delete later
      },
    });

    console.log("✅ Skill saved:", response);
    return response;
  } catch (error) {
    console.error("❌ Error saving skill:", error);
    throw error;
  }
}



export async function appwrFetchSkills(): Promise<Skill[]> {
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const tableId = process.env.NEXT_PUBLIC_APPWRITE_SKILLS_TABLE_ID!;

  try {
    const response = await tablesDB.listRows({
      databaseId,
      tableId,
    });

    // Map Appwrite rows to your Skill interface
    const skills = response.rows.map((row: any) => {
      // Appwrite tables store data in the row itself, not nested
      const skillData = {
        $id: row.$id,
        text: row.text || row.data?.text,
        url: toProxyUrl(row.url || row.data?.url),
        fileId: row.fileId || row.data?.fileId,
      };
      console.log("📝 Single skill data:", skillData);
      return skillData;
    });

    console.log("🛠 Skills fetched:", skills);
    return skills;
  } catch (error) {
    console.error("❌ Error fetching skills:", error);
    return [];
  }
}

export async function appwrDeleteSkill(
  skillId: string,
  fileId?: string
): Promise<void> {
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const tableId = process.env.NEXT_PUBLIC_APPWRITE_SKILLS_TABLE_ID!;

  try {
    // Delete the image file from storage if fileId exists
    if (fileId) {
      await appwrImgDelete(fileId);
    }

    // Delete the skill row from the database
    await tablesDB.deleteRow({
      databaseId,
      tableId,
      rowId: skillId,
    });

    console.log(`✅ Skill ${skillId} deleted`);
  } catch (error) {
    console.error("❌ Error deleting skill:", error);
    throw error;
  }
}
