// app/api/fb/save-timeline/route.ts
import { NextResponse } from "next/server";
import { fbSaveOrUpdateTimeline } from "@/firebase/fbTimelineManager";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Validate minimal fields
    if (!body.name) {
      return NextResponse.json(
        { error: "Missing timeline name" },
        { status: 400 }
      );
    }
    const resp = await fbSaveOrUpdateTimeline(body);
    return NextResponse.json({ ok: true, data: resp });
  } catch (err: any) {
    console.error("API save-timeline error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
