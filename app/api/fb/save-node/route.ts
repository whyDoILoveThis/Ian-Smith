// app/api/fb/save-node/route.ts
import { NextResponse } from "next/server";
import { fbSaveOrUpdateNode } from "@/firebase/fbTimelineNodeManager";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Validate minimal fields
    if (!body.title || !body.dateMs) {
      return NextResponse.json({ error: "Missing title or dateMs" }, { status: 400 });
    }
    const resp = await fbSaveOrUpdateNode(body);
    return NextResponse.json({ ok: true, data: resp });
  } catch (err: any) {
    console.error("API save-node error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
