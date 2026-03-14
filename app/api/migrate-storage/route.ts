import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/migrate-storage
 *
 * Migrates a batch of files from one Appwrite storage bucket to another.
 * Downloads each file from the source and uploads it to the destination.
 *
 * Body: {
 *   srcEndpoint, srcProjectId, srcBucketId,
 *   destEndpoint, destProjectId, destBucketId, destApiKey,
 *   files: Array<{ fileId: string; fileName?: string }>
 * }
 *
 * Returns: { results: Array<{ srcFileId, destFileId, destUrl, error? }> }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      srcEndpoint,
      srcProjectId,
      srcBucketId,
      destEndpoint,
      destProjectId,
      destBucketId,
      destApiKey,
      files,
    } = body as {
      srcEndpoint: string;
      srcProjectId: string;
      srcBucketId: string;
      destEndpoint: string;
      destProjectId: string;
      destBucketId: string;
      destApiKey: string;
      files: Array<{ fileId: string; fileName?: string }>;
    };

    if (
      !srcEndpoint ||
      !srcProjectId ||
      !srcBucketId ||
      !destEndpoint ||
      !destProjectId ||
      !destBucketId ||
      !destApiKey ||
      !files?.length
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const results: Array<{
      srcFileId: string;
      destFileId: string | null;
      destUrl: string | null;
      error?: string;
    }> = [];

    for (const file of files) {
      try {
        // 1. Download file from source bucket
        const downloadUrl = `${srcEndpoint}/storage/buckets/${srcBucketId}/files/${file.fileId}/download?project=${srcProjectId}`;
        const downloadRes = await fetch(downloadUrl);
        if (!downloadRes.ok) {
          results.push({
            srcFileId: file.fileId,
            destFileId: null,
            destUrl: null,
            error: `Download failed: ${downloadRes.status}`,
          });
          continue;
        }

        const blob = await downloadRes.blob();

        // Derive filename from content-disposition header or use a fallback
        const disposition = downloadRes.headers.get("content-disposition");
        let fileName = file.fileName || file.fileId;
        if (disposition) {
          const match = disposition.match(/filename="?([^";\n]+)"?/);
          if (match) fileName = match[1];
        }

        // 2. Upload to destination bucket using Appwrite REST API
        const formData = new FormData();
        formData.append("fileId", "unique()");
        formData.append("file", blob, fileName);

        const uploadUrl = `${destEndpoint}/storage/buckets/${destBucketId}/files`;
        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "X-Appwrite-Project": destProjectId,
            "X-Appwrite-Key": destApiKey,
          },
          body: formData,
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          results.push({
            srcFileId: file.fileId,
            destFileId: null,
            destUrl: null,
            error: `Upload failed: ${uploadRes.status} ${errText.slice(0, 200)}`,
          });
          continue;
        }

        const uploaded = await uploadRes.json();
        const destFileId = uploaded.$id;
        const destUrl = `${destEndpoint}/storage/buckets/${destBucketId}/files/${destFileId}/view?project=${destProjectId}`;

        results.push({
          srcFileId: file.fileId,
          destFileId,
          destUrl,
        });
      } catch (err) {
        results.push({
          srcFileId: file.fileId,
          destFileId: null,
          destUrl: null,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}
