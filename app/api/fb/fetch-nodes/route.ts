// app/api/fb/fetch-nodes/route.ts
import { NextResponse } from "next/server";
import { fbFetchNodes } from "@/firebase/fbTimelineNodeManager";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const timelineId = searchParams.get("timelineId") || undefined;
    
    const nodes = await fbFetchNodes(timelineId);
    console.log("inside fetch-nodes", nodes.length, "nodes", timelineId ? `for timeline ${timelineId}` : "(all)");
    
    return NextResponse.json({ ok: true, data: nodes });
  } catch (err: any) {
    console.error("API fetch-nodes error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
