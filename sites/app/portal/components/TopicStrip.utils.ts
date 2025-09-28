/**
 * 专题条带组件的工具函数
 * 用于获取特定专题的文章数据和标签信息
 */

import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";

export interface TopicStripItem {
  id: string;
  title: string;
  excerpt: string;
  image_url: string;
  publish_time: string;
  author: string;
  source: string;
  channel: {
    id: string;
    name: string;
    slug: string;
  };
  topic_importance?: number; // 专题重要度评分 (0-100)
  slug: string;
  is_breaking: boolean;
  is_live: boolean;
  view_count?: number;
  comment_count?: number;
  tags: string[];
}

/**
 * 获取专题的文章列表
 */
export async function getTopicArticles(
  topicSlug: string,
  tag?: string,
  limit: number = 12
): Promise<TopicStripItem[]> {
  try {
    // 构建API查询参数
    const params = new URLSearchParams({
      limit: limit.toString(),
      ordering: '-topic_importance,-first_published_at', // 按专题重要度和发布时间排序
    });
    
    if (tag) {
      params.append('tags', tag);
    }

    // 添加站点参数
    params.append('site', getMainSite().hostname);
    
    // 尝试使用专题文章API
    const topicApiUrl = `/api/topics/db/${topicSlug}/articles?${params.toString()}`;
    
    const topicResponse = await fetch(topicApiUrl, {
      cache: 'no-store', // 专题文章需要实时性
      next: { tags: [`topic-articles-${topicSlug}`, `topic-${topicSlug}`] }
    });

    if (topicResponse.ok) {
      const topicData = await topicResponse.json();
      
      if (topicData.results) {
        return topicData.results.map(transformArticleData);
      }
    }

    // 备用方案：使用一般文章API并过滤专题
    const fallbackParams = new URLSearchParams({
      limit: (limit * 2).toString(), // 获取更多文章以便过滤
      topics: topicSlug,
      ordering: '-first_published_at',
    });
    
    if (tag) {
      fallbackParams.append('tags', tag);
    }

    const fallbackApiUrl = `/api/articles?${fallbackParams.toString()}`;
    const fallbackResponse = await fetch(fallbackApiUrl, {
      cache: 'no-store',
      next: { tags: [`topic-articles-${topicSlug}`] }
    });

    if (fallbackResponse.ok) {
      const fallbackData = await fallbackResponse.json();
      
      if (fallbackData.results) {
        return fallbackData.results
          .slice(0, limit)
          .map(transformArticleData);
      }
    }

    console.warn(`Topic articles API failed for ${topicSlug}, using mock data`);
    return getMockTopicArticles(topicSlug, limit);

  } catch (error) {
    console.error(`Error fetching topic articles for ${topicSlug}:`, error);
    return getMockTopicArticles(topicSlug, limit);
  }
}

/**
 * 转换文章数据为TopicStripItem格式
 */
function transformArticleData(article: any): TopicStripItem {
  return {
    id: article.id?.toString() || String(Math.random()),
    title: article.title || '无标题',
    excerpt: article.summary || article.excerpt || '',
    image_url: article.main_image?.url || article.image_url || '',
    publish_time: article.first_published_at || article.published_at || article.created_at || new Date().toISOString(),
    author: article.author?.name || article.author || '未知作者',
    source: article.source || '专题报道',
    channel: {
      id: article.channel?.id?.toString() || '1',
      name: article.channel?.name || '综合',
      slug: article.channel?.slug || 'general'
    },
    topic_importance: article.topic_importance || Math.floor(Math.random() * 30 + 70), // 默认70-100随机值
    slug: article.slug || `article-${article.id}`,
    is_breaking: article.is_breaking_news || article.is_breaking || false,
    is_live: article.is_live || false,
    view_count: article.view_count || undefined,
    comment_count: article.comment_count || undefined,
    tags: extractTags(article)
  };
}

/**
 * 提取文章标签
 */
