// lib/appwriteConfig.ts
import { Client, Databases, Storage, TablesDB } from "appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!) // e.g. "https://fra.cloud.appwrite.io/v1"
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!); // your project ID

export const databases = new Databases(client);
export const tablesDB = new TablesDB(client);
export const storage = new Storage(client);
