import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";

/**
 * 统一后端API代理 - 最佳实践方案
 * 
 * 这是一个通用的API Gateway，处理所有后端API请求
 * 替代Next.js rewrites，提供更好的控制和调试能力
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, 'DELETE');
}

export async function OPTIONS(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
    },
  });
}

async function handleRequest(
  request: NextRequest,
  params: Promise<{ path: string[] }>,
  method: string
) {
  try {
    const { path } = await params;
    
    if (!path || path.length === 0) {
      return NextResponse.json(
        { error: "API路径不能为空", success: false },
        { status: 400 }
      );
    }

    // 重构API路径
    const apiPath = path.join('/');
    
    // 构建后端API URL - 确保以斜杠结尾（Django APPEND_SLASH要求）
    const backendUrl = endpoints.getCmsEndpoint(`/api/${apiPath}${apiPath.endsWith('/') ? '' : '/'}`);
    
    // 提取查询参数
    const url = new URL(request.url);
    const searchParams = url.searchParams.toString();
    const finalUrl = searchParams ? `${backendUrl}?${searchParams}` : backendUrl;
    
    // 准备请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': request.headers.get('User-Agent') || 'NextJS-Backend-Proxy',
    };
    
    // 传递认证头部
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      headers.Authorization = authHeader;
    }
    
    // 传递其他重要头部
    const forwardedFor = request.headers.get('X-Forwarded-For') || request.headers.get('X-Real-IP');
    if (forwardedFor) {
      headers['X-Forwarded-For'] = forwardedFor;
    }

    const hasAuth = !!authHeader;

    console.log('后端API代理请求:', {
      method,
      apiPath,
      backendUrl: finalUrl,
      hasAuth,
      timestamp: new Date().toISOString()
    });

    // 准备请求体
    let body = null;
    if (method !== 'GET' && method !== 'DELETE') {
      try {
        body = await request.text();
      } catch (error) {
        // 忽略请求体解析错误
      }
    }

    // 代理请求到后端
    const response = await fetch(finalUrl, {
      method,
      headers,
      body,
      // 根据API类型设置缓存策略
      next: getCacheStrategy(apiPath)
    });

    if (!response.ok) {
      console.error('后端API请求失败:', {
        status: response.status,
        statusText: response.statusText,
        url: finalUrl,
        method,
        apiPath
      });
      
      return NextResponse.json(
        { 
          error: `后端API请求失败: ${response.status}`,
          success: false,
          path: apiPath
        },
        { status: response.status }
      );
    }

    // 解析响应
    const responseData = await response.text();
    let parsedData;
    
    try {
      parsedData = JSON.parse(responseData);
    } catch {
      // 如果不是JSON，直接返回文本
      const hdrs: Record<string, string> = {
        'Content-Type': response.headers.get('Content-Type') || 'text/plain',
        'Cache-Control': hasAuth ? 'private, no-store, max-age=0' : getCacheControl(apiPath),
      };
      if (hasAuth) {
        hdrs['Vary'] = 'Authorization';
      }
      return new NextResponse(responseData, {
        status: response.status,
        headers: hdrs,
      });
    }
    
    console.log('后端API代理成功:', {
      method,
      apiPath,
      status: response.status,
      hasData: !!parsedData
    });

    // 返回JSON响应
    const jsonHeaders: Record<string, string> = {
      'Cache-Control': hasAuth ? 'private, no-store, max-age=0' : getCacheControl(apiPath),
      'Surrogate-Key': getSurrogateKey(apiPath),
    };
    if (hasAuth) {
      jsonHeaders['Vary'] = 'Authorization';
    }

    return NextResponse.json(parsedData, {
      status: response.status,
      headers: jsonHeaders,
    });

  } catch (error) {
    console.error('后端API代理错误:', error);
    
    return NextResponse.json(
      { 
        error: "后端API代理内部错误",
        success: false,
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

// 根据API路径获取缓存策略
function getCacheStrategy(apiPath: string) {
  if (apiPath.includes('auth/') || apiPath.includes('register') || apiPath.includes('login')) {
    // 🔐 认证相关API，绝对不缓存
    return { revalidate: 0 };
  } else if (apiPath.includes('stats') || apiPath.includes('like') || apiPath.includes('favorite')) {
    // 用户交互相关的API，不应该缓存（包含用户状态）
    return { revalidate: 0 };
  } else if (apiPath.includes('comments')) {
    // 评论数据，包含用户交互状态，不应该缓存
    return { revalidate: 0 };
  } else if (apiPath.includes('articles') || apiPath.includes('news')) {
    // 文章内容，中等缓存
    return { revalidate: 300 };
  } else if (apiPath.includes('channels') || apiPath.includes('categories')) {
    // 结构性数据，长缓存
    return { revalidate: 600 };
  }
  // 默认缓存
  return { revalidate: 60 };
}

// 根据API路径获取缓存控制头
function getCacheControl(apiPath: string): string {
  if (apiPath.includes('auth/') || apiPath.includes('register') || apiPath.includes('login')) {
    // 🔐 认证相关API，禁止任何缓存
    return 'no-store, no-cache, must-revalidate, proxy-revalidate';
  } else if (apiPath.includes('stats') || apiPath.includes('like') || apiPath.includes('favorite')) {
    return 'private, no-cache, must-revalidate';
  } else if (apiPath.includes('comments')) {
    // 评论数据包含用户状态，不应该被公共缓存
    return 'private, no-cache, must-revalidate';
  } else if (apiPath.includes('articles') || apiPath.includes('news')) {
    return 'public, max-age=300, stale-while-revalidate=600';
  } else if (apiPath.includes('channels') || apiPath.includes('categories')) {
    return 'public, max-age=600, stale-while-revalidate=1200';
  }
  return 'public, max-age=60, stale-while-revalidate=120';
}

// 根据API路径获取代理标签
function getSurrogateKey(apiPath: string): string {
  const pathSegments = apiPath.split('/');
  const keys = [`backend:${pathSegments[0]}`];
  
  if (pathSegments.includes('articles')) {
    keys.push('articles');
  }
  if (pathSegments.includes('channels')) {
    keys.push('channels');
  }
  
  return keys.join(' ');
}
