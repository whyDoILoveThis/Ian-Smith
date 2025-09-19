import { ID } from "appwrite";
import { storage, tablesDB } from "./appwriteConfig";
import { appwrImgUp } from "./appwrStorage";

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
    const skills = response.rows.map((row: any) => ({
      $id: row.$id,
      ...row.data,
    }));

    console.log("🛠 Skills fetched:", skills);
    return skills;
  } catch (error) {
    console.error("❌ Error fetching skills:", error);
    return [];
  }
}
