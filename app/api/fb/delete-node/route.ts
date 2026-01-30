// app/api/fb/delete-node/route.ts
import { NextResponse } from "next/server";
import { fbDeleteNode } from "@/firebase/fbTimelineNodeManager";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    if (!body.nodeId) {
      return NextResponse.json({ error: "Missing nodeId" }, { status: 400 });
    }

    await fbDeleteNode(body.nodeId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("API delete-node error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
