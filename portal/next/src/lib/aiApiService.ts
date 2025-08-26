import { AITool, AINews, AITutorial, AICategory } from '@/types/ai';
import { getCurrentSite } from './siteDetection';

// 使用相对URL，让Next.js的rewrites功能处理API代理
const API_BASE_URL = '';

// 通用的fetch封装，自动添加站点信息
async function fetchWithSite(url: string, options: RequestInit = {}): Promise<Response> {
  const currentSite = getCurrentSite();
  const urlObj = new URL(url, window.location.origin);
  
  // 自动添加站点参数
  if (!urlObj.searchParams.has('site')) {
    urlObj.searchParams.set('site', currentSite);
  }
  
  const headers = {
    "Accept": "application/json",
    "X-Forwarded-Host": typeof window !== 'undefined' ? window.location.hostname : 'localhost',
    "X-Site-ID": currentSite,
    ...options.headers,
  };
  
  return fetch(urlObj.toString(), {
    ...options,
    headers,
  });
}

// AI工具API
export const aiToolsApi = {
  // 获取AI工具列表
  async getTools(params?: {
    category?: string;
    search?: string;
    pricing?: string;
    is_hot?: string;
    is_new?: string;
    page?: number;
    size?: number;
  }): Promise<{
    results: AITool[];
    count: number;
    page: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
    categories: Record<string, number>;
    filters: any;
  }> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.append('category', params.category);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.pricing) searchParams.append('pricing', params.pricing);
    if (params?.is_hot) searchParams.append('is_hot', params.is_hot);
    if (params?.is_new) searchParams.append('is_new', params.is_new);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.size) searchParams.append('size', params.size.toString());

    const response = await fetchWithSite(`${API_BASE_URL}/api/ai-tools?${searchParams}`);
    if (!response.ok) {
      throw new Error('Failed to fetch AI tools');
    }
    return response.json();
  },

  // 获取AI工具详情
  async getToolDetail(toolId: number): Promise<AITool & { related_tools: AITool[] }> {
    const response = await fetchWithSite(`${API_BASE_URL}/api/ai-tools/${toolId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch AI tool detail');
    }
    return response.json();
  },

  // 获取AI工具分类
  async getCategories(): Promise<{ categories: Array<{ id: string; name: string; description: string }> }> {
    const response = await fetchWithSite(`${API_BASE_URL}/api/ai-tools/categories`);
    if (!response.ok) {
      throw new Error('Failed to fetch AI tool categories');
    }
    return response.json();
  },
};

// AI资讯API
export const aiNewsApi = {
  // 获取AI资讯列表
  async getNews(params?: {
    category?: string;
    search?: string;
    is_hot?: string;
    is_top?: string;
    page?: number;
    size?: number;
  }): Promise<{
    results: AINews[];
    count: number;
    page: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
    categories: Record<string, number>;
    filters: any;
  }> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.append('category', params.category);
      if (params?.search) searchParams.append('search', params.search);
      if (params?.is_hot) searchParams.append('is_hot', params.is_hot);
      if (params?.is_top) searchParams.append('is_top', params.is_top);
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.size) searchParams.append('size', params.size.toString());

      const url = `${API_BASE_URL}/api/ai-news?${searchParams}`;
      console.log('[AI News API] Fetching news from:', url);
      
      const response = await fetchWithSite(url);
      console.log('[AI News API] Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AI News API] Response not ok:', response.status, errorText);
        throw new Error(`Failed to fetch AI news: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[AI News API] Successfully fetched news:', data.results?.length || 0, 'items');
      return data;
    } catch (error) {
      console.error('[AI News API] Error in getNews:', error);
      throw error;
    }
  },

  // 获取AI资讯详情
  async getNewsDetail(newsId: number): Promise<AINews & { related_news: AINews[] }> {
    const response = await fetchWithSite(`${API_BASE_URL}/api/ai-news/${newsId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch AI news detail');
    }
    return response.json();
  },

  // 获取AI资讯分类
  async getCategories(): Promise<{ categories: Array<{ id: string; name: string; description: string }> }> {
    const response = await fetchWithSite(`${API_BASE_URL}/api/ai-news/categories`);
    if (!response.ok) {
      throw new Error('Failed to fetch AI news categories');
    }
    return response.json();
  },

  // 获取热门AI资讯
  async getHotNews(): Promise<{ hot_news: AINews[] }> {
    const response = await fetchWithSite(`${API_BASE_URL}/api/ai-news/hot`);
    if (!response.ok) {
      throw new Error('Failed to fetch hot AI news');
    }
    return response.json();
  },
};

// AI教程API
export const aiTutorialsApi = {
  // 获取AI教程列表
  async getTutorials(params?: {
    category?: string;
    difficulty?: string;
    search?: string;
    is_hot?: string;
    is_free?: string;
    page?: number;
    size?: number;
  }): Promise<{
    tutorials: AITutorial[];
    pagination: {
      page: number;
      size: number;
      total: number;
      has_next: boolean;
      has_prev: boolean;
    };
    categories: Record<string, number>;
    difficulties: Record<string, number>;
    filters: any;
  }> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.append('category', params.category);
    if (params?.difficulty) searchParams.append('difficulty', params.difficulty);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.is_hot) searchParams.append('is_hot', params.is_hot);
    if (params?.is_free) searchParams.append('is_free', params.is_free);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.size) searchParams.append('size', params.size.toString());

    const response = await fetchWithSite(`${API_BASE_URL}/api/ai-tutorials?${searchParams}`);
    if (!response.ok) {
      throw new Error('Failed to fetch AI tutorials');
    }
    return response.json();
  },

  // 获取AI教程详情
  async getTutorialDetail(tutorialId: number): Promise<AITutorial & { related_tutorials: AITutorial[] }> {
    const response = await fetchWithSite(`${API_BASE_URL}/api/ai-tutorials/${tutorialId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch AI tutorial detail');
    }
    return response.json();
  },

  // 获取AI教程分类
  async getCategories(): Promise<{ categories: Array<{ id: string; name: string; description: string }> }> {
    const response = await fetchWithSite(`${API_BASE_URL}/api/ai-tutorials/categories`);
    if (!response.ok) {
      throw new Error('Failed to fetch AI tutorial categories');
    }
    return response.json();
  },

  // 获取AI教程难度等级
  async getDifficulties(): Promise<{ difficulties: Array<{ id: string; name: string; description: string }> }> {
    const response = await fetchWithSite(`${API_BASE_URL}/api/ai-tutorials/difficulties`);
    if (!response.ok) {
      throw new Error('Failed to fetch AI tutorial difficulties');
    }
    return response.json();
  },
};
