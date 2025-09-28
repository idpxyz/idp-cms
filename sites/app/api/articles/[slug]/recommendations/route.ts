import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    
    // 构建Django API URL - 参考其他API的模式
    const djangoUrlObj = new URL(endpoints.getCmsEndpoint(`/api/articles/${encodeURIComponent(slug)}/recommendations/`));
    
    // 传递查询参数
    searchParams.forEach((value, key) => {
      djangoUrlObj.searchParams.set(key, value);
    });
    
    // 设置默认站点参数
    if (!djangoUrlObj.searchParams.has('site')) {
      djangoUrlObj.searchParams.set('site', 'aivoya.com'); // 临时硬编码测试
    }

    const djangoUrl = djangoUrlObj.toString();

    console.log('推荐API调试信息:', {
      slug,
      djangoUrl,
      environment: typeof window === 'undefined' ? 'server' : 'client',
      cmsOrigin: endpoints.getCmsEndpoint(),
      timestamp: new Date().toISOString()
    });

    // 发起请求 - 使用统一的配置
    const response = await fetch(
      djangoUrl,
      endpoints.createFetchConfig({ 
        method: 'GET', 
        timeout: Math.max(10000, endpoints.getCmsTimeout()),
        headers: {
          // 转发用户标识头
          'X-Forwarded-For': request.headers.get('X-Forwarded-For') || request.headers.get('X-Real-IP') || '',
          'User-Agent': request.headers.get('User-Agent') || 'NextJS-Recommendations-API',
        }
      })
    );

    console.log('推荐API响应信息:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url
    });

    if (!response.ok) {
      console.error('推荐API请求失败:', {
        status: response.status,
        statusText: response.statusText,
        url: djangoUrl,
        slug
      });
      
      // 返回降级响应而不是错误
      return NextResponse.json({
        recommendations: [],
        meta: {
          article_slug: slug,
          limit: parseInt(searchParams.get('limit') || '6'),
          total: 0,
          strategy: 'fallback',
          confidence: 0,
          error: 'Recommendation service unavailable'
        }
      }, { 
        status: 200,
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }
      });
    }

    const data = await response.json();
    
    return NextResponse.json(data, {
      headers: { 
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'Surrogate-Key': `recommendations article:${encodeURIComponent(slug)}`
      }
    });

  } catch (error) {
    console.error('推荐API内部错误:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    
    // 返回降级响应
    return NextResponse.json({
      recommendations: [],
      meta: {
        article_slug: slug,
        limit: parseInt(searchParams.get('limit') || '6'),
        total: 0,
        strategy: 'error_fallback',
        confidence: 0,
        error: 'Internal server error'
      }
    }, { 
      status: 200,
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' }
    });
  }
}