function extractTags(article: any): string[] {
  let tags: string[] = [];
  
  // 从不同的标签字段提取
  if (article.tags && Array.isArray(article.tags)) {
    tags = article.tags.map((tag: any) => 
      typeof tag === 'string' ? tag : (tag.name || tag.title || '')
    ).filter(Boolean);
  }
  
  // 从分类中提取标签
  if (article.categories && Array.isArray(article.categories)) {
    const categoryTags = article.categories.map((cat: any) => 
      typeof cat === 'string' ? cat : (cat.name || cat.title || '')
    ).filter(Boolean);
    tags = [...tags, ...categoryTags];
  }
  
  // 从专题标签中提取
  if (article.topic_tags && Array.isArray(article.topic_tags)) {
    const topicTags = article.topic_tags.map((tag: any) => 
      typeof tag === 'string' ? tag : (tag.name || '')
    ).filter(Boolean);
    tags = [...tags, ...topicTags];
  }
  
  // 去重并限制数量
  return Array.from(new Set(tags)).slice(0, 5);
}

/**
 * 模拟专题文章数据（当API不可用时）
 */
function getMockTopicArticles(topicSlug: string, limit: number): TopicStripItem[] {
  const mockArticles: TopicStripItem[] = [];
  
  // 根据专题类型生成不同的模拟数据
  const topicTypes = {
    'breaking': {
      prefix: '突发',
      tags: ['突发事件', '紧急通知', '最新消息'],
      importance: [90, 95, 85, 88, 92]
    },
    'national': {
      prefix: '国家级',
      tags: ['国庆庆典', '重大庆祝', '国家活动'],
      importance: [95, 90, 88, 85, 92]
    },
    'memorial': {
      prefix: '纪念',
      tags: ['纪念活动', '历史回顾', '缅怀先烈'],
      importance: [80, 85, 75, 88, 82]
    },
    'default': {
      prefix: '专题',
      tags: ['重点关注', '深度报道', '特别关注'],
      importance: [75, 80, 70, 85, 78]
    }
  };

  const topicType = Object.keys(topicTypes).find(key => topicSlug.includes(key)) as keyof typeof topicTypes || 'default';
  const config = topicTypes[topicType];

  for (let i = 0; i < limit; i++) {
    mockArticles.push({
      id: `mock-${topicSlug}-${i}`,
      title: `${config.prefix}报道${i + 1}：重要事件进展情况通报`,
      excerpt: `这是关于专题"${topicSlug}"的第${i + 1}篇重要报道，内容详实，值得关注。`,
      image_url: '', // 使用默认占位图
      publish_time: new Date(Date.now() - i * 3600000).toISOString(), // 每篇文章间隔1小时
      author: `记者${i + 1}`,
      source: i === 0 ? '权威发布' : `新闻机构${i}`,
      channel: {
        id: '1',
        name: '综合新闻',
        slug: 'general'
      },
      topic_importance: config.importance[i % config.importance.length],
      slug: `mock-article-${topicSlug}-${i}`,
      is_breaking: topicType === 'breaking' && i < 2, // 突发专题的前两篇标记为突发
      is_live: false,
      view_count: Math.floor(Math.random() * 10000 + 1000),
      comment_count: Math.floor(Math.random() * 100 + 10),
      tags: [
        config.tags[i % config.tags.length],
        i % 2 === 0 ? '重点关注' : '最新动态'
      ]
    });
  }

  return mockArticles;
}

/**
 * 时间格式化函数
 */
export function formatTimeAgo(timeString: string): string {
  const now = new Date();
  const time = new Date(timeString);
  const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return '刚刚';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}分钟前`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}小时前`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}天前`;
  } else {
    return time.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}

/**
 * 数字格式化函数
 */
export function formatNumber(num: number): string {
  if (num < 1000) {
    return num.toString();
  } else if (num < 10000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  } else if (num < 100000000) {
    return (num / 10000).toFixed(1).replace(/\.0$/, '') + '万';
  } else {
    return (num / 100000000).toFixed(1).replace(/\.0$/, '') + '亿';
  }
}
