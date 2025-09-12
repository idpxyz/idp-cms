import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const size = searchParams.get('size') || '8';

    const djangoUrl = `${endpoints.getCmsEndpoint('/api/test/headlines/')}?size=${size}`;

    const response = await fetch(
      djangoUrl,
      endpoints.createFetchConfig({ method: 'GET', timeout: 5000 })
    );
    
    if (!response.ok) {
      return NextResponse.json({ 
        success: false, 
        message: 'Test headlines backend error',
        status: response.status 
      }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
    });
  } catch (err) {
    console.error('Test headlines proxy error:', err);
    return NextResponse.json({ 
      success: false, 
      message: 'Test headlines backend unavailable',
      error: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 503 });
  }
}
