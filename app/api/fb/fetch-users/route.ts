// app/api/fb/fetch-users/route.ts
import { fbFetchAllUsers } from "@/firebase/fbUserManager";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const users = await fbFetchAllUsers();
    return NextResponse.json({ ok: true, data: users });
  } catch (error: any) {
    console.error("fetch-users error:", error);
    return NextResponse.json(
      { ok: false, error: error.message ?? "Failed to fetch users" },
      { status: 500 }
    );
  }
}
