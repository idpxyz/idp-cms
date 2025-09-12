import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const url = endpoints.getCmsEndpoint('/health/startup/');
  try {
    const resp = await fetch(url, endpoints.createFetchConfig({ timeout: endpoints.getCmsTimeout() }));
    const text = await resp.text();
    const status = resp.ok ? 200 : 503;
    return new NextResponse(text, { status, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return new NextResponse('NOT_READY', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}


