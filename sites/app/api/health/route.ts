import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: Date.now(),
      service: "portal",
      check: "liveness",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
      status: 200,
    }
  );
}


