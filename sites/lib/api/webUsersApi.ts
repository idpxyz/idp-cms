/**
 * Web用户系统API调用工具
 * 
 * 提供与后端用户API的交互接口
 */

import { endpoints } from '@/lib/config/endpoints';

// 🚀 使用重构后的智能endpoints（自动环境感知）
const getBaseUrl = () => endpoints.getUserEndpoint();

// 获取存储的token
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

// 构建认证头
const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

// API响应类型
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    has_next: boolean;
  };
}

// ==================== 用户评论API ====================

export interface UserCommentData {
  id: string;
  content: string;
  article_id: string;
  article_title: string;
  article_slug: string;
  article_channel: string;
  parent?: string;
  parent_content?: string;
  parent_author?: string;
  created_at: string;
  updated_at?: string;
  likes: number;
  status: 'published' | 'pending' | 'rejected';
  user_info: {
    username: string;
    nickname: string;
    avatar: string;
  };
}

export const userCommentsApi = {
  // 获取用户评论列表
  async getComments(params: {
    status?: 'all' | 'published' | 'pending' | 'rejected';
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<UserCommentData[]>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(`${getBaseUrl()}/comments/?${searchParams}`, {
      headers: getAuthHeaders(),
    });

    return response.json();
  },

  // 发表评论
  async addComment(commentData: {
    content: string;
    article_id: string;
    article_title: string;
    article_slug: string;
    article_channel: string;
    parent?: string;
    parent_content?: string;
    parent_author?: string;
  }): Promise<ApiResponse<UserCommentData>> {
    const response = await fetch(`${getBaseUrl()}/comments/add/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(commentData),
    });

    return response.json();
  },

  // 删除评论
  async deleteComment(commentId: string): Promise<ApiResponse> {
    const response = await fetch(`${getBaseUrl()}/comments/${commentId}/delete/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return response.json();
  },
};

// ==================== 用户收藏API ====================

export interface UserFavoriteData {
  id: string;
  article_id: string;
  article_title: string;
  article_slug: string;
  article_channel: string;
  article_excerpt: string;
  article_image_url: string;
  article_publish_time: string;
  created_at: string;
}

export const userFavoritesApi = {
  // 获取收藏列表
  async getFavorites(params: {
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<UserFavoriteData[]>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(`${getBaseUrl()}/favorites/?${searchParams}`, {
      headers: getAuthHeaders(),
    });

    return response.json();
  },

  // 添加收藏
  async addFavorite(favoriteData: {
    article_id: string;
    article_title: string;
    article_slug: string;
    article_channel: string;
    article_excerpt?: string;
    article_image_url?: string;
    article_publish_time?: string;
  }): Promise<ApiResponse<UserFavoriteData>> {
    const response = await fetch(`${getBaseUrl()}/favorites/add/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(favoriteData),
    });

    return response.json();
  },

  // 取消收藏
  async removeFavorite(articleId: string): Promise<ApiResponse> {
    const response = await fetch(`${getBaseUrl()}/favorites/${articleId}/remove/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return response.json();
  },
};

// ==================== 阅读历史API ====================

export interface ReadingHistoryData {
  id: string;
  article_id: string;
  article_title: string;
  article_slug: string;
  article_channel: string;
  read_time: string;
  read_duration: number;
  read_progress: number;
}

export const readingHistoryApi = {
  // 获取阅读历史
  async getHistory(params: {
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<ReadingHistoryData[]>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(`${getBaseUrl()}/history/?${searchParams}`, {
      headers: getAuthHeaders(),
    });

    return response.json();
  },

  // 添加阅读记录
  async addHistory(historyData: {
    article_id: string;
    article_title: string;
    article_slug: string;
    article_channel: string;
    read_duration?: number;
    read_progress?: number;
  }): Promise<ApiResponse<ReadingHistoryData>> {
    const response = await fetch(`${getBaseUrl()}/history/add/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(historyData),
    });

    return response.json();
  },

  // 删除阅读记录
  async deleteHistory(historyId: string): Promise<ApiResponse> {
    const response = await fetch(`${getBaseUrl()}/history/${historyId}/delete/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return response.json();
  },
};

// ==================== 用户互动API ====================

export const userInteractionsApi = {
  // 切换互动状态
  async toggleInteraction(interactionData: {
    target_type: 'article' | 'comment';
    target_id: string;
    interaction_type: 'like' | 'dislike' | 'share' | 'view';
  }): Promise<ApiResponse> {
    const response = await fetch(`${getBaseUrl()}/interactions/toggle/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(interactionData),
    });

    return response.json();
  },

  // 检查互动状态
  async checkInteractions(params: {
    target_ids: string[];
    target_type?: 'article' | 'comment';
  }): Promise<ApiResponse<{ [key: string]: { liked: boolean; favorited: boolean } }>> {
    const searchParams = new URLSearchParams();
    searchParams.append('target_ids', params.target_ids.join(','));
    if (params.target_type) {
      searchParams.append('target_type', params.target_type);
    }

    const response = await fetch(`${getBaseUrl()}/interactions/check/?${searchParams}`, {
      headers: getAuthHeaders(),
    });

    return response.json();
  },
};

// ==================== 用户统计API ====================

export interface UserStatsData {
  articles_read: number;
  comments_count: number;
  favorites_count: number;
  total_read_time: number; // 分钟
  recent_activity: number; // 最近7天
  favorite_channel: string;
}

export const userStatsApi = {
  // 获取用户统计
  async getStats(): Promise<ApiResponse<UserStatsData>> {
    const response = await fetch(`${getBaseUrl()}/stats/`, {
      headers: getAuthHeaders(),
    });

    return response.json();
  },
};
