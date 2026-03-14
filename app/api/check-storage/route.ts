import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/check-storage
 *
 * Checks which fileIds exist in the destination Appwrite bucket.
 * Returns the list of fileIds that are missing (HEAD request returns non-2xx).
 *
 * Body: { endpoint, projectId, bucketId, apiKey, fileIds: string[] }
 * Returns: { missing: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const { endpoint, projectId, bucketId, apiKey, fileIds } =
      (await req.json()) as {
        endpoint: string;
        projectId: string;
        bucketId: string;
        apiKey: string;
        fileIds: string[];
      };

    if (!endpoint || !projectId || !bucketId || !apiKey || !fileIds?.length) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const missing: string[] = [];

    for (const fileId of fileIds) {
      try {
        const url = `${endpoint}/storage/buckets/${bucketId}/files/${fileId}`;
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "X-Appwrite-Project": projectId,
            "X-Appwrite-Key": apiKey,
          },
        });
        if (!res.ok) {
          missing.push(fileId);
        }
      } catch {
        missing.push(fileId);
      }
    }

    return NextResponse.json({ missing });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}
