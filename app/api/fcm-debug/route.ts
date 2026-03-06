import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/fcm-debug
 *
 * Diagnostic endpoint that checks every step of the FCM notification chain.
 * Open this in your browser to see exactly what's working and what's failing.
 *
 * Query params:
 *   ?roomPath=...  (optional — if given, also checks token storage)
 *   ?testSend=true&token=...  (optional — actually send a test FCM message)
 */

const FIREBASE_DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
const FIREBASE_PROJECT_ID = "its-portfolio";

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

export async function GET(req: NextRequest) {
  const results: Record<string, unknown> = {};
  const { searchParams } = new URL(req.url);
  const roomPath = searchParams.get("roomPath");
  const testSend = searchParams.get("testSend") === "true";
  const testToken = searchParams.get("token");

  // ── Step 1: Check env vars ──────────────────────────────────────────
  results["1_env_vars"] = {
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      ? `✅ Set (${process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY.slice(0, 20)}…)`
      : "❌ MISSING",
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY
      ? `✅ Set (${process.env.VAPID_PRIVATE_KEY.slice(0, 10)}…)`
      : "❌ MISSING",
    FIREBASE_SERVICE_ACCOUNT_BASE64: process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
      ? `✅ Set (${process.env.FIREBASE_SERVICE_ACCOUNT_BASE64.slice(0, 20)}…)`
      : "❌ MISSING",
    NEXT_PUBLIC_FIREBASE_DATABASE_URL: FIREBASE_DB_URL
      ? `✅ ${FIREBASE_DB_URL}`
      : "❌ MISSING",
  };

  // ── Step 2: Decode service account ──────────────────────────────────
  let sa: ServiceAccount | null = null;
  try {
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (b64) {
      const json = Buffer.from(b64, "base64").toString("utf-8");
      sa = JSON.parse(json) as ServiceAccount;
      results["2_service_account"] = {
        status: "✅ Decoded successfully",
        client_email: sa.client_email,
        project_id: sa.project_id,
        private_key_starts_with: sa.private_key?.slice(0, 40) || "MISSING",
        private_key_length: sa.private_key?.length || 0,
      };
    } else {
      results["2_service_account"] = { status: "❌ No base64 env var" };
    }
  } catch (err) {
    results["2_service_account"] = {
      status: "❌ Failed to decode",
      error: String(err),
    };
  }

  // ── Step 3: Get OAuth2 access token ─────────────────────────────────
  let accessToken: string | null = null;
  if (sa) {
    try {
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
        Buffer.from(JSON.stringify(obj)).toString("base64url");

      const unsignedToken = `${encode(header)}.${encode(payload)}`;

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
        ["sign"]
      );

      const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        cryptoKey,
        new TextEncoder().encode(unsignedToken)
      );

      const jwt = `${unsignedToken}.${Buffer.from(signature).toString("base64url")}`;

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: jwt,
        }),
      });

      const tokenBody = await tokenRes.json();

      if (tokenRes.ok && tokenBody.access_token) {
        accessToken = tokenBody.access_token;
        results["3_oauth2_token"] = {
          status: "✅ Access token obtained",
          token_preview: `${accessToken.slice(0, 30)}…`,
          expires_in: tokenBody.expires_in,
        };
      } else {
        results["3_oauth2_token"] = {
          status: "❌ Token exchange failed",
          http_status: tokenRes.status,
          response: tokenBody,
        };
      }
    } catch (err) {
      results["3_oauth2_token"] = {
        status: "❌ Exception during token exchange",
        error: String(err),
      };
    }
  } else {
    results["3_oauth2_token"] = { status: "⏭️ Skipped (no service account)" };
  }

  // ── Step 4: Check FCM tokens in RTDB ────────────────────────────────
  if (roomPath && FIREBASE_DB_URL) {
    try {
      const url = `${FIREBASE_DB_URL}/${roomPath}/fcmTokens.json`;
      const res = await fetch(url);
      const tokens = await res.json();

      results["4_rtdb_fcm_tokens"] = {
        status: tokens ? "✅ Tokens found" : "❌ No tokens in RTDB",
        roomPath,
        tokens: tokens
          ? Object.fromEntries(
              Object.entries(tokens).map(([k, v]) => [
                k,
                typeof v === "string"
                  ? `${v.slice(0, 30)}… (${v.length} chars)`
                  : v,
              ])
            )
          : null,
      };
    } catch (err) {
      results["4_rtdb_fcm_tokens"] = {
        status: "❌ Failed to read RTDB",
        error: String(err),
      };
    }

    // Also check Web Push subscriptions for comparison
    try {
      const url = `${FIREBASE_DB_URL}/${roomPath}/pushSubscriptions.json`;
      const res = await fetch(url);
      const subs = await res.json();
      results["4b_rtdb_push_subscriptions"] = {
        status: subs ? "✅ Found" : "⚠️ None",
        slots: subs ? Object.keys(subs) : [],
      };
    } catch {
      results["4b_rtdb_push_subscriptions"] = { status: "❌ Failed to read" };
    }
  } else {
    results["4_rtdb_fcm_tokens"] = {
      status: "⏭️ Skipped (add ?roomPath=... to check)",
    };
  }

  // ── Step 5: Test send (optional) ────────────────────────────────────
  if (testSend && testToken && accessToken) {
    try {
      const fcmRes = await fetch(
        `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token: testToken,
              notification: {
                title: "🔔 FCM Test",
                body: "If you see this, FCM is working!",
              },
              data: {
                title: "🔔 FCM Test",
                body: "If you see this, FCM is working!",
                tag: `fcm-test-${Date.now()}`,
                url: "/about",
              },
              webpush: {
                headers: { Urgency: "high" },
                notification: {
                  title: "🔔 FCM Test",
                  body: "If you see this, FCM is working!",
                  icon: "/icons/icon-192x192.png",
                  vibrate: [100, 50, 100],
                  tag: `fcm-test-${Date.now()}`,
                },
                fcm_options: {
                  link: "/about",
                },
              },
            },
          }),
        }
      );

      const fcmBody = await fcmRes.json();

      results["5_test_send"] = {
        status: fcmRes.ok ? "✅ Message sent!" : "❌ Send failed",
        http_status: fcmRes.status,
        response: fcmBody,
      };
    } catch (err) {
      results["5_test_send"] = {
        status: "❌ Exception during send",
        error: String(err),
      };
    }
  } else if (testSend && !testToken) {
    results["5_test_send"] = {
      status: "⏭️ Add &token=YOUR_FCM_TOKEN to test sending",
    };
  }

  // ── Summary ─────────────────────────────────────────────────────────
  const allGood =
    !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    !!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 &&
    !!sa &&
    !!accessToken;

  results["0_summary"] = {
    overall: allGood
      ? "✅ Server-side FCM chain looks good"
      : "❌ Issues found — check details below",
    next_steps: !allGood
      ? "Fix the ❌ items above"
      : roomPath
        ? "Check step 4 for tokens. If tokens exist, add &testSend=true&token=PASTE_TOKEN to test delivery."
        : "Add ?roomPath=YOUR_ROOM_PATH to check if FCM tokens are stored in RTDB",
  };

  return NextResponse.json(results, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
