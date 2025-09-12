import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const url = endpoints.getCmsEndpoint('/health/readiness/');
  try {
    const resp = await fetch(url, endpoints.createFetchConfig({ timeout: endpoints.getCmsTimeout() }));
    const data = await resp.json().catch(() => ({}));
    const status = resp.ok ? 200 : 503;
    return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ status: 'error', error: String(e) }, { status: 503 });
  }
}


