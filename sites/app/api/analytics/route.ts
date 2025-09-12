/**
 * 分析数据API
 * 从ClickHouse获取用户行为分析数据
 */

import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";

export async function GET(request: NextRequest) {
  try {
    // 使用统一的端点管理器
    const analyticsUrl = endpoints.getCmsEndpoint('/api/analytics');
    const fetchConfig = endpoints.createFetchConfig({
      method: 'GET',
    });

    const response = await fetch(analyticsUrl, fetchConfig);

    if (!response.ok) {
      throw new Error(`CMS API responded with status: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: data.data, // 提取嵌套的data字段
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch analytics data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
