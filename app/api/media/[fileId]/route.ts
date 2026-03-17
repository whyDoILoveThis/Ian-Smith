import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ACTIONS = new Set(["view", "download", "preview"]);

export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const { fileId } = params;

  // Validate fileId format (Appwrite IDs are alphanumeric, 1-36 chars)
  if (!fileId || !/^[a-zA-Z0-9._-]{1,36}$/.test(fileId)) {
    return new NextResponse(null, { status: 400 });
  }

  const action = req.nextUrl.searchParams.get("action") || "view";
  if (!ALLOWED_ACTIONS.has(action)) {
    return new NextResponse(null, { status: 400 });
  }

  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
  const fallbackBucketId = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID!;

  // Chat bucket may live in a completely different Appwrite project/account
  const chatBucketId = process.env.NEXT_PUBLIC_APPWRITE_CHAT_BUCKET_ID;
  const chatEndpoint = process.env.NEXT_PUBLIC_APPWRITE_CHAT_ENDPOINT || endpoint;
  const chatProjectId = process.env.NEXT_PUBLIC_APPWRITE_CHAT_PROJECT_ID || projectId;

  // Determine bucket order: if a chat bucket is configured, try it first
  const buckets: { id: string; endpoint: string; projectId: string; label: "1" | "2" }[] = [];
  if (chatBucketId) {
    buckets.push({ id: chatBucketId, endpoint: chatEndpoint, projectId: chatProjectId, label: "1" });
  }
  buckets.push({ id: fallbackBucketId, endpoint, projectId, label: chatBucketId ? "2" : "1" });

  for (const bucket of buckets) {
    const appwriteUrl = `${bucket.endpoint}/storage/buckets/${bucket.id}/files/${encodeURIComponent(fileId)}/${action}?project=${encodeURIComponent(bucket.projectId)}`;

    try {
      const upstream = await fetch(appwriteUrl);

      if (upstream.ok) {
        const headers = new Headers();
        const contentType = upstream.headers.get("content-type");
        if (contentType) headers.set("Content-Type", contentType);

        const contentLength = upstream.headers.get("content-length");
        if (contentLength) headers.set("Content-Length", contentLength);

        // Appwrite file IDs are immutable — cache aggressively
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
        // Tell the client which bucket served the file (1 = primary, 2 = fallback)
        headers.set("X-Bucket", bucket.label);

        return new NextResponse(upstream.body, { status: 200, headers });
      }

      // Non-success — try next bucket (handles 404, 402 bandwidth exceeded, 403, etc.)
      continue;
    } catch {
      // Network error — try next bucket
      continue;
    }
  }

  // Not found in any bucket
  return new NextResponse(null, { status: 404 });
}
