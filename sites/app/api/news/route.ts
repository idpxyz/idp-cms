import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";

// 指定Node.js runtime，避免edge限制
export const runtime = "nodejs";
export const revalidate = 300; // 5分钟缓存，减少后端请求频率

// URL managed by endpoints service

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const channel = url.searchParams.get("channel") || "recommend"; 
  const page = url.searchParams.get("page") || "1";
  const limit = url.searchParams.get("limit") || "20";

  try {
    // 使用统一的端点管理器构建URL
    // 切换到后端基于 OpenSearch 的门户聚合接口
    const articlesUrl = endpoints.buildUrl(
      endpoints.getCmsEndpoint('/api/portal/articles/'),
      {
        site: getMainSite().hostname,
        page,
        size: limit,
        ...(channel && channel !== "recommend" ? { channel: channel } : {})  
      }
    );

    // 使用统一的fetch配置
    const fetchConfig = endpoints.createFetchConfig({
      timeout: 5000,
      headers: {
        "User-Agent": "IDP-CMS-Portal/1.0",
      },
      next: {
        revalidate: 300,
        tags: [`news:${channel}`, "news:all", `site:localhost`],  
      },
    });

    const response = await fetch(articlesUrl, fetchConfig);

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Upstream error: ${response.status}`,
          upstream_status: response.status,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // 数据适配 - 将基于 OpenSearch 的聚合结果转换为 news 格式
    const list = (data.items || data.data || []) as any[];
    const adaptedData = {
      data: list.map((item: any) => ({
        id: item.id,
        title: item.title,
        slug: item.slug,
        excerpt: item.excerpt || "",
        image_url: item.cover_url || null,
        cover: null,
        channel: item.channel_slug ? { slug: item.channel_slug, name: item.channel_slug } : undefined,
        region: item.region,
        publish_at: item.publish_at,
        updated_at: item.updated_at,
        is_featured: false,
        allow_aggregate: true,
        canonical_url: item.canonical_url,
        source: item.source_site,
        url: `/portal/article/${item.slug}`,
      })),
      pagination: data.pagination || {
        page: Number(page),
        size: Number(limit),
        total: list.length,
        has_next: false,
        has_prev: Number(page) > 1,
      },
      meta: {
        site: getMainSite().hostname,
        channel,
        timestamp: new Date().toISOString(),
      },
    };

    // 构建响应
    const out = new NextResponse(JSON.stringify(adaptedData), {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "Surrogate-Key": `news:${channel} news:all site:localhost`,  
      },
    });

    return out;
  } catch (error) {
    console.error(`News API error for channel ${channel}:`, error);  

    // 返回默认的空数据结构，避免前端崩溃
    const fallbackData = {
      data: [],
      pagination: {
        page: parseInt(page),
        size: parseInt(limit),
        total: 0,
        total_pages: 0,
        has_next: false,
        has_prev: false,
      },
      meta: {
        site: "localhost",
        channel: channel,  
        timestamp: new Date().toISOString(),
        error: "Upstream service unavailable",
      },
    };

    return NextResponse.json(fallbackData, {
      status: 200, // 返回200但包含错误信息
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60", // 短缓存
      },
    });
  }
}
