import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";

export const runtime = "nodejs";
export const revalidate = 10; // 10秒缓存

export async function GET(request: NextRequest) {
  try {
    // 直接代理到Django监控健康检查API
    const djangoUrl = endpoints.getCmsEndpoint('/api/monitoring/health/');
    
    const response = await fetch(djangoUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'IDP-CMS-Portal/1.0',
      },
      // 不缓存，确保获取最新状态
      cache: 'no-store'
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          status: 'error',
          error: `健康检查API错误: ${response.status}`,
          timestamp: new Date().toISOString(),
          components: {
            headlines_api: 'down',
            hot_api: 'down'
          }
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('健康检查代理错误:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        error: '无法获取健康状态',
        details: error instanceof Error ? error.message : '未知错误',
        timestamp: new Date().toISOString(),
        components: {
          headlines_api: 'down',
          hot_api: 'down'
        }
      },
      { status: 500 }
    );
  }
}
