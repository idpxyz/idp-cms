import { NextRequest, NextResponse } from "next/server";
import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";

// 敏感词检查函数
async function checkSensitiveWords(query: string): Promise<{allowed: boolean, message?: string}> {
  // 基础敏感词列表（实际生产环境应该从数据库或配置文件加载）
  const sensitiveWords = [
    // 政治敏感词
    '法轮功', '法轮大法', '李洪志', '轮子功',
    '天安门事件', '六四事件', '八九民运',
    '藏独', '疆独', '台独', '港独',
    
    // 暴力恐怖
    '恐怖主义', '恐怖分子', '爆炸', '炸弹',
    '杀人', '谋杀', '暗杀', '屠杀',
    
    // 违法犯罪
    '毒品', '贩毒', '吸毒', '海洛因',
    '赌博', '博彩', '六合彩', '赌场',
    '洗钱', '诈骗', '传销', '非法集资',
    
    // 色情低俗
    '色情', '黄色', '裸体', '性交',
    '卖淫', '嫖娼', '援交',
    
    // 迷信邪教
    '邪教', '迷信', '占卜', '算命',
    '风水', '看相', '巫术',
    
    // 其他违规内容
    '翻墙', 'vpn', '代理服务器',
    '反政府', '推翻', '革命',
  ];
  
  const queryLower = query.toLowerCase();
  
  for (const word of sensitiveWords) {
    if (queryLower.includes(word.toLowerCase())) {
      return {
        allowed: false,
        message: "搜索内容包含敏感词，请修改搜索条件"
      };
    }
  }
  
  return { allowed: true };
}

// 参数校验函数
function validateSearchParams(searchParams: URLSearchParams) {
  const errors: string[] = [];
  
  // 校验查询字符串
  const query = searchParams.get("q");
  if (!query || query.trim() === "") {
    errors.push("搜索关键词不能为空");
  } else if (query.length > 200) {
    errors.push("搜索关键词过长，最多200个字符");
  } else {
    // 检查危险字符
    const dangerousPatterns = [
      /[<>'";&]/,                    // 基本XSS字符
      /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b/i, // SQL关键词
      /--|\/\*|\*\//,                // SQL注释
      /<script[^>]*>/i,              // Script标签
      /javascript:/i,                // JavaScript协议
      /on\w+\s*=/i,                  // 事件处理器
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        errors.push("搜索关键词包含非法字符");
        break;
      }
    }
  }
  
  // 校验分页参数
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  
  if (isNaN(page) || page < 1) {
    errors.push("页码必须是大于0的数字");
  } else if (page > 1000) {
    errors.push("页码过大，请使用搜索条件缩小范围");
  }
  
  if (isNaN(limit) || limit < 1 || limit > 50) {
    errors.push("每页数量必须在1-50之间");
  }
  
  // 校验排序参数
  const sort = searchParams.get("sort");
  if (sort) {
    const allowedSorts = ['rel', 'time', 'hot', 'relevance', 'date', 'popularity'];
    if (!allowedSorts.includes(sort.toLowerCase())) {
      errors.push("无效的排序参数");
    }
  }
  
  // 校验时间窗口
  const since = searchParams.get("since");
  if (since) {
    const allowedTimeWindows = ['1h', '3h', '12h', '24h', '3d', '7d', '30d'];
    if (!allowedTimeWindows.includes(since.toLowerCase())) {
      errors.push("无效的时间窗口参数");
    }
  }
  
  // 校验频道参数
  const channel = searchParams.get("channel");
  if (channel) {
    if (!/^[\w\u4e00-\u9fa5-]+$/.test(channel) || channel.length > 50) {
      errors.push("无效的频道参数");
    }
  }
  
  return {
    errors,
    cleanQuery: query ? query.trim().replace(/\s+/g, ' ') : '',
    page,
    limit,
    sort: sort?.toLowerCase(),
    channel,
    since: since?.toLowerCase(),
  };
}

export async function GET(request: NextRequest) {
  try {
    // 参数校验
    const { searchParams } = request.nextUrl;
    const validation = validateSearchParams(searchParams);
    
    if (validation.errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: validation.errors[0],
          errors: validation.errors,
          data: [],
          total: 0,
          page: validation.page || 1,
          limit: validation.limit || 10,
          query: validation.cleanQuery,
        },
        { status: 400 }
      );
    }
    
    const { cleanQuery: query, page, limit, sort, channel, since } = validation;
    const region = searchParams.get("region") || undefined;
    const category = searchParams.get("category") || undefined; // 单选分类（前端）
    const categoriesParam = searchParams.get("categories") || undefined; // 兼容多选（直接透传）

    // 敏感词检查
    const sensitiveWordCheck = await checkSensitiveWords(query);
    if (!sensitiveWordCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: sensitiveWordCheck.message || "搜索内容不符合规范",
          data: [],
          total: 0,
          page,
          limit,
          query,
        },
        { status: 400 }
      );
    }

    // 排序参数映射（后端接收 order，内部再映射至具体字段）
    let orderParam: string | undefined;
    if (sort === "time") {
      orderParam = "-first_published_at"; // 按发布时间倒序
    } else if (sort === "hot") {
      orderParam = "-weight"; // 以权重/热度近似
    } else {
      orderParam = undefined; // 默认相关度由前端二次打分
    }

    // 使用统一的端点管理器构建搜索URL（修正参数名：q/size/order）
    const params: Record<string, any> = {
      site: getMainSite().hostname,
      q: query,
      page,
      size: limit,
    };
    if (orderParam) params.order = orderParam;
    if (channel) params.channel = channel;
    if (region) params.region = region;
    if (since) params.since = since;
    // 分类筛选：优先透传 categories，否则使用单选 category
    if (categoriesParam) params.categories = categoriesParam;
    else if (category) params.categories = category;

    // 切换到 OS 搜索接口
    const cmsUrl = endpoints.buildUrl(
      endpoints.getCmsEndpoint('/api/search/os/'),
      params
    );

    // 使用统一的fetch配置
    const fetchConfig = endpoints.createFetchConfig({
      timeout: 5000,
    });

    const response = await fetch(cmsUrl, fetchConfig);

    if (!response.ok) {
      console.error("CMS API error:", response.status, response.statusText);
      console.error("CMS URL:", cmsUrl);
      const errorText = await response.text().catch(() => "No error text");
      console.error("CMS Error Body:", errorText);
      return NextResponse.json({
        success: false,
        message: "搜索服务暂时不可用",
        data: [],
        total: 0,
        page,
        limit,
        query,
        debug: { status: response.status, url: cmsUrl, error: errorText }
      });
    }

    const data = await response.json();

    // 获取原始文章数据
    const articles = data.items || data.data || [];

    // 计算搜索相关性得分 & 简单高亮
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

    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const makeHighlight = (text: string, q: string) => {
      if (!text || !q) return text || "";
      try {
        const pattern = new RegExp(escapeRegex(q), "ig");
        return String(text).replace(
          pattern,
          (m) => `<em class=\"text-red-500 bg-red-50\">${m}</em>`
        );
      } catch {
        return text;
      }
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
        highlight: {
          title: makeHighlight(article.title, query),
          excerpt: makeHighlight(
            article.excerpt || article.introduction || "",
            query
          ),
        },
      })),
      total: data.pagination?.total || filteredAndSortedArticles.length,
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
