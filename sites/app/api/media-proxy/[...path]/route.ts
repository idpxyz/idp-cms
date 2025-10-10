import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";

/**
 * 媒体代理API - 代理后端的媒体请求
 * 
 * 解决外部用户无法访问localhost:8000图片的问题
 * 将 /api/media-proxy/xxx 请求代理到后端的 /xxx
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    
    if (!path || path.length === 0) {
      return NextResponse.json(
        { error: "媒体路径不能为空" },
        { status: 400 }
      );
    }

    // 重构原始路径
    const mediaPath = path.join('/');
    
    // 构建后端媒体URL - 修复路径问题
    const backendUrl = endpoints.getCmsEndpoint(`/api/media/proxy/${mediaPath}`);
    
    // 🚀 性能优化：检查条件请求（304响应）
    const ifNoneMatch = request.headers.get('If-None-Match');
    const ifModifiedSince = request.headers.get('If-Modified-Since');
    
    // 代理请求到后端
    const fetchHeaders: HeadersInit = {
      // 传递原始请求的一些头部
      'Accept': request.headers.get('Accept') || 'image/webp,image/*,*/*',
      'User-Agent': request.headers.get('User-Agent') || 'NextJS-Media-Proxy',
    };
    
    // 传递条件请求头部以支持304响应
    if (ifNoneMatch) {
      fetchHeaders['If-None-Match'] = ifNoneMatch;
    }
    if (ifModifiedSince) {
      fetchHeaders['If-Modified-Since'] = ifModifiedSince;
    }
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: fetchHeaders,
      // 🚀 加强缓存：24小时缓存，适合不常变化的图片
      next: { revalidate: 86400 }
    });

    // 🚀 性能优化：支持304 Not Modified响应
    if (response.status === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        }
      });
    }

    if (!response.ok) {
      console.error('后端媒体请求失败:', {
        status: response.status,
        statusText: response.statusText,
        url: backendUrl
      });
      
      return NextResponse.json(
        { error: `媒体资源获取失败: ${response.status}` },
        { status: response.status }
      );
    }

    // 获取媒体数据
    const mediaData = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    const contentLength = response.headers.get('Content-Length');
    const lastModified = response.headers.get('Last-Modified');
    const etag = response.headers.get('ETag');

    // 创建响应
    const proxyResponse = new NextResponse(mediaData);
    
    // 设置适当的头部
    proxyResponse.headers.set('Content-Type', contentType);
    if (contentLength) {
      proxyResponse.headers.set('Content-Length', contentLength);
    }
    if (lastModified) {
      proxyResponse.headers.set('Last-Modified', lastModified);
    }
    if (etag) {
      proxyResponse.headers.set('ETag', etag);
    }
    
    // 🚀 强化缓存头部：24小时强缓存，7天stale-while-revalidate
    proxyResponse.headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800, immutable');
    
    // CORS头部（如果需要）
    proxyResponse.headers.set('Access-Control-Allow-Origin', '*');
    proxyResponse.headers.set('Access-Control-Allow-Methods', 'GET');

    return proxyResponse;

  } catch (error) {
    console.error('媒体代理错误:', error);
    
    return NextResponse.json(
      { 
        error: "媒体代理内部错误",
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

// 支持OPTIONS请求（CORS预检）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, User-Agent',
    },
  });
}
