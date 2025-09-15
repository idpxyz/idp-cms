import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "8");

    if (!query || query.trim() === "") {
      return NextResponse.json({
        success: true,
        data: [],
        query: query || "",
      });
    }

    // 构建后端搜索建议URL
    const params: Record<string, any> = {
      site: getMainSite().hostname,
      q: query.trim(),
      limit: Math.min(limit, 20),
    };

    const cmsUrl = endpoints.buildUrl(
      endpoints.getCmsEndpoint('/api/search/suggest/'),
      params
    );

    // 请求后端API
    const fetchConfig = endpoints.createFetchConfig({
      timeout: 3000, // 搜索建议需要快速响应
    });

    const response = await fetch(cmsUrl, fetchConfig);

    if (!response.ok) {
      console.error("Search suggest API error:", response.status, response.statusText);
      return NextResponse.json({
        success: false,
        data: [],
        query,
        error: "搜索建议服务暂时不可用"
      });
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      },
    });

  } catch (error) {
    console.error("Search suggest error:", error);
    return NextResponse.json({
      success: false,
      data: [],
      query: "",
      error: "搜索建议服务出现错误"
    }, { status: 500 });
  }
}
