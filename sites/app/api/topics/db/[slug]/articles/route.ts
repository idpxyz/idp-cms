import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    
    // 获取查询参数
    const site = searchParams.get('site') || getMainSite().hostname;
    const limit = searchParams.get('limit') || '12';
    const ordering = searchParams.get('ordering') || '-first_published_at';
    const tags = searchParams.get('tags');

    // 构建后端API URL
    const url = new URL(endpoints.getCmsEndpoint(`/api/topics/db/${encodeURIComponent(slug)}/articles/`));
    url.searchParams.set('site', site);
    url.searchParams.set('limit', limit);
    url.searchParams.set('ordering', ordering);
    if (tags) url.searchParams.set('tags', tags);

    const res = await fetch(url.toString(), endpoints.createFetchConfig({ cache: 'no-store' }));
    
    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ 
          results: [], 
          count: 0,
          error: `Topic '${slug}' articles not found` 
        }, { 
          status: 404,
          headers: { 'Cache-Control': 'no-store' }
        });
      }
      return NextResponse.json({ 
        results: [], 
        count: 0,
        error: 'Failed to fetch topic articles' 
      }, { 
        status: res.status,
        headers: { 'Cache-Control': 'no-store' }
      });
    }

    const data = await res.json();
    return NextResponse.json(data, { 
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } 
    });
  } catch (e: any) {
    return NextResponse.json({ 
      results: [], 
      count: 0,
      error: e?.message || 'Unexpected error' 
    }, { 
      status: 500,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
}
