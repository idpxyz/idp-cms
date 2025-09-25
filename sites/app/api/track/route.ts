/**
 * ClickHouse埋点数据收集API
 * 代理前端埋点数据到CMS后端
 */

import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { events } = body;

    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: "Invalid events data" },
        { status: 400 }
      );
    }

    // 使用统一的端点管理器
    const trackUrl = endpoints.getCmsEndpoint('/api/track/');
    const fetchConfig = endpoints.createFetchConfig({
      method: 'POST',
      timeout: 3000,
    });

    // 🎯 修复：批量发送事件而不是逐个发送
    try {
      const response = await fetch(trackUrl, {
        ...fetchConfig,
        body: JSON.stringify({ events }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Tracking events rate limited');
          return NextResponse.json({
            success: true,
            processed: events.length,
            successful: 0,
            failed: 0,
            skipped: events.length,
            timestamp: new Date().toISOString(),
          });
        } else {
          console.warn(`Failed to send tracking events:`, response.status);
          return NextResponse.json({
            success: true,
            processed: events.length,
            successful: 0,
            failed: events.length,
            skipped: 0,
            timestamp: new Date().toISOString(),
          });
        }
      }

      const result = await response.json();
      return NextResponse.json({
        success: true,
        processed: events.length,
        successful: result.ok ? events.length : 0,
        failed: result.ok ? 0 : events.length,
        skipped: 0,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error sending tracking events:", error);
      return NextResponse.json({
        success: true,
        processed: events.length,
        successful: 0,
        failed: events.length,
        skipped: 0,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Tracking API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
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
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
