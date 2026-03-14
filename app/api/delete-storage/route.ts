import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * POST /api/delete-storage
 *
 * Deletes specified files from an Appwrite storage bucket.
 *
 * Body: { endpoint, projectId, bucketId, apiKey, fileIds: string[] }
 * Returns: { deleted: string[], failed: Array<{ fileId: string, error: string }> }
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

    const deleted: string[] = [];
    const failed: Array<{ fileId: string; error: string }> = [];

    for (const fileId of fileIds) {
      try {
        const url = `${endpoint}/storage/buckets/${bucketId}/files/${fileId}`;
        const res = await fetch(url, {
          method: "DELETE",
          headers: {
            "X-Appwrite-Project": projectId,
            "X-Appwrite-Key": apiKey,
          },
        });

        if (res.ok || res.status === 204) {
          deleted.push(fileId);
        } else {
          const errText = await res.text();
          failed.push({
            fileId,
            error: `${res.status} ${errText.slice(0, 100)}`,
          });
        }
      } catch (err) {
        failed.push({
          fileId,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({ deleted, failed });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}
