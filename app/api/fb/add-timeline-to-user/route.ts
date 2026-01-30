// app/api/fb/add-timeline-to-user/route.ts
import { fbAddTimelineToUser } from "@/firebase/fbUserManager";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clerkUserId, timelineId } = body;

    if (!clerkUserId || !timelineId) {
      return NextResponse.json(
        { ok: false, error: "clerkUserId and timelineId are required" },
        { status: 400 }
      );
    }

    await fbAddTimelineToUser(clerkUserId, timelineId);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("add-timeline-to-user error:", error);
    return NextResponse.json(
      { ok: false, error: error.message ?? "Failed to add timeline to user" },
      { status: 500 }
    );
  }
}
