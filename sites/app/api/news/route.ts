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
  
  // 使用统一的 getMainSite() 获取主站点（会根据环境变量动态返回）
  const siteHostname = getMainSite().hostname;

  try {
    // 特殊处理：Hero轮播数据
    if (channel === "hero") {
      const heroUrl = endpoints.buildUrl(
        endpoints.getCmsEndpoint('/api/articles/'),
        {
          site: siteHostname,
          page,
          size: limit,
          is_hero: "true",
          order: "-weight,-publish_at",
          include: "cover,channel"
        }
      );

      const response = await fetch(heroUrl, endpoints.createFetchConfig({
        timeout: 5000,
        next: {
          revalidate: 30, // Hero内容缓存30秒，便于快速更新
          tags: [`hero:${siteHostname}`, "articles:hero"],
        },
      }));

      if (response.ok) {
        const data = await response.json();
        console.log(`🎬 Hero API: 获取到 ${data.items?.length || 0} 条Hero轮播内容`);
        
        // 转换后端格式为前端期望的格式
        return NextResponse.json({
          data: data.items || [],
          pagination: data.pagination,
          meta: {
            ...data.meta,
            channel: "hero",
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // 使用统一的端点管理器构建URL
    // 优先使用门户聚合接口，如果失败则回退到普通文章接口
    const portalUrl = endpoints.buildUrl(
      endpoints.getCmsEndpoint('/api/portal/articles/'),
      {
        site: siteHostname,
        page,
        size: limit,
        ...(channel && channel !== "recommend" && channel !== "hero" ? { channel: channel } : {})  
      }
    );

    const fallbackUrl = endpoints.buildUrl(
      endpoints.getCmsEndpoint('/api/articles/'),
      {
        site: siteHostname,
        page,
        size: limit,
        ...(channel && channel !== "recommend" && channel !== "hero" ? { channel: channel } : {})  
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

    // 先尝试门户聚合API，如果失败则回退到普通文章API
    let response = await fetch(portalUrl, fetchConfig);
    let usedFallback = false;

    if (!response.ok) {
      console.warn(`Portal API failed with status ${response.status}, trying fallback...`);
      response = await fetch(fallbackUrl, fetchConfig);
      usedFallback = true;
      
      if (!response.ok) {
        return NextResponse.json(
          {
            error: `Both portal and fallback APIs failed. Status: ${response.status}`,
            upstream_status: response.status,
          },
          { status: response.status }
        );
      }
    }

    const data = await response.json();

    // 数据适配 - 将基于 OpenSearch 的聚合结果转换为 news 格式
    const list = (data.items || data.data || []) as any[];
    const adaptedData = {
      data: list.map((item: any) => {
        // 🚀 提取封面图：优先使用 cover_url，否则从 content/html_content 中提取第一张图片
        let imageUrl = item.cover_url || item.image_url || item.cover || null;
        if (!imageUrl) {
          const contentHtml = item.content || item.html_content || item.body || '';
          if (typeof contentHtml === 'string') {
            const imgMatch = contentHtml.match(/<img[^>]*src=["']([^"']+)["']/i);
            if (imgMatch) {
              imageUrl = imgMatch[1];
            }
          }
        }
        
        return {
        id: item.id,
        title: item.title,
        slug: item.slug,
        excerpt: item.excerpt || "",
        image_url: imageUrl,
        cover: null,
        channel: item.channel_slug ? { slug: item.channel_slug, name: item.channel_slug } : undefined,
        region: item.region,
        publish_at: item.publish_at,
        updated_at: item.updated_at,
        is_featured: item.is_featured || false,
        allow_aggregate: true,
        canonical_url: item.canonical_url,
        source: item.source_site,
        url: `/portal/article/${item.slug}`,
        author: item.author,
        has_video: item.has_video || false,
        // 统计数据
        view_count: item.view_count || 0,
        comment_count: item.comment_count || 0,
        like_count: item.like_count || 0,
        favorite_count: item.favorite_count || 0,
        reading_time: item.reading_time || 1,
      };
      }),
      pagination: data.pagination || {
        page: Number(page),
        size: Number(limit),
        total: list.length,
        has_next: false,
        has_prev: Number(page) > 1,
      },
      meta: {
        site: siteHostname,
        channel,
        timestamp: new Date().toISOString(),
      },
    };

    // 构建响应
    // HTTP headers must be ASCII-only, so encode the channel name
    const safeChannel = encodeURIComponent(channel);
    return NextResponse.json(adaptedData, {
      status: response.status,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "Surrogate-Key": `news:${safeChannel} news:all site:${siteHostname}`,  
      },
    });
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
