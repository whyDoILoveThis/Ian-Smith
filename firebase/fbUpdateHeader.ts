// fbCreateBlog.ts
import { db } from "@/lib/firebaseConfig";
import { doc, setDoc, updateDoc } from "firebase/firestore";

interface params {
  header: string;
  tagline: string;
  imageUrl?: string; // Optional image URL
}

export async function fbUpdateHeader({
  header,
  tagline,
  imageUrl,
}: params) {
  try {
    const docRef = doc(db, `header`, "header");
    await updateDoc(docRef, {
      header: header,
      tagline: tagline,
      imageUrl: imageUrl || null, // Set imageUrl if provided, otherwise null
    });
    console.log("Blog created successfully!");
  } catch (error) {
    console.error("Error creating blog:", error);
    // Handle error as needed
  }
}
