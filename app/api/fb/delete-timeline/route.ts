// app/api/fb/delete-timeline/route.ts
import { NextResponse } from "next/server";
import { fbDeleteTimeline } from "@/firebase/fbTimelineManager";

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const timelineId = searchParams.get("timelineId");

    if (!timelineId) {
      return NextResponse.json(
        { error: "Missing timelineId" },
        { status: 400 }
      );
    }

    await fbDeleteTimeline(timelineId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("API delete-timeline error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
