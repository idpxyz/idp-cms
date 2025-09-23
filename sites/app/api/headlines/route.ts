import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";

export const runtime = "nodejs";
// 动态缓存时间，由内容类型决定

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
    const excludeClusterIds = searchParams.getAll('exclude_cluster_ids');

    const djangoUrlObj = new URL(endpoints.getCmsEndpoint('/api/headlines/'));
    djangoUrlObj.searchParams.set('size', size);
    djangoUrlObj.searchParams.set('site', site);
    djangoUrlObj.searchParams.set('hours', hours);
    if (region) djangoUrlObj.searchParams.set('region', region);
    if (lang) djangoUrlObj.searchParams.set('lang', lang);
    if (diversity) djangoUrlObj.searchParams.set('diversity', diversity);
    if (cursor) djangoUrlObj.searchParams.set('cursor', cursor);
    channels.forEach(ch => djangoUrlObj.searchParams.append('channel', ch));
    excludeClusterIds.forEach(cid => djangoUrlObj.searchParams.append('exclude_cluster_ids', cid));  
    const djangoUrl = djangoUrlObj.toString();

    const sessionId = request.headers.get('X-Session-ID') || 'anonymous';
    const userAgent = request.headers.get('User-Agent') || 'Next.js-Client';

    const response = await fetch(djangoUrl, endpoints.createFetchConfig({
      method: 'GET',
      headers: {
        'X-Session-ID': sessionId,
        'User-Agent': userAgent,
      },
      // 不在这里设置缓存，由内容类型动态决定
    }));

    if (!response.ok) {
      return NextResponse.json({ success: false, message: 'Headlines backend error' }, { status: response.status });
    }

    const data = await response.json();
    
    // 从后端响应中获取内容类型和缓存策略
    const contentType = response.headers.get('X-Content-Type') || data.content_type || 'normal';
    const backendCacheControl = response.headers.get('Cache-Control') || '';
    
    // 现代化缓存策略
    const cacheConfig = data.cache_strategy || {};
    const gatewayTTL = cacheConfig.gateway_ttl || 60;
    const cdnTTL = cacheConfig.cdn_ttl || 120;
    
    // 构建现代Cache-Control头
    let cacheControl: string;
    
    switch (contentType) {
      case 'breaking':
        cacheControl = `public, max-age=${gatewayTTL}, must-revalidate`;
        break;
      case 'hot':
        cacheControl = `public, max-age=${gatewayTTL}, stale-while-revalidate=${cdnTTL}`;
        break;
      default:
        cacheControl = `public, max-age=${gatewayTTL}, stale-while-revalidate=${cdnTTL}, stale-if-error=300`;
    }
    
    console.log(`🌐 Modern API Gateway: Type=${contentType}, Gateway=${gatewayTTL}s, CDN=${cdnTTL}s`);
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': cacheControl,
        'X-Content-Type': contentType,
        'X-Gateway-TTL': String(gatewayTTL),
        'X-CDN-TTL': String(cdnTTL),
        'X-Cache-Strategy': 'modern-v3',
        'Vary': 'X-Session-ID'
      }
    });
  } catch (err) {
    console.error('Headlines proxy error:', err);
    return NextResponse.json({ success: false, message: 'Headlines backend unavailable' }, { status: 503 });
  }
}


