import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";

export const runtime = "nodejs"; // 需要Node.js运行时
export const revalidate = 0; // 禁用缓存，总是执行

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type"); // preview, og, rss
  const site = url.searchParams.get("site");
  const slug = url.searchParams.get("slug");

  if (!type || !site) {
    return NextResponse.json(
      { error: "missing type or site" },
      { status: 400 }
    );
  }

  try {
    switch (type) {
      case "preview":
        return await handlePreview(req, site, slug || undefined);
      case "og":
        return await handleOpenGraph(req, site, slug || undefined);
      case "rss":
        return await handleRSS(req, site);
      default:
        return NextResponse.json(
          { error: "unsupported type" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error(`${type} error:`, error);
    return NextResponse.json(
      { error: "internal error", type },
      { status: 500 }
    );
  }
}

async function handlePreview(req: NextRequest, site: string, slug?: string) {
  // 预览功能 - 仅服务端调用
  const userAgent = req.headers.get("user-agent") || "";
  if (userAgent.includes("bot") || userAgent.includes("crawler")) {
    return NextResponse.json(
      { error: "preview not available for bots" },
      { status: 403 }
    );
  }

  // 这里可以添加预览权限验证逻辑
  // 例如检查用户是否有预览权限

  const previewData = {
    type: "preview",
    site,
    slug,
    timestamp: new Date().toISOString(),
    expires: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5分钟后过期
  };

  return NextResponse.json(previewData);
}

async function handleOpenGraph(req: NextRequest, site: string, slug?: string) {
  // Open Graph 元数据生成
  const cmsOrigin = endpoints.getCmsEndpoint();

  try {
    // 获取文章数据用于生成OG
    const articleUrl = new URL("/api/v1/articles", cmsOrigin);
    if (slug) {
      articleUrl.pathname = `/api/v1/articles/${slug}`;
    }
    articleUrl.searchParams.set("site", site);

    const response = await fetch(articleUrl.toString(), {
      headers: {
        "x-request-id": req.headers.get("x-request-id") || crypto.randomUUID(),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch article: ${response.status}`);
    }

    const article = await response.json();

    // 生成OG元数据
    const ogData = {
      type: "og",
      site,
      slug,
      title: article.title || "Default Title",
      description: article.excerpt || "Default Description",
      image: article.featured_image || "/default-og-image.jpg",
      url: `${req.nextUrl.origin}/${slug || ""}`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(ogData);
  } catch (error) {
    console.error("OG generation error:", error);
    // 返回默认OG数据
    return NextResponse.json({
      type: "og",
      site,
      slug,
      title: "Default Title",
      description: "Default Description",
      image: "/default-og-image.jpg",
      url: `${req.nextUrl.origin}/${slug || ""}`,
      timestamp: new Date().toISOString(),
    });
  }
}

async function handleRSS(req: NextRequest, site: string) {
  // RSS Feed 生成
      const cmsOrigin = endpoints.getCmsEndpoint();

  try {
    // 获取最新文章列表
    const articlesUrl = new URL("/api/v1/articles", cmsOrigin);
    articlesUrl.searchParams.set("site", site);
    articlesUrl.searchParams.set("limit", "20");
    articlesUrl.searchParams.set("order", "-published_at");

    const response = await fetch(articlesUrl.toString(), {
      headers: {
        "x-request-id": req.headers.get("x-request-id") || crypto.randomUUID(),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch articles: ${response.status}`);
    }

    const articles = await response.json();

    // 生成RSS数据
    const rssData = {
      type: "rss",
      site,
      title: `${site} - Latest News`,
      description: `Latest news from ${site}`,
      link: req.nextUrl.origin,
      items:
        articles.results?.map((article: any) => ({
          title: article.title,
          description: article.excerpt,
          link: `${req.nextUrl.origin}/articles/${article.slug}`,
          pubDate: article.published_at,
          guid: article.id,
        })) || [],
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(rssData);
  } catch (error) {
    console.error("RSS generation error:", error);
    // 返回空的RSS数据
    return NextResponse.json({
      type: "rss",
      site,
      title: `${site} - Latest News`,
      description: `Latest news from ${site}`,
      link: req.nextUrl.origin,
      items: [],
      timestamp: new Date().toISOString(),
    });
  }
}
