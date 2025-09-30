export interface NewsResponse {
  data: any[];
  total?: number;
}

// Removed api-url dependency - using relative paths instead

// 统一新闻获取：透传到本地 /api/news，并兼容多种返回格式
export async function getNews(channel: string, page: number = 1, pageSize: number = 20): Promise<NewsResponse> {
  try {
    const params = new URLSearchParams();
    if (channel) params.set('channel', channel);  // 🎯 统一：保持使用 'channel' 术语
    params.set('page', String(page));
    params.set('size', String(pageSize));
    
    // 🔧 修复SSR环境下的URL解析问题：避免服务器端循环调用
    if (typeof window === 'undefined') {
      // 服务器端：直接调用后端API，避免循环
      const { endpoints } = await import('../config/endpoints');
      const backendUrl = `${endpoints.getCmsEndpoint('/api/portal/articles/')}?${params.toString()}`;
      const res = await fetch(backendUrl, { next: { revalidate: 10 } });
      
      if (!res.ok) {
        console.warn(`getNews backend API failed with status ${res.status}`);
        return { data: [] };
      }
      const json = await res.json();
      return { data: json.items || json.data || json, total: json.total || json.count };
    }
    
    // 客户端：使用相对路径调用Next.js API代理
    const url = `/api/news?${params.toString()}`;
    const res = await fetch(url, { next: { revalidate: 10 } });
    if (!res.ok) {
      console.warn(`getNews fallback due to status ${res.status}`);
      return { data: [] };
    }
    const json = await res.json();
    
    // 🔥 修复：优先从 pagination.total 获取总数
    const total = json?.pagination?.total || json?.total || json?.count;
    
    if (Array.isArray(json?.data)) {
      return { data: json.data, total };
    }
    if (Array.isArray(json?.items)) {
      return { data: json.items, total };
    }
    if (Array.isArray(json)) {
      return { data: json };
    }
    return { data: [] };
  } catch (e) {
    console.error('getNews failed:', e);
    return { data: [] };
  }
}

// 热门话题：统一对接本地接口 /api/hot-topics，并返回数组
export async function getHotTopics(limit: number = 8): Promise<any[]> {
  try {
    const url = new URL('/api/topics', window?.location?.origin || 'http://localhost');
    url.searchParams.set('size', String(Math.max(1, limit)));
    const res = await fetch(url.toString(), { cache: 'no-store', next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`topics ${res.status}`);
    const data = await res.json();
    const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    return (items || []).slice(0, Math.max(1, limit));
  } catch (e) {
    console.error('getHotTopics failed:', e);
    return [];
  }
}

// 兼容性辅助方法（按需使用）
export async function getRecommendedNews(limit: number = 10): Promise<any[]> {
  const res = await getNews('recommend', 1, limit);
  return res.data;
}

export async function getHeadlineNews(): Promise<any | null> {
  const res = await getNews('recommend', 1, 1);
  return res.data[0] || null;
}

export async function getNewsByCategory(category: string, limit: number = 20): Promise<any[]> {
  const res = await getNews(category, 1, limit);
  return res.data;
}
