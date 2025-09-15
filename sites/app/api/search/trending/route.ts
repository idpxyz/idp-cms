import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const window = searchParams.get("window") || "1h";
    const limit = parseInt(searchParams.get("limit") || "10");
    const channel = searchParams.get("channel") || "";

    // 构建后端热搜榜URL
    const params: Record<string, any> = {
      site: getMainSite().hostname,
      window: window,
      limit: Math.min(limit, 50),
    };

    if (channel) {
      params.channel = channel;
    }

    const cmsUrl = endpoints.buildUrl(
      endpoints.getCmsEndpoint('/api/search/trending/'),
      params
    );

    // 请求后端API
    const fetchConfig = endpoints.createFetchConfig({
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await fetch(cmsUrl, fetchConfig);

    if (!response.ok) {
      console.error("CMS URL:", cmsUrl);
      console.error("CMS Response Status:", response.status);
      
      const errorText = await response.text();
      console.error("CMS Error Body:", errorText);
      
      throw new Error(`CMS API error: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error("Trending search API error:", error);
    
    // 降级：返回默认热搜数据
    const fallbackData = {
      success: true,
      data: [
        { text: "今日头条", rank: 1, change: "hot", score: 1000, count: 100 },
        { text: "科技新闻", rank: 2, change: "up", score: 800, count: 80 },
        { text: "财经资讯", rank: 3, change: "up", score: 600, count: 60 },
        { text: "体育赛事", rank: 4, change: "stable", score: 500, count: 50 },
        { text: "娱乐八卦", rank: 5, change: "down", score: 400, count: 40 },
      ],
      window: request.nextUrl.searchParams.get("window") || "1h",
      site: getMainSite().hostname,
      channel: request.nextUrl.searchParams.get("channel") || ""
    };
    
    return NextResponse.json(fallbackData);
  }
}
