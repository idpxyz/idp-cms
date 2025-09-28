import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // 获取查询参数
    const site = searchParams.get('site') || getMainSite().hostname;
    const limit = searchParams.get('limit') || '20';
    const ordering = searchParams.get('ordering') || '-first_published_at';
    const topics = searchParams.get('topics');
    const channels = searchParams.getAll('channel');
    const categories = searchParams.getAll('category');
    const tags = searchParams.get('tags');
    const featured = searchParams.get('featured');
    const page = searchParams.get('page') || '1';

    // 构建后端API URL
    const url = new URL(endpoints.getCmsEndpoint('/api/articles/'));
    url.searchParams.set('site', site);
    url.searchParams.set('limit', limit);
    url.searchParams.set('ordering', ordering);
    url.searchParams.set('page', page);
    
    if (topics) url.searchParams.set('topics', topics);
    if (tags) url.searchParams.set('tags', tags);
    if (featured) url.searchParams.set('featured', featured);
    
    // 添加多个频道和分类参数
    channels.forEach(c => url.searchParams.append('channel', c));
    categories.forEach(c => url.searchParams.append('category', c));

    const res = await fetch(url.toString(), endpoints.createFetchConfig({ cache: 'no-store' }));
    
    if (!res.ok) {
      return NextResponse.json({ 
        results: [], 
        count: 0,
        error: 'Failed to fetch articles' 
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
