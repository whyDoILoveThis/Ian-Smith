import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

/**
 * POST /api/push-send
 * Sends a push notification to the OTHER slot in the room.
 *
 * Body: { roomPath: string, senderSlotId: "1"|"2", title: string, body: string }
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
const FIREBASE_DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomPath, senderSlotId, title, body: msgBody } = body;

    if (!roomPath || !senderSlotId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Get the OTHER slot's subscription
    const otherSlot = senderSlotId === "1" ? "2" : "1";
    const subscription = await fbGet(
      `${roomPath}/pushSubscriptions/${otherSlot}`
    );

    if (!subscription) {
      return NextResponse.json({ sent: false, reason: "No subscription" });
    }

    const payload = JSON.stringify({
      title: title || "New message",
      body: msgBody || "You have a new message",
      tag: `msg-${Date.now()}`,
      url: "/",
    });

    try {
      await webpush.sendNotification(subscription, payload);
      return NextResponse.json({ sent: true });
    } catch (pushErr: unknown) {
      const err = pushErr as { statusCode?: number };
      // If subscription expired or invalid, clean it up
      if (err.statusCode === 410 || err.statusCode === 404) {
        await fbDelete(`${roomPath}/pushSubscriptions/${otherSlot}`);
        return NextResponse.json({
          sent: false,
          reason: "Subscription expired, cleaned up",
        });
      }
      throw pushErr;
    }
  } catch (err) {
    console.error("push-send error:", err);
    return NextResponse.json(
      { error: "Failed to send push" },
      { status: 500 }
    );
  }
}
