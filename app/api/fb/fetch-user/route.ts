// app/api/fb/fetch-user/route.ts
import { fbFetchUserById } from "@/firebase/fbUserManager";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "userId is required" },
        { status: 400 }
      );
    }

    const user = await fbFetchUserById(userId);
    return NextResponse.json({ ok: true, data: user });
  } catch (error: any) {
    console.error("fetch-user error:", error);
    return NextResponse.json(
      { ok: false, error: error.message ?? "Failed to fetch user" },
      { status: 500 }
    );
  }
}
