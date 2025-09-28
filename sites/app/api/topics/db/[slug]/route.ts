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
    const site = searchParams.get('site') || getMainSite().hostname;
    const fields = searchParams.get('fields');
    const include_articles = searchParams.get('include_articles');
    const articles_limit = searchParams.get('articles_limit');

    const url = new URL(endpoints.getCmsEndpoint(`/api/topics/db/${encodeURIComponent(slug)}/`));
    url.searchParams.set('site', site);
    if (fields) url.searchParams.set('fields', fields);
    if (include_articles) url.searchParams.set('include_articles', include_articles);
    if (articles_limit) url.searchParams.set('articles_limit', articles_limit);

    const res = await fetch(url.toString(), endpoints.createFetchConfig({ cache: 'no-store' }));
    
    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ 
          topic: null, 
          error: `Topic '${slug}' not found` 
        }, { 
          status: 404,
          headers: { 'Cache-Control': 'no-store' }
        });
      }
      return NextResponse.json({ 
        topic: null, 
        error: 'Failed to fetch topic' 
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
      topic: null, 
      error: e?.message || 'Unexpected error' 
    }, { 
      status: 500,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
}
