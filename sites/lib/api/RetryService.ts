/**
 * 统一重试服务
 * 实现带指数退避和抖动的重试机制
 * 支持幂等键保证请求唯一性
 */

interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  jitterFactor: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

interface IdempotencyOptions {
  key?: string;
  ttl?: number; // Redis TTL in seconds
  storage?: 'redis' | 'memory';
}

interface RequestOptions extends RetryOptions {
  idempotency?: IdempotencyOptions;
  timeout?: number;
}

// 内存缓存用于开发环境
const memoryCache = new Map<string, { result: any; timestamp: number; ttl: number }>();

export class RetryService {
  private static instance: RetryService;
  
  static getInstance(): RetryService {
    if (!RetryService.instance) {
      RetryService.instance = new RetryService();
    }
    return RetryService.instance;
  }

  /**
   * 执行带重试的操作
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const config: RetryOptions = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      jitterFactor: 0.1,
      retryCondition: this.defaultRetryCondition,
      ...options,
    };

    let lastError: any;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // 最后一次尝试，直接抛出错误
        if (attempt === config.maxAttempts) {
          break;
        }

        // 检查是否应该重试
        if (!config.retryCondition!(error)) {
          throw error;
        }

        // 计算延迟时间（指数退避 + 抖动）
        const delay = this.calculateDelay(attempt, config);
        
        // 调用重试回调
        if (config.onRetry) {
          config.onRetry(attempt, error);
        }

        // 等待后重试
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * 执行带幂等键的请求
   */
  async executeWithIdempotency<T>(
    operation: () => Promise<T>,
    options: Partial<RequestOptions> = {}
  ): Promise<T> {
    const { idempotency, ...retryOptions } = options;

    if (!idempotency?.key) {
      // 没有幂等键，直接执行重试逻辑
      return this.executeWithRetry(operation, retryOptions);
    }

    // 检查幂等键是否已存在
    const cached = await this.getIdempotentResult(idempotency.key, idempotency);
    if (cached) {
      return cached;
    }

    // 执行操作并缓存结果
    const result = await this.executeWithRetry(operation, retryOptions);
    await this.setIdempotentResult(idempotency.key, result, idempotency);
    
    return result;
  }

  /**
   * HTTP请求重试封装
   */
  async fetch<T>(
    url: string,
    init: RequestInit = {},
    options: Partial<RequestOptions> = {}
  ): Promise<T> {
    const { timeout = 10000, ...requestOptions } = options;

    const operation = async (): Promise<T> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...init,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...init.headers,
            // 添加幂等键到请求头
            ...(options.idempotency?.key && {
              'Idempotency-Key': options.idempotency.key,
            }),
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new HttpError(response.status, response.statusText, await response.text());
        }

        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };

    return this.executeWithIdempotency(operation, requestOptions);
  }

  /**
   * 生成幂等键
   */
  generateIdempotencyKey(prefix: string = 'req'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 11);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * 计算重试延迟（指数退避 + 抖动）
   */
  private calculateDelay(attempt: number, config: RetryOptions): number {
    // 指数退避
    const exponentialDelay = Math.min(
      config.baseDelay * Math.pow(2, attempt - 1),
      config.maxDelay
    );

    // 添加抖动
    const jitter = exponentialDelay * config.jitterFactor * Math.random();
    
    return Math.floor(exponentialDelay + jitter);
  }

  /**
   * 默认重试条件
   */
  private defaultRetryCondition(error: any): boolean {
    // 网络错误
    if (error.name === 'TypeError' || error.name === 'NetworkError') {
      return true;
    }

    // HTTP错误
    if (error instanceof HttpError) {
      // 5xx服务器错误和429限流
      return error.status >= 500 || error.status === 429;
    }

    // 超时错误
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return true;
    }

    return false;
  }

  /**
   * 获取幂等结果
   */
  private async getIdempotentResult(key: string, options: IdempotencyOptions): Promise<any> {
    if (options.storage === 'redis') {
      // TODO: 实现Redis存储
      return null;
    }

    // 使用内存缓存
    const cached = memoryCache.get(key);
    if (cached) {
      const now = Date.now();
      if (now - cached.timestamp < cached.ttl * 1000) {
        return cached.result;
      } else {
        memoryCache.delete(key);
      }
    }

    return null;
  }

  /**
   * 设置幂等结果
   */
  private async setIdempotentResult(
    key: string, 
    result: any, 
    options: IdempotencyOptions
  ): Promise<void> {
    const ttl = options.ttl || 3600; // 默认1小时

    if (options.storage === 'redis') {
      // TODO: 实现Redis存储
      return;
    }

    // 使用内存缓存
    memoryCache.set(key, {
      result,
      timestamp: Date.now(),
      ttl,
    });

    // 定期清理过期缓存
    setTimeout(() => {
      const cached = memoryCache.get(key);
      if (cached && Date.now() - cached.timestamp >= cached.ttl * 1000) {
        memoryCache.delete(key);
      }
    }, ttl * 1000);
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * HTTP错误类
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body?: string
  ) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = 'HttpError';
  }
}

/**
 * 重试装饰器助手函数（用于支持装饰器的环境）
 * 在Next.js中请直接使用 retryService.executeWithRetry()
 */
export function withRetry(options: Partial<RetryOptions> = {}) {
  console.warn('装饰器在Next.js中不被支持，请使用 retryService.executeWithRetry() 方法');
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    // 返回原方法，不做修改
    return descriptor;
  };
}

/**
 * 幂等装饰器助手函数（用于支持装饰器的环境）  
 * 在Next.js中请直接使用 retryService.executeWithIdempotency()
 */
export function withIdempotency(keyGenerator: (...args: any[]) => string, options: Partial<IdempotencyOptions> = {}) {
  console.warn('装饰器在Next.js中不被支持，请使用 retryService.executeWithIdempotency() 方法');
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    // 返回原方法，不做修改
    return descriptor;
  };
}

// 导出单例实例
export const retryService = RetryService.getInstance();
