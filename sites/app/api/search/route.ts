import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!query || query.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          message: "搜索关键词不能为空",
          data: [],
          total: 0,
          page,
          limit,
          query: query || "",
        },
        { status: 400 }
      );
    }

    // 使用统一的端点管理器构建搜索URL
    const cmsUrl = endpoints.buildUrl(
      endpoints.getCmsEndpoint('/api/articles/'),
      {
        site: getMainSite().hostname,
        search: query,
        page,
        limit,
        ordering: '-first_published_at'
      }
    );

    // 使用统一的fetch配置
    const fetchConfig = endpoints.createFetchConfig({
      timeout: 5000,
    });

    const response = await fetch(cmsUrl, fetchConfig);

    if (!response.ok) {
      console.error("CMS API error:", response.status, response.statusText);
      return NextResponse.json({
        success: false,
        message: "搜索服务暂时不可用",
        data: [],
        total: 0,
        page,
        limit,
      });
    }

    const data = await response.json();

    // 获取原始文章数据
    const articles = data.items || data.data || [];

    // 计算搜索相关性得分
    const calculateRelevanceScore = (
      article: any,
      searchQuery: string
    ): number => {
      const query = searchQuery.toLowerCase();
      const title = (article.title || "").toLowerCase();
      const excerpt = (
        article.excerpt ||
        article.introduction ||
        ""
      ).toLowerCase();

      let score = 0;

      // 标题完全匹配得分最高
      if (title.includes(query)) {
        score += 100;
        // 标题开头匹配额外加分
        if (title.startsWith(query)) {
          score += 50;
        }
      }

      // 摘要匹配得分中等
      if (excerpt.includes(query)) {
        score += 30;
      }

      // 频道名称匹配
      if (article.channel?.name?.toLowerCase().includes(query)) {
        score += 20;
      }

      // 发布时间越新得分越高
      const publishDate = new Date(
        article.publish_at || article.first_published_at
      );
      const now = new Date();
      const daysDiff =
        (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff < 7)
        score += 10; // 一周内
      else if (daysDiff < 30) score += 5; // 一个月内

      // 特色文章加分
      if (article.is_featured) {
        score += 15;
      }

      return score;
    };

    // 过滤和排序搜索结果
    const filteredAndSortedArticles = articles
      .map((article: any) => ({
        ...article,
        relevanceScore: calculateRelevanceScore(article, query),
      }))
      .filter((article: any) => article.relevanceScore > 0) // 只保留有相关性的结果
      .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore) // 按相关性排序
      .slice(0, limit); // 限制结果数量

    // 数据适配 - 将Wagtail的articles数据转换为搜索格式
    const searchResults = {
      success: true,
      message: "搜索成功",
      data: filteredAndSortedArticles.map((article: any) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt || article.introduction || "",
        image_url: article.cover?.url || null,
        cover: article.cover,
        channel: article.channel,
        region: article.region,
        publish_at: article.publish_at || article.first_published_at,
        updated_at: article.updated_at || article.last_published_at,
        is_featured: article.is_featured || false,
        allow_aggregate: article.allow_aggregate !== false,
        canonical_url: article.canonical_url,
        source: article.channel?.name,
        url: `/portal/article/${article.slug}`,
        relevanceScore: article.relevanceScore,
      })),
      total: filteredAndSortedArticles.length,
      page,
      limit,
      query,
    };

    return NextResponse.json(searchResults, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "搜索服务出现错误",
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      },
      { status: 500 }
    );
  }
}
