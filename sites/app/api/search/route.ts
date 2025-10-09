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
    // 注意：后端 OpenSearch 已经使用 chinese_analyzer 进行了分词匹配并返回 _score
    // 这里结合 OpenSearch 的分数和前端的辅助评分进行二次排序
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

      // 基础分数来自 OpenSearch 的相关性评分（已经考虑了分词匹配）
      // 将 _score 转换为 0-1000 的范围，作为主要分数
      const baseScore = (article._score || 0) * 100;

      // 前端辅助评分（用于微调排序）
      let bonusScore = 0;

      // 标题完全匹配额外加分
      if (title.includes(query)) {
        bonusScore += 50;
        if (title.startsWith(query)) {
          bonusScore += 25;
        }
      }

      // 摘要完全匹配额外加分
      if (excerpt.includes(query)) {
        bonusScore += 20;
      }

      // 频道名称匹配加分
      if (article.channel?.name?.toLowerCase().includes(query)) {
        bonusScore += 10;
      }

      // 发布时间新鲜度加分（仅作为微调）
      const publishDate = new Date(
        article.publish_at || article.first_published_at
      );
      const now = new Date();
      const daysDiff =
        (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff < 7)
        bonusScore += 5; // 一周内
      else if (daysDiff < 30) bonusScore += 2; // 一个月内

      // 特色文章加分（仅作为微调）
      if (article.is_featured) {
        bonusScore += 5;
      }

      // 最终分数 = OpenSearch 基础分数 + 前端辅助分数
      return baseScore + bonusScore;
    };

    // 简单高亮函数（作为 OpenSearch 高亮的后备方案）
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

    // 处理 OpenSearch 高亮结果
    const getHighlightedText = (
      originalText: string,
      highlightData: any,
      fallbackQuery: string
    ): string => {
      // 优先使用 OpenSearch 原生高亮（支持中文分词）
      if (highlightData) {
        if (typeof highlightData === 'string') {
          return highlightData;
        }
        if (Array.isArray(highlightData) && highlightData.length > 0) {
          return highlightData.join(' ... ');
        }
      }
      // 后备：使用简单高亮
      return makeHighlight(originalText, fallbackQuery);
    };

    // 处理搜索结果：计算相关性分数、过滤、排序
    let processedArticles = articles.map((article: any) => ({
      ...article,
      relevanceScore: calculateRelevanceScore(article, query),
    }));

    // 过滤逻辑优化：根据排序方式决定过滤策略
    const shouldKeepArticle = (article: any) => {
      // 按相关性排序：要求有评分（避免不相关结果）
      if (!sort || sort === "rel" || sort === "relevance") {
        return article.relevanceScore > 0;
      }
      // 按时间或热度排序：保留所有后端返回的结果
      // 因为这些排序不依赖相关性分数，_score 可能为 0
      return true;
    };
    
    processedArticles = processedArticles.filter(shouldKeepArticle);

    // 排序：只有在相关度排序时才使用前端评分排序，否则保持后端排序
    if (!sort || sort === "rel" || sort === "relevance") {
      // 按相关性分数排序（OpenSearch _score + 前端辅助分数）
      processedArticles = processedArticles.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);
    }
    // 如果是按时间或热度排序，保持后端返回的顺序（已由后端 OpenSearch 排序）
    
    const filteredAndSortedArticles = processedArticles;

    // 数据适配 - 将后端数据转换为搜索格式
    const searchResults = {
      success: true,
      message: "搜索成功",
      data: filteredAndSortedArticles.map((article: any) => {
        const originalTitle = article.title || "";
        const originalExcerpt = article.excerpt || article.introduction || "";
        
        // 使用 OpenSearch 原生高亮（如果可用），否则使用简单高亮
        const highlightedTitle = getHighlightedText(
          originalTitle,
          article.highlight?.title,
          query
        );
        const highlightedExcerpt = getHighlightedText(
          originalExcerpt,
          article.highlight?.summary,
          query
        );
        
        return {
          id: article.id,
          title: originalTitle,  // 原始标题（用于显示和链接）
          slug: article.slug,
          excerpt: originalExcerpt,  // 原始摘要
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
          _score: article._score,  // OpenSearch 原始分数
          // 高亮结果（包含 HTML 标记）
          highlight: {
            title: highlightedTitle,
            excerpt: highlightedExcerpt,
            body: article.highlight?.body || []  // 正文片段（可选）
          },
        };
      }),
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
