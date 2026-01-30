import { NextResponse } from "next/server";

export async function GET() {
  const data = new Uint8Array(64 * 1024); // 64KB
  return new NextResponse(data);
}
