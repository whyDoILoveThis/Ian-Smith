import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * POST /api/list-storage
 *
 * Lists all files in an Appwrite storage bucket.
 * Paginates through all files and returns metadata + preview URLs.
 *
 * Body: { endpoint, projectId, bucketId, apiKey }
 * Returns: { files: Array<{ $id, name, mimeType, sizeOriginal, $createdAt, previewUrl }> }
 */
export async function POST(req: NextRequest) {
  try {
    const { endpoint, projectId, bucketId, apiKey } =
      (await req.json()) as {
        endpoint: string;
        projectId: string;
        bucketId: string;
        apiKey: string;
      };

    if (!endpoint || !projectId || !bucketId || !apiKey) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const allFiles: Array<{
      $id: string;
      name: string;
      mimeType: string;
      sizeOriginal: number;
      $createdAt: string;
      previewUrl: string;
    }> = [];

    const LIMIT = 100;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams();
      params.append("queries[]", JSON.stringify({ method: "limit", values: [LIMIT] }));
      params.append("queries[]", JSON.stringify({ method: "offset", values: [offset] }));
      const listUrl = `${endpoint}/storage/buckets/${bucketId}/files?${params.toString()}`;
      const res = await fetch(listUrl, {
        headers: {
          "X-Appwrite-Project": projectId,
          "X-Appwrite-Key": apiKey,
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json(
          { error: `List failed: ${res.status} — ${errText.slice(0, 300)}` },
          { status: 502 },
        );
      }

      const data = await res.json();
      const files = data.files as Array<{
        $id: string;
        name: string;
        mimeType: string;
        sizeOriginal: number;
        $createdAt: string;
      }>;

      for (const f of files) {
        const previewUrl = `${endpoint}/storage/buckets/${bucketId}/files/${f.$id}/view?project=${projectId}`;
        allFiles.push({ ...f, previewUrl });
      }

      if (files.length < LIMIT) {
        hasMore = false;
      } else {
        offset += LIMIT;
      }
    }

    return NextResponse.json({ files: allFiles });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}
