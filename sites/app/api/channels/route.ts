import { NextRequest, NextResponse } from 'next/server';
import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // 使用统一的端点管理器构建URL
  const channelsUrl = endpoints.buildUrl(
    endpoints.getCmsEndpoint('/api/channels'),
    Object.fromEntries(searchParams.entries())
  );

  console.log('Fetching channels from:', channelsUrl);
  
  try {
    // 使用统一的fetch配置
    const fetchConfig = endpoints.createFetchConfig({
      timeout: 15000,
      next: { revalidate: 5 * 60 }, // Cache for 5 minutes
    });

    const response = await fetch(channelsUrl, fetchConfig);

    console.log('Backend channels API response status:', response.status);

    if (!response.ok) {
      console.error(`Backend channels API error: ${response.status} ${response.statusText}`);
      
      // 后端API错误时，直接返回错误，不提供硬编码的fallback
      // 让前端Context处理降级逻辑
      return NextResponse.json({
        error: `Backend API error: ${response.status} ${response.statusText}`,
        channels: [],
        meta: {
          site: getMainSite().hostname,
          total: 0,
          fallback: false
        }
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('Successfully fetched channels from backend:', data.channels?.length || 0);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying channels request:', error);
    
    // 网络错误时返回空数组，让前端Context处理降级
    return NextResponse.json({
      error: 'Network error connecting to backend',
      channels: [],
      meta: {
        site: getMainSite().hostname,
        total: 0,
        fallback: false
      }
    }, { status: 503 });
  }
}