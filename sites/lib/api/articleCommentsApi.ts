/**
 * 文章评论API工具
 * 
 * 提供文章页面评论的加载、发表、点赞等功能
 */

import { endpoints } from '@/lib/config/endpoints';

// 🚀 使用重构后的智能endpoints（自动环境感知）
const getBaseUrl = () => endpoints.getCmsEndpoint();

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
  pagination?: {
    page: number;
    limit: number;
    total: number;
    has_next: boolean;
  };
}

// 评论数据接口
export interface ArticleComment {
  id: string;
  article_id: string;
  article_title: string;
  article_slug: string;
  article_channel: string;
  content: string;
  parent?: string;
  parent_content?: string;
  parent_author?: string;
  status: 'published' | 'pending' | 'rejected';
  likes: number;
  is_liked: boolean; // 当前用户是否点赞
  created_at: string;
  updated_at: string;
  user_info: {
    username: string;
    nickname: string;
    avatar: string;
  };
  replies?: ArticleComment[]; // 嵌套回复
}

// 评论统计接口
export interface CommentStats {
  total_comments: number;
  root_comments: number;
  replies: number;
}

// 文章评论API
export const articleCommentsApi = {
  // 获取文章评论列表
  async getComments(articleId: string, params: {
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<ArticleComment[]>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    // 🚀 性能优化：添加2秒超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    try {
      const response = await fetch(`${getBaseUrl()}/articles/${articleId}/comments/?${searchParams}`, {
        headers: getAuthHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.warn('评论API超时 (2秒):', articleId);
        return {
          success: false,
          message: '加载评论超时',
          data: []
        };
      }
      
      console.error('获取评论失败:', error);
      return {
        success: false,
        message: error.message || '加载评论失败',
        data: []
      };
    }
  },

  // 发表评论
  async addComment(articleId: string, commentData: {
    content: string;
    parent_id?: string;
  }): Promise<ApiResponse<ArticleComment>> {
    const response = await fetch(`${getBaseUrl()}/articles/${articleId}/comments/add/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(commentData),
    });

    return response.json();
  },

  // 切换评论点赞
  async toggleLike(commentId: string, desired?: { like?: boolean }): Promise<ApiResponse<{
    action: 'liked' | 'unliked';
    like_count: number;
    is_liked: boolean;
  }>> {
    const response = await fetch(`${getBaseUrl()}/comments/${commentId}/like/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: desired && typeof desired.like === 'boolean' ? JSON.stringify({ like: desired.like }) : undefined,
    });

    return response.json();
  },

  // 获取评论统计
  async getStats(articleId: string): Promise<ApiResponse<CommentStats>> {
    // 🚀 性能优化：添加1秒超时控制（统计接口应该很快）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);

    try {
      const response = await fetch(`${getBaseUrl()}/articles/${articleId}/comments/stats/`, {
        headers: getAuthHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.warn('评论统计API超时 (1秒):', articleId);
      }
      
      return {
        success: false,
        message: error.message || '获取评论统计失败',
        data: {
          total_comments: 0,
          root_comments: 0,
          replies: 0
        }
      };
    }
  },
};

// 本地评论数据类型
export interface LocalComment {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    nickname: string;
    avatar: string;
  };
  createTime: string;
  likeCount: number;
  isLiked: boolean;
  replies: LocalComment[];
  parentId?: string;
}

// 评论数据转换工具
export const convertApiCommentToLocal = (apiComment: ArticleComment): LocalComment => {
  return {
    id: apiComment.id,
    content: apiComment.content,
    author: {
      id: apiComment.user_info.username,
      username: apiComment.user_info.username,
      nickname: apiComment.user_info.nickname,
      avatar: apiComment.user_info.avatar,
    },
    createTime: apiComment.created_at,
    likeCount: apiComment.likes,
    isLiked: apiComment.is_liked, // 从后端API获取用户点赞状态
    replies: apiComment.replies ? apiComment.replies.map(convertApiCommentToLocal) : [],
    parentId: apiComment.parent,
  };
};
