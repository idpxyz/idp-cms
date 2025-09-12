import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";

export const runtime = "nodejs";
export const revalidate = 30; // 30秒缓存

export async function GET(request: NextRequest) {
  try {
    // 直接代理到Django监控API
    const djangoUrl = endpoints.getCmsEndpoint('/api/monitoring/dashboard/');
    
    const response = await fetch(djangoUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'IDP-CMS-Portal/1.0',
      },
      // 不缓存，确保获取最新数据
      cache: 'no-store'
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `监控API错误: ${response.status}`,
          status: response.status,
          timestamp: new Date().toISOString()
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
    console.error('监控仪表板代理错误:', error);
    
    return NextResponse.json(
      {
        error: '无法获取监控数据',
        details: error instanceof Error ? error.message : '未知错误',
        timestamp: new Date().toISOString(),
        status: 'error',
        // 提供默认数据避免前端崩溃
        cache_performance: {
          overall_hit_rate: '0%',
          total_requests: 0,
          avg_response_time: '0s',
          cache_hits: 0,
          cache_misses: 0,
        },
        aggregation_apis: {
          headlines_healthy: false,
          headlines_response_time: '0s',
          hot_healthy: false,
          hot_response_time: '0s',
          overall_health: 'error'
        },
        recommendations: [
          {
            type: 'error',
            message: '监控系统连接失败，请检查后端服务'
          }
        ]
      },
      { status: 500 }
    );
  }
}
