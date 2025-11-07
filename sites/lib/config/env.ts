/**
 * 环境变量统一管理
 * 遵循SOLID原则：单一职责、类型安全、默认值管理
 */

// 环境变量配置接口 - 扩展版本
interface EnvConfig {
  // 后端服务配置 (统一命名)
  CMS_ORIGIN: string;              // 内部Docker网络访问
  CMS_PUBLIC_URL: string;          // 外部公开访问
  CMS_TIMEOUT: number;
  
  // 前端服务配置
  FRONTEND_ORIGIN: string;         // 主前端服务
  FRONTEND_PUBLIC_URL: string;     // Sites前端服务
  NEXT_PUBLIC_SITE_URL: string;    // Next.js公开URL (向后兼容)
  FRONTEND_TIMEOUT: number;
  
  // 搜索服务配置
  SEARCH_ORIGIN: string;
  SEARCH_TIMEOUT: number;
  
  // 媒体服务配置
  MEDIA_BASE_URL: string;          // 媒体文件外部访问
  MEDIA_INTERNAL_URL: string;      // 媒体文件内部访问
  
  // 数据库配置
  DATABASE_URL?: string;
  
  // 缓存配置
  REDIS_URL?: string;
  
  // 安全配置
  HMAC_SECRET?: string;
  JWT_SECRET?: string;
  CACHE_SECRET?: string;
  
  // 系统配置
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  SITE_HOSTNAME: string;
  
  // 缓存配置
  CACHE_REVALIDATE_TIME: number;
  CACHE_STALE_WHILE_REVALIDATE: number;
  PROXY_TIMEOUT: number;
  
  // 调试配置
  DEBUG_ENABLED: boolean;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
  
  // 站点白名单
  ALLOWED_SITES: string[];
}

// 默认配置 - 扩展版本
const DEFAULT_CONFIG: EnvConfig = {
  // 后端服务默认值
  CMS_ORIGIN: 'http://authoring:8000',
  CMS_PUBLIC_URL: 'http://localhost:8000',
  CMS_TIMEOUT: 5000,
  
  // 前端服务默认值
  FRONTEND_ORIGIN: 'http://localhost:3000',
  FRONTEND_PUBLIC_URL: 'http://localhost:3001',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3001',
  FRONTEND_TIMEOUT: 3000,
  
  // 搜索服务默认值
  SEARCH_ORIGIN: 'http://localhost:9200',
  SEARCH_TIMEOUT: 2000,
  
  // 媒体服务默认值
  MEDIA_BASE_URL: 'http://localhost:8000',
  MEDIA_INTERNAL_URL: 'http://authoring:8000',
  
  // 系统默认值
  NODE_ENV: 'development',
  PORT: 3000,
  SITE_HOSTNAME: 'localhost',
  
  // 缓存默认值
  CACHE_REVALIDATE_TIME: 120,
  CACHE_STALE_WHILE_REVALIDATE: 60,
  PROXY_TIMEOUT: 4000,
  
  // 调试默认值
  DEBUG_ENABLED: false,
  LOG_LEVEL: 'info',
  
  // 安全默认值 (空值，需要在环境中设置)
  ALLOWED_SITES: ['localhost'],
};

