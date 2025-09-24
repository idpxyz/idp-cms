import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";
import { ContentTimingManager } from "@/lib/config/content-timing";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const hours = searchParams.get('hours') || ContentTimingManager.getApiConfig().topicDetailHours.toString(); // 🎯 使用集中化配置
    const channels = searchParams.getAll('channel');

    const url = new URL(endpoints.getCmsEndpoint(`/api/topics/${encodeURIComponent(slug)}/`));
    url.searchParams.set('site', getMainSite().hostname);
    url.searchParams.set('hours', hours);
    channels.forEach(c => url.searchParams.append('channel', c));

    const res = await fetch(url.toString(), endpoints.createFetchConfig({ cache: 'no-store' }));
    if (!res.ok) return NextResponse.json({ topic: null, items: [] }, { status: res.status });
    const data = await res.json();
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ topic: null, items: [] }, { status: 200 });
  }
}


