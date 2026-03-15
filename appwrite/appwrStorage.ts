import { Client, Storage, ID } from "appwrite";
import { tablesDB } from "./appwriteConfig";
import { fileIdToProxyUrl } from "@/lib/appwriteProxy";

// ── Legacy / fallback client (original project) ─────────────────────
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const storage = new Storage(client);
const bucketId = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID!;

// ── Chat client (may be a completely different Appwrite project) ─────
const chatEndpoint = process.env.NEXT_PUBLIC_APPWRITE_CHAT_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const chatProjectId = process.env.NEXT_PUBLIC_APPWRITE_CHAT_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const chatBucketId = process.env.NEXT_PUBLIC_APPWRITE_CHAT_BUCKET_ID || bucketId;

const isSameProject =
  chatEndpoint === process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT! &&
  chatProjectId === process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;

const chatClient = isSameProject
  ? client
  : new Client().setEndpoint(chatEndpoint).setProject(chatProjectId);

const chatStorage = isSameProject ? storage : new Storage(chatClient);

/**
 * Upload a file. Uses chatBucketId by default.
 * Pass `useFallbackBucket: true` to force the legacy CMS bucket.
 */
export async function appwrImgUp(
  file: File,
  options?: { useFallbackBucket?: boolean },
) {
  const useFallback = options?.useFallbackBucket;
  const targetBucket = useFallback ? bucketId : chatBucketId;
  const targetStorage = useFallback ? storage : chatStorage;
  try {

    // Upload file using the new object parameter style
    const uploadedFile = await targetStorage.createFile({
      bucketId: targetBucket,
      fileId: ID.unique(),
      file: file
    });

    const fileId = uploadedFile.$id;
    const url = fileIdToProxyUrl(fileId);

    console.log("appwrite proxy url: ", url, "bucket:", targetBucket === chatBucketId ? "primary" : "fallback");

    return { fileId, url };
  } catch (error) {
    console.error("Appwrite Upload Error:", error);
    throw error;
  }
}



export const appwrImgDelete = async (fileId: string): Promise<void> => {
  // Try primary (chat) bucket first, then fallback — each may use a different client
  const targets = [
    { storage: chatStorage, bucketId: chatBucketId },
    { storage: storage, bucketId: bucketId },
  ];
  for (const target of targets) {
    try {
      await target.storage.deleteFile({
        bucketId: target.bucketId,
        fileId: fileId
      });
      console.log(`✅ Deleted image ${fileId} from bucket ${target.bucketId}`);
      return;
    } catch (error: any) {
      if (error?.code === 404 && target.bucketId !== bucketId) continue;
      if (target.bucketId === bucketId) {
        console.error("❌ Error deleting image from Appwrite:", error);
        throw error;
      }
    }
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