// 环境变量解析器
class EnvManager {
  private static instance: EnvManager;
  private config: EnvConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): EnvManager {
    if (!EnvManager.instance) {
      EnvManager.instance = new EnvManager();
    }
    return EnvManager.instance;
  }

  private loadConfig(): EnvConfig {
    return {
      // 后端服务配置
      CMS_ORIGIN: process.env.CMS_ORIGIN || DEFAULT_CONFIG.CMS_ORIGIN,
      CMS_PUBLIC_URL: process.env.CMS_PUBLIC_URL || DEFAULT_CONFIG.CMS_PUBLIC_URL,
      CMS_TIMEOUT: this.parseNumber(process.env.CMS_TIMEOUT, DEFAULT_CONFIG.CMS_TIMEOUT),
      
      // 前端服务配置
      FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || DEFAULT_CONFIG.FRONTEND_ORIGIN,
      FRONTEND_PUBLIC_URL: process.env.FRONTEND_PUBLIC_URL || DEFAULT_CONFIG.FRONTEND_PUBLIC_URL,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_CONFIG.NEXT_PUBLIC_SITE_URL,
      FRONTEND_TIMEOUT: this.parseNumber(process.env.FRONTEND_TIMEOUT, DEFAULT_CONFIG.FRONTEND_TIMEOUT),
      
      // 搜索服务配置
      SEARCH_ORIGIN: process.env.SEARCH_ORIGIN || DEFAULT_CONFIG.SEARCH_ORIGIN,
      SEARCH_TIMEOUT: this.parseNumber(process.env.SEARCH_TIMEOUT, DEFAULT_CONFIG.SEARCH_TIMEOUT),
      
      // 媒体服务配置
      MEDIA_BASE_URL: process.env.MEDIA_BASE_URL || DEFAULT_CONFIG.MEDIA_BASE_URL,
      MEDIA_INTERNAL_URL: process.env.MEDIA_INTERNAL_URL || DEFAULT_CONFIG.MEDIA_INTERNAL_URL,
      
      // 数据库配置
      DATABASE_URL: process.env.DATABASE_URL,
      
      // 缓存配置
      REDIS_URL: process.env.REDIS_URL,
      
      // 安全配置
      HMAC_SECRET: process.env.HMAC_SECRET,
      JWT_SECRET: process.env.JWT_SECRET,
      CACHE_SECRET: process.env.CACHE_SECRET,
      
      // 系统配置
      NODE_ENV: this.parseEnv(process.env.NODE_ENV, DEFAULT_CONFIG.NODE_ENV),
      PORT: this.parseNumber(process.env.PORT, DEFAULT_CONFIG.PORT),
      SITE_HOSTNAME: process.env.SITE_HOSTNAME || DEFAULT_CONFIG.SITE_HOSTNAME,
      
      // 缓存配置
      CACHE_REVALIDATE_TIME: this.parseNumber(process.env.CACHE_REVALIDATE_TIME, DEFAULT_CONFIG.CACHE_REVALIDATE_TIME),
      CACHE_STALE_WHILE_REVALIDATE: this.parseNumber(process.env.CACHE_STALE_WHILE_REVALIDATE, DEFAULT_CONFIG.CACHE_STALE_WHILE_REVALIDATE),
      PROXY_TIMEOUT: this.parseNumber(process.env.PROXY_TIMEOUT, DEFAULT_CONFIG.PROXY_TIMEOUT),
      
      // 调试配置
      DEBUG_ENABLED: this.parseBoolean(process.env.DEBUG_ENABLED, DEFAULT_CONFIG.DEBUG_ENABLED),
      LOG_LEVEL: this.parseLogLevel(process.env.LOG_LEVEL, DEFAULT_CONFIG.LOG_LEVEL),
      
      // 站点白名单
      ALLOWED_SITES: this.parseStringArray(process.env.ALLOWED_SITES, DEFAULT_CONFIG.ALLOWED_SITES),
    };
  }

  private parseNumber(value: string | undefined, defaultValue: number): number {
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  private parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true';
  }

  private parseEnv(value: string | undefined, defaultValue: EnvConfig['NODE_ENV']): EnvConfig['NODE_ENV'] {
    if (!value) return defaultValue;
    if (['development', 'production', 'test'].includes(value)) {
      return value as EnvConfig['NODE_ENV'];
    }
    return defaultValue;
  }

  private parseLogLevel(value: string | undefined, defaultValue: EnvConfig['LOG_LEVEL']): EnvConfig['LOG_LEVEL'] {
    if (!value) return defaultValue;
    if (['error', 'warn', 'info', 'debug'].includes(value)) {
      return value as EnvConfig['LOG_LEVEL'];
    }
    return defaultValue;
  }

  private parseStringArray(value: string | undefined, defaultValue: string[]): string[] {
    if (!value) return defaultValue;
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }

  // 获取配置方法
  get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    return this.config[key];
  }

  // 获取完整配置
  getAll(): EnvConfig {
    return { ...this.config };
  }

  // 检查是否为开发环境
  isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  // 检查是否为生产环境
  isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  // 检查是否为测试环境
  isTest(): boolean {
    return this.config.NODE_ENV === 'test';
  }

  // 获取后端API基础URL - 自动选择内部或外部访问
  getCmsOrigin(): string {
    // 区分服务端和客户端环境
    if (typeof window === 'undefined') {
      // 服务端环境 - 使用内部 Docker 网络
      return this.config.CMS_ORIGIN;
    } else {
      // 客户端环境 - 使用外部访问地址（优先使用NEXT_PUBLIC变量）
      return process.env.NEXT_PUBLIC_CMS_URL || this.config.CMS_PUBLIC_URL;
    }
  }

  // 获取媒体服务URL - 自动选择内部或外部访问
  getMediaOrigin(): string {
    if (typeof window === 'undefined') {
      // 服务端环境 - 使用内部访问
      return this.config.MEDIA_INTERNAL_URL;
    } else {
      // 客户端环境 - 使用外部访问（优先使用NEXT_PUBLIC变量）
      return process.env.NEXT_PUBLIC_CMS_URL || this.config.MEDIA_BASE_URL;
    }
  }

  // 获取前端基础URL
  getFrontendOrigin(): string {
    return this.config.FRONTEND_ORIGIN;
  }

  // 获取Sites前端URL
  getFrontendPublicUrl(): string {
    return this.config.FRONTEND_PUBLIC_URL;
  }

  // 获取搜索服务URL
  getSearchOrigin(): string {
    return this.config.SEARCH_ORIGIN;
  }

  // 验证必需的环境变量
  validateRequired(): string[] {
    const required = ['CMS_ORIGIN', 'FRONTEND_ORIGIN'];
    const missing: string[] = [];
    
    for (const key of required) {
      const value = this.config[key as keyof EnvConfig];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        missing.push(key);
      }
    }
    
    return missing;
  }

  // 验证安全配置
  validateSecurity(): string[] {
    const warnings: string[] = [];
    
    if (this.isProduction() && !this.config.HMAC_SECRET) {
      warnings.push('HMAC_SECRET should be set in production');
    }
    
    if (this.isProduction() && !this.config.JWT_SECRET) {
      warnings.push('JWT_SECRET should be set in production');
    }
    
    if (this.config.ALLOWED_SITES.length === 1 && this.config.ALLOWED_SITES[0] === 'localhost') {
      warnings.push('ALLOWED_SITES should be configured for production');
    }
    
    return warnings;
  }

  // 调试信息 - 扩展版本
  getDebugInfo(): Record<string, any> {
    return {
      environment: this.config.NODE_ENV,
      urls: {
        cmsOrigin: this.config.CMS_ORIGIN,
        cmsPublicUrl: this.config.CMS_PUBLIC_URL,
        frontendOrigin: this.config.FRONTEND_ORIGIN,
        frontendPublicUrl: this.config.FRONTEND_PUBLIC_URL,
        mediaBaseUrl: this.config.MEDIA_BASE_URL,
        mediaInternalUrl: this.config.MEDIA_INTERNAL_URL,
        searchOrigin: this.config.SEARCH_ORIGIN,
      },
      cache: {
        revalidateTime: this.config.CACHE_REVALIDATE_TIME,
        staleWhileRevalidate: this.config.CACHE_STALE_WHILE_REVALIDATE,
        proxyTimeout: this.config.PROXY_TIMEOUT,
      },
      security: {
        allowedSites: this.config.ALLOWED_SITES,
        hasHmacSecret: !!this.config.HMAC_SECRET,
        hasJwtSecret: !!this.config.JWT_SECRET,
        hasCacheSecret: !!this.config.CACHE_SECRET,
      },
      debug: {
        debugEnabled: this.config.DEBUG_ENABLED,
        logLevel: this.config.LOG_LEVEL,
      },
      validation: {
        missingRequired: this.validateRequired(),
        securityWarnings: this.validateSecurity(),
      },
    };
  }
}

// 导出单例实例
export const env = EnvManager.getInstance();

// 导出类型
export type { EnvConfig };

// 便捷函数 - 扩展版本
export const isDev = () => env.isDevelopment();
export const isProd = () => env.isProduction();
export const isTest = () => env.isTest();

// URL便捷函数  
export const getCmsUrl = (path = '') => {
  const baseUrl = env.getCmsOrigin().replace(/\/$/, '');
  const cleanPath = path.replace(/^\//, '');
  return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
};

export const getMediaUrl = (path = '') => {
  const baseUrl = env.getMediaOrigin().replace(/\/$/, '');
  const cleanPath = path.replace(/^\//, '');
  return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
};

export const getFrontendUrl = (path = '') => {
  const baseUrl = env.getFrontendOrigin().replace(/\/$/, '');
  const cleanPath = path.replace(/^\//, '');
  return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
};

// 验证函数
export const validateEnv = () => {
  const missing = env.validateRequired();
  const warnings = env.validateSecurity();
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  if (warnings.length > 0 && isProd()) {
    console.warn('Environment warnings:', warnings);
  }
  
  return true;
};
