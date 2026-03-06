import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/fcm-send
 *
 * Sends a Firebase Cloud Messaging notification to the OTHER slot in the room.
 * Uses the FCM HTTP **v1** API with a Google service account for OAuth2 auth.
 *
 * Body: {
 *   roomPath: string,
 *   senderSlotId: "1" | "2",
 *   senderName: string,
 *   title: string,
 *   body: string,
 *   messageId?: string   ← for client-side dedup
 * }
 *
 * Required env vars:
 *   FIREBASE_SERVICE_ACCOUNT_BASE64  — base64-encoded service account JSON
 *   NEXT_PUBLIC_FIREBASE_DATABASE_URL
 *
 * Token storage: {roomPath}/fcmTokens/{slotId} in RTDB
 */

const FIREBASE_DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
const FIREBASE_PROJECT_ID = "its-portfolio";

// ── Service Account + OAuth2 ─────────────────────────────────────────

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

let cachedServiceAccount: ServiceAccount | null = null;

function getServiceAccount(): ServiceAccount | null {
  if (cachedServiceAccount) return cachedServiceAccount;
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!b64) return null;
  try {
    const json = Buffer.from(b64, "base64").toString("utf-8");
    cachedServiceAccount = JSON.parse(json) as ServiceAccount;
    return cachedServiceAccount;
  } catch {
    return null;
  }
}

// In-memory cached access token
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Build a self-signed JWT and exchange it for a short-lived Google OAuth2
 * access token that can call the FCM v1 API.
 *
 * Uses the Web Crypto API (available in Edge Runtime and Node 18+).
 */
async function getAccessToken(): Promise<string | null> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 60_000) {
    return cachedAccessToken.token;
  }

  const sa = getServiceAccount();
  if (!sa) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };

  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64url");

  const unsignedToken = `${encode(header)}.${encode(payload)}`;

  // Import the RSA private key from PEM
  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const keyBuffer = new Uint8Array(Buffer.from(pemBody, "base64"));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken),
  );

  const jwt = `${unsignedToken}.${Buffer.from(signature).toString("base64url")}`;

  // Exchange JWT for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    console.error("OAuth2 token exchange failed:", await tokenRes.text());
    return null;
  }

  const tokenData = (await tokenRes.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedAccessToken = {
    token: tokenData.access_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  };

  return tokenData.access_token;
}

// ── Helpers ──────────────────────────────────────────────────────────

async function fbGet(path: string) {
  const url = `${FIREBASE_DB_URL}/${path}.json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function fbDelete(path: string) {
  const url = `${FIREBASE_DB_URL}/${path}.json`;
  await fetch(url, { method: "DELETE" });
}

/**
 * Send an FCM message using the **v1 HTTP API**.
 * Requires a valid OAuth2 access token from a service account.
 */
async function sendFCMMessage(
  token: string,
  data: Record<string, string>,
): Promise<{ success: boolean; reason?: string }> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { success: false, reason: "no_service_account" };
  }

  // DATA-ONLY message — no top-level `notification` key.
  // This prevents FCM from auto-displaying a generic notification.
  // Our sw.js onBackgroundMessage handler reads `data` and shows
  // exactly one notification with the correct title/body/tag.
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: {
          token,
          data,
          // Android: high priority so device wakes for data-only msg
          android: {
            priority: "high",
          },
          // Web push: high urgency so browser wakes
          webpush: {
            headers: { Urgency: "high" },
            fcm_options: {
              link: "/about",
            },
          },
          // APNs (iOS): content-available for background delivery
          apns: {
            headers: { "apns-priority": "10" },
            payload: {
              aps: {
                "content-available": 1,
                sound: "default",
              },
            },
          },
        },
      }),
    },
  );

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const errorCode =
      (errorBody as { error?: { details?: { errorCode?: string }[] } })?.error
        ?.details?.[0]?.errorCode || "";
    const status = res.status;

    // Token no longer valid
    if (
      status === 404 ||
      status === 410 ||
      errorCode === "UNREGISTERED" ||
      errorCode === "INVALID_ARGUMENT"
    ) {
      return { success: false, reason: "invalid_token" };
    }

    return {
      success: false,
      reason: `FCM v1 error ${status}: ${JSON.stringify(errorBody)}`,
    };
  }

  return { success: true };
}

// ── Route handler ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      roomPath,
      senderSlotId,
      senderName,
      title,
      body: msgBody,
      messageId,
    } = body;

    if (!roomPath || !senderSlotId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Get the OTHER slot's FCM token
    const otherSlot = senderSlotId === "1" ? "2" : "1";
    const token = await fbGet(`${roomPath}/fcmTokens/${otherSlot}`);

    if (!token || typeof token !== "string") {
      return NextResponse.json({ sent: false, reason: "No FCM token" });
    }

    const tag = body.tag;
    const data: Record<string, string> = {
      title: title || "New message",
      body: msgBody || "You have a new message",
      senderName: senderName || "",
      tag: tag || `chat-${messageId || Date.now()}`,
      url: "/about",
    };
    if (messageId) data.messageId = messageId;

    const result = await sendFCMMessage(token, data);

    if (!result.success && result.reason === "invalid_token") {
      // Clean up stale token
      await fbDelete(`${roomPath}/fcmTokens/${otherSlot}`);
      return NextResponse.json({
        sent: false,
        reason: "Token expired, cleaned up",
      });
    }

    return NextResponse.json({ sent: result.success, reason: result.reason });
  } catch (err) {
    console.error("fcm-send error:", err);
    return NextResponse.json(
      { error: "Failed to send FCM notification" },
      { status: 500 },
    );
  }
}
