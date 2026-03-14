import { NextRequest, NextResponse } from "next/server";

// Allow large request bodies and long execution for video migration
export const maxDuration = 300; // 5 minutes
export const dynamic = "force-dynamic";

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
 * Returns: { results: Array<{ srcFileId, destFileId, destUrl, error?, attempts? }> }
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
      attempts?: number;
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

        // 2. Upload to destination bucket — chunked for large files
        const uploadUrl = `${destEndpoint}/storage/buckets/${destBucketId}/files`;
        const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB per chunk (S3 multipart minimum)
        const totalSize = blob.size;
        const buffer = new Uint8Array(await blob.arrayBuffer());
        let uploaded: { $id: string } | null = null;
        let lastUploadErr = "";

        if (totalSize <= CHUNK_SIZE) {
          // Small file — single upload with retry
          const MAX_RETRIES = 3;
          const RETRY_DELAYS = [3000, 8000, 15000];

          for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            if (attempt > 0) {
              await new Promise((r) =>
                setTimeout(r, RETRY_DELAYS[attempt - 1]),
              );
            }

            const formData = new FormData();
            formData.append("fileId", "unique()");
            formData.append(
              "file",
              new Blob([buffer], { type: blob.type }),
              fileName,
            );

            const uploadRes = await fetch(uploadUrl, {
              method: "POST",
              headers: {
                "X-Appwrite-Project": destProjectId,
                "X-Appwrite-Key": destApiKey,
              },
              body: formData,
            });

            if (uploadRes.ok) {
              uploaded = await uploadRes.json();
              break;
            }

            const errText = await uploadRes.text();
            lastUploadErr = `Upload failed: ${uploadRes.status} ${errText.slice(0, 200)}`;
            if (uploadRes.status < 500) break;
          }
        } else {
          // Large file — chunked upload
          let fileId = "unique()";
          let offset = 0;

          while (offset < totalSize) {
            const end = Math.min(offset + CHUNK_SIZE, totalSize);
            const chunkBuf = buffer.slice(offset, end);
            const isLast = end >= totalSize;

            const formData = new FormData();
            formData.append("fileId", fileId);
            formData.append(
              "file",
              new Blob([chunkBuf], { type: blob.type }),
              fileName,
            );

            // Retry each chunk up to 3 times
            let chunkOk = false;
            for (let attempt = 0; attempt < 4; attempt++) {
              if (attempt > 0) {
                await new Promise((r) =>
                  setTimeout(r, [3000, 8000, 15000][attempt - 1]),
                );
              }

              const uploadRes = await fetch(uploadUrl, {
                method: "POST",
                headers: {
                  "X-Appwrite-Project": destProjectId,
                  "X-Appwrite-Key": destApiKey,
                  "Content-Range": `bytes ${offset}-${end - 1}/${totalSize}`,
                  ...(fileId !== "unique()"
                    ? { "x-appwrite-id": fileId }
                    : {}),
                },
                body: formData,
              });

              if (uploadRes.ok) {
                const json = await uploadRes.json();
                // After first chunk, use the server-assigned ID
                if (offset === 0 && json.$id) {
                  fileId = json.$id;
                }
                if (isLast) {
                  uploaded = json;
                }
                chunkOk = true;
                break;
              }

              const errText = await uploadRes.text();
              lastUploadErr = `Chunk upload failed at ${offset}-${end - 1}: ${uploadRes.status} ${errText.slice(0, 200)}`;
              if (uploadRes.status < 500) break;
            }

            if (!chunkOk) break;
            offset = end;
          }
        }

        if (!uploaded) {
          results.push({
            srcFileId: file.fileId,
            destFileId: null,
            destUrl: null,
            error: lastUploadErr,
          });
          continue;
        }

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
