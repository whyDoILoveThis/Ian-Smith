import { Client, Storage, ID } from "appwrite";
import { tablesDB } from "./appwriteConfig";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const storage = new Storage(client);
const bucketId = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID!;

export async function appwrImgUp(file: File) {
  try {

    // Upload file using the new object parameter style
    const uploadedFile = await storage.createFile({
      bucketId: bucketId,
      fileId: ID.unique(),
      file: file
    });

    const fileId = uploadedFile.$id;

    const url = `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${fileId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;

    console.log("appwrite url: ", url);
    

    return { fileId, url };
  } catch (error) {
    console.error("Appwrite Upload Error:", error);
    throw error;
  }
}



export const appwrImgDelete = async (fileId: string): Promise<void> => {
  try {
    await storage.deleteFile({
      bucketId: bucketId,
      fileId: fileId
    });
    console.log(`✅ Deleted image ${fileId}`);
  } catch (error) {
    console.error("❌ Error deleting image from Appwrite:", error);
    throw error;
  }
};






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
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const tableId = process.env.NEXT_PUBLIC_APPWRITE_HEADER_TABLE_ID!;
  const rowId = "HEADER_DOC"; // fixed ID so you only have one header

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



