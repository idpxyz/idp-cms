import { NextRequest, NextResponse } from 'next/server';
import { endpoints } from '@/lib/config/endpoints';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    
    // 构建查询参数
    const queryParams = new URLSearchParams();
    
    // 传递所有查询参数到后端
    searchParams.forEach((value, key) => {
      queryParams.set(key, value);
    });
    
    // 构建后端API URL
    const backendUrl = endpoints.getCmsEndpoint(
      `/api/articles/${id}/recommendations/?${queryParams.toString()}`
    );
    
    // 转发用户标识头到后端
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // 转发用户识别头部
    const userHeaders = [
      'x-device-id',
      'x-session-id', 
      'x-user-id',
      'user-agent',
      'x-forwarded-for',
      'x-real-ip',
      'host'
    ];
    
    userHeaders.forEach(header => {
      const value = request.headers.get(header);
      if (value) {
        headers[header] = value;
      }
    });
    
    console.log(`[Articles Recommendations API] Fetching: ${backendUrl}`);
    
    // 调用后端API
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
      next: { revalidate: 300 } // 5分钟缓存
    });
    
    if (!response.ok) {
      console.error(`[Articles Recommendations API] Backend error: ${response.status}`);
      
      // API失败时返回降级数据
      return NextResponse.json({
        recommendations: [],
        meta: {
          article_id: parseInt(id),
          limit: parseInt(searchParams.get('limit') || '6'),
          total: 0,
          strategy: 'fallback',
          confidence: 0,
          error: 'Recommendation service unavailable'
        }
      }, { status: 200 }); // 返回200避免前端错误
    }
    
    const data = await response.json();
    
    // 设置缓存头
    const responseHeaders = new Headers();
    responseHeaders.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=120');
    
    // 转发后端的缓存头
    const cacheHeaders = ['etag', 'last-modified'];
    cacheHeaders.forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        responseHeaders.set(header, value);
      }
    });
    
    console.log(`[Articles Recommendations API] Success: ${data?.recommendations?.length || 0} recommendations`);
    
    return NextResponse.json(data, { headers: responseHeaders });
    
  } catch (error) {
    console.error('[Articles Recommendations API] Error:', error);
    
    // 发生错误时返回空推荐列表，避免前端崩溃
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    
    return NextResponse.json({
      recommendations: [],
      meta: {
        article_id: parseInt(id),
        limit: parseInt(searchParams.get('limit') || '6'),
        total: 0,
        strategy: 'error_fallback',
        confidence: 0,
        error: 'Internal server error'
      }
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
      }
    });
  }
}
