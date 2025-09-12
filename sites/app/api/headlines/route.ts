import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const size = searchParams.get('size') || '8';
    const site = searchParams.get('site') || getMainSite().hostname;
    const hours = searchParams.get('hours') || '24';
    const region = searchParams.get('region') || '';
    const lang = searchParams.get('lang') || '';
    const diversity = searchParams.get('diversity') || '';
    const cursor = searchParams.get('cursor') || '';
    const channels = searchParams.getAll('channel');

    const djangoUrlObj = new URL(endpoints.getCmsEndpoint('/api/headlines/'));
    djangoUrlObj.searchParams.set('size', size);
    djangoUrlObj.searchParams.set('site', site);
    djangoUrlObj.searchParams.set('hours', hours);
    if (region) djangoUrlObj.searchParams.set('region', region);
    if (lang) djangoUrlObj.searchParams.set('lang', lang);
    if (diversity) djangoUrlObj.searchParams.set('diversity', diversity);
    if (cursor) djangoUrlObj.searchParams.set('cursor', cursor);
    channels.forEach(ch => djangoUrlObj.searchParams.append('channel', ch));
    const djangoUrl = djangoUrlObj.toString();

    const sessionId = request.headers.get('X-Session-ID') || 'anonymous';
    const userAgent = request.headers.get('User-Agent') || 'Next.js-Client';

    const response = await fetch(djangoUrl, endpoints.createFetchConfig({
      method: 'GET',
      headers: {
        'X-Session-ID': sessionId,
        'User-Agent': userAgent,
      },
    }));

    if (!response.ok) {
      return NextResponse.json({ success: false, message: 'Headlines backend error' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      }
    });
  } catch (err) {
    console.error('Headlines proxy error:', err);
    return NextResponse.json({ success: false, message: 'Headlines backend unavailable' }, { status: 503 });
  }
}


