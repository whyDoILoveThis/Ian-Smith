import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/push-subscribe
 * Saves a push subscription to Firebase RTDB under the room path.
 *
 * Body: { roomPath: string, slotId: "1"|"2", subscription: PushSubscription }
 *
 * DELETE /api/push-subscribe
 * Removes a push subscription.
 *
 * Body: { roomPath: string, slotId: "1"|"2" }
 */

const FIREBASE_DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

async function fbPut(path: string, data: unknown) {
  const url = `${FIREBASE_DB_URL}/${path}.json`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Firebase PUT failed: ${res.statusText}`);
  return res.json();
}

async function fbDelete(path: string) {
  const url = `${FIREBASE_DB_URL}/${path}.json`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error(`Firebase DELETE failed: ${res.statusText}`);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomPath, slotId, subscription } = body;

    if (!roomPath || !slotId || !subscription) {
      return NextResponse.json(
        { error: "Missing roomPath, slotId, or subscription" },
        { status: 400 }
      );
    }

    // Store subscription under: {roomPath}/pushSubscriptions/{slotId}
    await fbPut(`${roomPath}/pushSubscriptions/${slotId}`, subscription);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("push-subscribe POST error:", err);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomPath, slotId } = body;

    if (!roomPath || !slotId) {
      return NextResponse.json(
        { error: "Missing roomPath or slotId" },
        { status: 400 }
      );
    }

    await fbDelete(`${roomPath}/pushSubscriptions/${slotId}`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("push-subscribe DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete subscription" }, { status: 500 });
  }
}
