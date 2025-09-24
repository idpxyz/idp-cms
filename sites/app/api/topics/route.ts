import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";
import { ContentTimingManager } from "@/lib/config/content-timing";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const size = Math.max(1, Math.min(Number(url.searchParams.get('size') || '8'), 20));
  const hours = Math.max(1, Math.min(Number(url.searchParams.get('hours') || ContentTimingManager.getApiConfig().topicsDefaultHours.toString()), 720)); // 🎯 使用集中化配置

  try {
    const cmsUrl = new URL(endpoints.getCmsEndpoint('/api/topics/'));
    cmsUrl.searchParams.set('site', getMainSite().hostname);
    cmsUrl.searchParams.set('size', String(size));
    cmsUrl.searchParams.set('hours', String(hours));

    const res = await fetch(cmsUrl.toString(), endpoints.createFetchConfig({ cache: 'no-store' }));
    if (res.ok) {
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      return NextResponse.json({ items }, {
        status: 200,
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }
      });
    }

    // 上游非200时，直接透传状态并返回空列表与可读错误
    let message = 'Upstream topics service error';
    try {
      const errBody = await res.json();
      message = errBody?.detail || errBody?.error || message;
    } catch {}
    return NextResponse.json({ items: [], error: message }, {
      status: res.status,
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (e: any) {
    return NextResponse.json({ items: [], error: e?.message || 'Unexpected error' }, {
      status: 500,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
}