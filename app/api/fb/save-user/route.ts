// app/api/fb/save-user/route.ts
import { fbGetOrCreateUser } from "@/firebase/fbUserManager";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clerkUserId, displayName, email, imageUrl } = body;

    if (!clerkUserId || !displayName) {
      return NextResponse.json(
        { ok: false, error: "clerkUserId and displayName are required" },
        { status: 400 }
      );
    }

    const user = await fbGetOrCreateUser({
      clerkUserId,
      displayName,
      email: email ?? null,
      imageUrl: imageUrl ?? null,
    });

    return NextResponse.json({ ok: true, data: user });
  } catch (error: any) {
    console.error("save-user error:", error);
    return NextResponse.json(
      { ok: false, error: error.message ?? "Failed to save user" },
      { status: 500 }
    );
  }
}
