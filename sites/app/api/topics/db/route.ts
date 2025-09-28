import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const site = searchParams.get('site') || getMainSite().hostname;
    const limit = searchParams.get('limit') || '20';
    const featured_only = searchParams.get('featured_only');
    const fields = searchParams.get('fields');

    const url = new URL(endpoints.getCmsEndpoint('/api/topics/db/'));
    url.searchParams.set('site', site);
    url.searchParams.set('limit', limit);
    if (featured_only) url.searchParams.set('featured_only', featured_only);
    if (fields) url.searchParams.set('fields', fields);

    const res = await fetch(url.toString(), endpoints.createFetchConfig({ cache: 'no-store' }));
    
    if (!res.ok) {
      return NextResponse.json({ 
        topics: [], 
        error: 'Failed to fetch topics' 
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
      topics: [], 
      error: e?.message || 'Unexpected error' 
    }, { 
      status: 500,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
}
