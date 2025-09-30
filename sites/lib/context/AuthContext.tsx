"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { setLoggedInUserId, clearLoggedInUserId } from '@/lib/tracking/user-session';

// 用户类型定义
export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  nickname?: string;
  bio?: string;
  createdAt: string;
  preferences?: {
    channels: string[];
    categories: string[];
    notificationEnabled: boolean;
  };
}

// 认证状态类型
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// 认证上下文类型
interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token 管理工具
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
};

const setStoredToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
};

const removeStoredToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem(USER_KEY);
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
};

const setStoredUser = (user: User): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

import { endpoints } from '@/lib/config/endpoints';

// 认证服务 API 调用
class AuthService {
  private static getBaseUrl() {
    // 🚀 使用重构后的智能endpoints（自动环境感知）
    return endpoints.getUserEndpoint();
  }

  static async login(username: string, password: string): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
    try {
      console.log('Login attempt:', { username });
      
      const response = await fetch(`${this.getBaseUrl()}/auth/login/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // 转换后端用户数据格式到前端格式
        const user: User = {
          id: data.user.id.toString(),
          email: data.user.email,
          username: data.user.username,
          nickname: data.user.nickname || data.user.username,
          avatar: data.user.avatar,
          bio: data.user.bio,
          createdAt: data.user.date_joined,
          preferences: data.user.reading_preferences || {
            channels: [],
            categories: [],
            notificationEnabled: true,
          }
        };
        
        return { success: true, user, token: data.token };
      } else {
        return { success: false, error: data.message || '登录失败' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: '网络错误，请稍后重试' };
    }
  }

  static async register(email: string, password: string, username: string): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
    try {
      console.log('Register attempt:', { email, username });
      
      const response = await fetch(`${this.getBaseUrl()}/auth/register/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username, 
          email, 
          password, 
          confirm_password: password,
          nickname: username 
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // 转换后端用户数据格式到前端格式
        const user: User = {
          id: data.user.id.toString(),
          email: data.user.email,
          username: data.user.username,
          nickname: data.user.nickname || data.user.username,
          avatar: data.user.avatar,
          bio: data.user.bio,
          createdAt: data.user.date_joined,
          preferences: data.user.reading_preferences || {
            channels: [],
            categories: [],
            notificationEnabled: true,
          }
        };
        
        return { success: true, user, token: data.token };
      } else {
        return { success: false, error: data.message || '注册失败' };
      }
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: '网络错误，请稍后重试' };
    }
  }

  static async updateProfile(token: string, data: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log('Update profile:', { data });
      
      const response = await fetch(`${this.getBaseUrl()}/auth/update-profile/`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          nickname: data.nickname,
          bio: data.bio,
          avatar: data.avatar,
          reading_preferences: data.preferences,
        }),
      });
      
      const responseData = await response.json();
      
      if (response.ok && responseData.success) {
        // 转换后端用户数据格式到前端格式
        const user: User = {
          id: responseData.user.id.toString(),
          email: responseData.user.email,
          username: responseData.user.username,
          nickname: responseData.user.nickname || responseData.user.username,
          avatar: responseData.user.avatar,
          bio: responseData.user.bio,
          createdAt: responseData.user.date_joined,
          preferences: responseData.user.reading_preferences || {
            channels: [],
            categories: [],
            notificationEnabled: true,
          }
        };
        
        return { success: true, user };
      } else {
        return { success: false, error: responseData.message || '更新失败' };
      }
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: '更新失败，请稍后重试' };
    }
  }

  static async refreshUser(token: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/auth/profile/`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // 转换后端用户数据格式到前端格式
        const user: User = {
          id: data.user.id.toString(),
          email: data.user.email,
          username: data.user.username,
          nickname: data.user.nickname || data.user.username,
          avatar: data.user.avatar,
          bio: data.user.bio,
          createdAt: data.user.date_joined,
          preferences: data.user.reading_preferences || {
            channels: [],
            categories: [],
            notificationEnabled: true,
          }
        };
        
        return { success: true, user };
      } else {
        return { success: false, error: data.message || '用户信息已过期' };
      }
    } catch (error) {
      console.error('Refresh user error:', error);
      return { success: false, error: '刷新用户信息失败' };
    }
  }
}

// 认证提供者组件
export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // 初始化：检查本地存储的用户状态
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getStoredToken();
      const storedUser = getStoredUser();
      
      if (storedToken && storedUser) {
        // 验证token有效性（模拟）
        const result = await AuthService.refreshUser(storedToken);
        if (result.success && result.user) {
          setAuthState({
            user: result.user,
            isLoading: false,
            isAuthenticated: true,
          });
          
          // ✅ 恢复登录用户的个性化ID
          setLoggedInUserId(result.user.id);
          console.log(`✅ 恢复用户会话：${result.user.username}，已设置个性化ID`);
        } else {
          // Token无效，清除本地存储
          removeStoredToken();
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
          
          // ✅ Token无效时清除个性化ID
          clearLoggedInUserId();
        }
      } else {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    };

    initAuth();
  }, []);

  // 登录
  const login = async (email: string, password: string) => {
    const result = await AuthService.login(email, password);
    
    if (result.success && result.user && result.token) {
      setStoredToken(result.token);
      setStoredUser(result.user);
      setAuthState({
        user: result.user,
        isLoading: false,
        isAuthenticated: true,
      });
      
      // ✅ 设置登录用户ID用于个性化推荐
      setLoggedInUserId(result.user.id);
      console.log(`✅ 用户 ${result.user.username} 登录成功，已设置个性化ID`);
    }
    
    return result;
  };

  // 注册
  const register = async (email: string, password: string, username: string) => {
    const result = await AuthService.register(email, password, username);
    
    if (result.success && result.user && result.token) {
      setStoredToken(result.token);
      setStoredUser(result.user);
      setAuthState({
        user: result.user,
        isLoading: false,
        isAuthenticated: true,
      });
      
      // ✅ 设置登录用户ID用于个性化推荐
      setLoggedInUserId(result.user.id);
      console.log(`✅ 用户 ${result.user.username} 注册成功，已设置个性化ID`);
    }
    
    return result;
  };

  // 登出
  const logout = () => {
    removeStoredToken();
    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
    
    // ✅ 清除登录用户ID，恢复为匿名用户
    clearLoggedInUserId();
    console.log('✅ 用户已登出，已恢复匿名ID');
  };

  // 更新个人资料
  const updateProfile = async (data: Partial<User>) => {
    if (!authState.user) {
      return { success: false, error: '用户未登录' };
    }

    const token = getStoredToken();
    if (!token) {
      return { success: false, error: '认证已过期，请重新登录' };
    }

    const result = await AuthService.updateProfile(token, data);
    
    if (result.success && result.user) {
      setStoredUser(result.user);
      setAuthState(prev => ({
        ...prev,
        user: result.user!,
      }));
    }
    
    return result;
  };

  // 刷新用户信息
  const refreshUser = async () => {
    const token = getStoredToken();
    if (!token) return;

    const result = await AuthService.refreshUser(token);
    if (result.success && result.user) {
      setStoredUser(result.user);
      setAuthState(prev => ({
        ...prev,
        user: result.user!,
      }));
    }
  };

  const contextValue: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// 使用认证上下文的 Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// 认证状态检查 Hook
export function useRequireAuth() {
  const auth = useAuth();
  
  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      // 可以在这里重定向到登录页面
      console.warn('User not authenticated');
    }
  }, [auth.isLoading, auth.isAuthenticated]);
  
  return auth;
}
