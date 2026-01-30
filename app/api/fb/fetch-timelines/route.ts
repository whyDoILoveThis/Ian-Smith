// app/api/fb/fetch-timelines/route.ts
import { NextResponse } from "next/server";
import { fbFetchTimelines } from "@/firebase/fbTimelineManager";

export async function GET() {
  try {
    const timelines = await fbFetchTimelines();
    console.log("inside fetch-timelines", timelines);

    return NextResponse.json({ ok: true, data: timelines });
  } catch (err: any) {
    console.error("API fetch-timelines error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
