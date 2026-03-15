/**
 * Converts an Appwrite storage URL to a proxied `/api/media/[fileId]` URL,
 * keeping project and bucket IDs hidden from the client.
 *
 * - Appwrite URLs → `/api/media/{fileId}`
 * - Non-Appwrite URLs (Firebase, Clerk, etc.) → returned unchanged
 * - Already-proxied URLs → returned unchanged
 */

const APPWRITE_FILE_RE =
  /\/storage\/buckets\/[^/]+\/files\/([^/]+)\/(view|download|preview)/;

export function toProxyUrl(url: string | null | undefined): string {
  if (!url) return "";

  // Already a proxy URL
  if (url.startsWith("/api/media/")) return url;

  const match = url.match(APPWRITE_FILE_RE);
  if (!match) return url; // Not an Appwrite storage URL

  const fileId = match[1];
  const action = match[2];

  let proxyUrl = `/api/media/${fileId}`;
  if (action !== "view") proxyUrl += `?action=${action}`;
  return proxyUrl;
}

/**
 * Build a proxy URL directly from a fileId (for new uploads).
 */
export function fileIdToProxyUrl(fileId: string): string {
  return `/api/media/${fileId}`;
}
