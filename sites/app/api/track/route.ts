import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";

/**
 * 行为跟踪API代理
 * 
 * 将前端的跟踪请求代理到后端，避免外部用户无法访问localhost:8000的问题
 */
export async function POST(request: NextRequest) {
  try {
    // 获取请求数据
    const trackingData = await request.json();
    
    // 构建后端跟踪API URL
    const backendUrl = endpoints.getCmsEndpoint('/api/track/');
    
    console.log('行为跟踪代理请求:', {
      event: trackingData.event,
      backendUrl,
      timestamp: new Date().toISOString()
    });

    // 代理请求到后端
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // 传递原始请求的一些头部
        'User-Agent': request.headers.get('User-Agent') || 'NextJS-Track-Proxy',
        'X-Forwarded-For': request.headers.get('X-Forwarded-For') || 
                          request.headers.get('X-Real-IP') || 
                          'unknown',
      },
      body: JSON.stringify({
        ...trackingData,
        // 添加代理信息
        _proxy: {
          source: 'nextjs-frontend',
          timestamp: new Date().toISOString(),
          original_ip: request.headers.get('X-Forwarded-For') || 
                      request.headers.get('X-Real-IP')
        }
      })
    });

    if (!response.ok) {
      console.error('后端跟踪API请求失败:', {
        status: response.status,
        statusText: response.statusText,
        url: backendUrl
      });
      
      return NextResponse.json(
        { 
          error: `跟踪请求失败: ${response.status}`,
          success: false 
        },
        { status: response.status }
      );
    }

    // 解析后端响应
    const result = await response.json();
    
    console.log('行为跟踪成功:', {
      event: trackingData.event,
      success: true
    });

    return NextResponse.json({
      ...result,
      success: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('行为跟踪代理错误:', error);
    
    return NextResponse.json(
      { 
        error: "跟踪请求处理错误",
        success: false,
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, User-Agent',
    },
  });
}