import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const size = searchParams.get('size') || '20';
    const site = searchParams.get('site') || getMainSite().hostname;
    const cursor = searchParams.get('cursor') || '';
    const region = searchParams.get('region') || '';
    const lang = searchParams.get('lang') || '';
    const diversity = searchParams.get('diversity') || 'med';
    const excludeClusterIds = searchParams.getAll('exclude_cluster_ids');

    const djangoUrlObj = new URL(endpoints.getCmsEndpoint('/api/hot/'));
    djangoUrlObj.searchParams.set('size', size);
    djangoUrlObj.searchParams.set('site', site);
    if (cursor) djangoUrlObj.searchParams.set('cursor', cursor);
    if (region) djangoUrlObj.searchParams.set('region', region);
    if (lang) djangoUrlObj.searchParams.set('lang', lang);
    if (diversity) djangoUrlObj.searchParams.set('diversity', diversity);
    excludeClusterIds.forEach(id => djangoUrlObj.searchParams.append('exclude_cluster_ids', id));
    const djangoUrl = djangoUrlObj.toString();

    const response = await fetch(
      djangoUrl,
      endpoints.createFetchConfig({ method: 'GET', timeout: Math.max(15000, endpoints.getCmsTimeout()) })
    );
    if (!response.ok) {
      return NextResponse.json({ success: false, message: 'Aggregated hot backend error' }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }
    });
  } catch (err) {
    console.error('Agg hot proxy error:', err);
    return NextResponse.json({ success: false, message: 'Aggregated hot backend unavailable' }, { status: 503 });
  }
}


