import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";
import { success, paginated, ErrorResponses, handleError } from "@/lib/api/response";

export const runtime = "nodejs";

// 简易内存缓存与请求合并，降低上游限流风险
type CacheEntry = { ts: number; data: any };
const MEMORY_TTL_MS = 2 * 60 * 1000; // 2分钟微缓存（新闻网站可以接受）
const memoryCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<any>>();

function getCacheKey(url: string) {
  return url;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 获取查询参数
    const size = searchParams.get('size') || '50';
    const sort = searchParams.get('sort') || 'final_score';
    const template = searchParams.get('template');
    const channels = searchParams.getAll('channel');
    const cursor = searchParams.get('cursor');
    const site = searchParams.get('site') || getMainSite().hostname;
    const hours = searchParams.get('hours');

    // 使用统一的端点管理器构建URL
    const djangoUrl = endpoints.buildUrl(
      endpoints.getCmsEndpoint('/api/feed/'),
      {
        size,
        sort,
        site,
        template: template || undefined,
        cursor: cursor || undefined,
        hours: hours || undefined,
        ...Object.fromEntries(channels.map((channel, i) => [`channel${i ? `_${i}` : ''}`, channel]))
      }
    );

    // 处理多个相同参数名的特殊情况
    const finalUrl = new URL(djangoUrl);
    finalUrl.searchParams.delete('channel');
    finalUrl.searchParams.delete('channel_1');
    finalUrl.searchParams.delete('channel_2');
    channels.forEach(channel => {
      finalUrl.searchParams.append('channel', channel);
    });

    // 获取请求头
    const sessionId = request.headers.get('X-Session-ID') || 'anonymous';
    const userAgent = request.headers.get('User-Agent') || 'Next.js-Client';

    // console.log('Proxying feed request to:', djangoUrl.toString()); // 注释掉以减少日志噪音

    // 使用统一的配置创建fetch选项
    const fetchConfig = endpoints.createFetchConfig({
      timeout: endpoints.getCmsTimeout(),
      headers: {
        'X-Session-ID': sessionId,
        'User-Agent': userAgent,
      },
    });

    const final = finalUrl.toString();
    const cacheKey = getCacheKey(final);

    // 命中微缓存
    const now = Date.now();
    const cached = memoryCache.get(cacheKey);
    if (cached && now - cached.ts < MEMORY_TTL_MS) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        },
      });
    }

    // 请求合并：同一个URL并发只发一次
    if (inflight.has(cacheKey)) {
      const data = await inflight.get(cacheKey)!;
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        },
      });
    }

    const p = (async () => {
      const response = await fetch(final, fetchConfig);
      if (!response.ok) return { __error: response.status } as any;
      return await response.json();
    })();
    inflight.set(cacheKey, p);
    let data = await p;
    inflight.delete(cacheKey);

    if ((data as any)?.__error) {
      const status = (data as any).__error as number;
      if (status === 429) {
        return ErrorResponses.rateLimited(60, 'Feed rate limited');
      }
      return NextResponse.json({
        success: false,
        message: 'Backend feed error',
        error: { code: 'BACKEND_ERROR', message: `Backend API error: ${status}` },
      }, { status });
    }

    // 正常：写缓存并返回（兼容旧前端：同时返回 items 与 next_cursor 顶层字段）
    memoryCache.set(cacheKey, { ts: Date.now(), data });

    const items = data.items || [];
    const nextCursor = data.next_cursor || '';
    const out = {
      success: true,
      message: '获取推荐内容成功',
      data: items,
      items,
      next_cursor: nextCursor,
      debug: data.debug,
      meta: {
        cache_status: cached ? 'hit' : 'miss',
      },
    };

    return NextResponse.json(out, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    });

  } catch (error) {
    console.error('Feed API proxy error:', error);
    return ErrorResponses.serviceUnavailable('Feed backend unavailable');
  }
}
