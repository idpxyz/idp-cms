/**
 * 主题性能监控系统
 *
 * 实施 BestThemeOptimize.md 的性能监控策略：
 * - 控制目标：主题增量 JS ≤ 30KB gzip，LCP p75 < 1.5s
 * - RUM 上报 theme_load_duration
 * - 服务端主题加载时间监控
 */

/**
 * 性能指标类型
 */
export interface ThemePerformanceMetrics {
  themeKey: string;
  themeVersion: string;
  loadStartTime: number;
  loadEndTime: number;
  loadDuration: number;
  bundleSize?: number;
  cacheHit: boolean;
  errorOccurred: boolean;
  errorMessage?: string;
  userAgent?: string;
  host: string;
}

/**
 * Web Vitals 相关指标
 */
export interface WebVitalsMetrics {
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
}

/**
 * 性能监控配置
 */
export const PERFORMANCE_CONFIG = {
  // 性能阈值（毫秒）
  THRESHOLDS: {
    THEME_LOAD_SERVER: 100, // 服务端主题加载 < 100ms
    THEME_LOAD_CLIENT: 200, // 客户端主题加载 < 200ms
    LCP_MOBILE: 1500, // 移动端 LCP < 1.5s
    LCP_DESKTOP: 1000, // 桌面端 LCP < 1s
    BUNDLE_SIZE_GZIP: 30720, // 30KB gzip
  },

  // 采样率
  SAMPLING: {
    PRODUCTION: 0.1, // 生产环境 10% 采样
    DEVELOPMENT: 1.0, // 开发环境 100% 采样
  },

  // 批量上报配置
  BATCH: {
    SIZE: 10, // 批量大小
    TIMEOUT: 5000, // 超时时间（毫秒）
  },
} as const;

/**
 * 性能监控器类
 */
class ThemePerformanceMonitor {
  private metrics: ThemePerformanceMetrics[] = [];
  private batchTimer: NodeJS.Timeout | null = null;

  /**
   * 开始监控主题加载
   */
  startThemeLoad(themeKey: string, themeVersion: string, host: string): string {
    const loadId = `${themeKey}@${themeVersion}-${Date.now()}`;
    const startTime = performance.now();

    // 标记开始时间
    if (typeof performance !== "undefined" && performance.mark) {
      performance.mark(`theme-load-start-${loadId}`);
    }

    return loadId;
  }

  /**
   * 结束监控主题加载
   */
  endThemeLoad(
    loadId: string,
    themeKey: string,
    themeVersion: string,
    host: string,
    options: {
      cacheHit?: boolean;
      errorOccurred?: boolean;
      errorMessage?: string;
      bundleSize?: number;
    } = {}
  ): void {
    const endTime = performance.now();

    // 计算加载时长
    let loadDuration = 0;
    if (typeof performance !== "undefined" && performance.measure) {
      try {
        const measure = performance.measure(
          `theme-load-${loadId}`,
          `theme-load-start-${loadId}`
        );
        loadDuration = measure.duration;
      } catch (error) {
        // 回退到简单时间计算
        loadDuration = endTime - (this.getStartTime(loadId) || endTime);
      }
    }

    const metrics: ThemePerformanceMetrics = {
      themeKey,
      themeVersion,
      loadStartTime: this.getStartTime(loadId) || endTime - loadDuration,
      loadEndTime: endTime,
      loadDuration,
      bundleSize: options.bundleSize,
      cacheHit: options.cacheHit || false,
      errorOccurred: options.errorOccurred || false,
      errorMessage: options.errorMessage,
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      host,
    };

    this.recordMetrics(metrics);
  }

  /**
   * 记录性能指标
   */
  private recordMetrics(metrics: ThemePerformanceMetrics): void {
    // 检查采样率
    const samplingRate = this.getSamplingRate();
    if (Math.random() > samplingRate) {
      return;
    }

    // 添加到批次
    this.metrics.push(metrics);

    // 立即上报严重性能问题
    if (this.isCriticalIssue(metrics)) {
      this.reportImmediately(metrics);
    }

    // 批量上报
    this.scheduleBatchReport();

    // 开发环境控制台输出
    if (process.env.NODE_ENV === "development") {
      this.logMetrics(metrics);
    }
  }

  /**
   * 检查是否为严重性能问题
   */
  private isCriticalIssue(metrics: ThemePerformanceMetrics): boolean {
    return Boolean(
      metrics.errorOccurred ||
        metrics.loadDuration >
          PERFORMANCE_CONFIG.THRESHOLDS.THEME_LOAD_SERVER * 2 ||
        (metrics.bundleSize &&
          metrics.bundleSize > PERFORMANCE_CONFIG.THRESHOLDS.BUNDLE_SIZE_GZIP)
    );
  }

  /**
   * 立即上报严重问题
   */
  private reportImmediately(metrics: ThemePerformanceMetrics): void {
    console.error("Critical theme performance issue:", metrics);

    // 可以集成到你的错误监控系统
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "theme_performance_critical", {
        theme_key: metrics.themeKey,
        load_duration: metrics.loadDuration,
        error_occurred: metrics.errorOccurred,
      });
    }
  }

  /**
   * 批量上报调度
   */
  private scheduleBatchReport(): void {
    if (this.batchTimer) {
      return;
    }

    this.batchTimer = setTimeout(() => {
      this.sendBatchReport();
    }, PERFORMANCE_CONFIG.BATCH.TIMEOUT);

    // 如果批次满了，立即发送
    if (this.metrics.length >= PERFORMANCE_CONFIG.BATCH.SIZE) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
      this.sendBatchReport();
    }
  }

  /**
   * 发送批量报告
   */
  private sendBatchReport(): void {
    if (this.metrics.length === 0) {
      return;
    }

    const batch = [...this.metrics];
    this.metrics = [];
    this.batchTimer = null;

    // 发送到你的分析服务
    this.sendToAnalytics(batch);
  }

  /**
   * 发送到分析服务
   */
  private sendToAnalytics(metrics: ThemePerformanceMetrics[]): void {
    // 可以集成到你的分析平台
    if (typeof window !== "undefined") {
      metrics.forEach((metric) => {
        // Google Analytics 4
        if (window.gtag) {
          window.gtag("event", "theme_load_duration", {
            theme_key: metric.themeKey,
            theme_version: metric.themeVersion,
            load_duration: metric.loadDuration,
            cache_hit: metric.cacheHit,
            host: metric.host,
          });
        }

        // 自定义分析端点
        if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
          fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "theme_performance",
              data: metric,
            }),
          }).catch((error) => {
            console.warn("Failed to send analytics:", error);
          });
        }
      });
    }
  }

  /**
   * 获取采样率
   */
  private getSamplingRate(): number {
    return process.env.NODE_ENV === "production"
      ? PERFORMANCE_CONFIG.SAMPLING.PRODUCTION
      : PERFORMANCE_CONFIG.SAMPLING.DEVELOPMENT;
  }

  /**
   * 获取开始时间（简单实现）
   */
  private getStartTime(loadId: string): number | null {
    // 简化实现，实际可以用 Map 存储
    return null;
  }

  /**
   * 开发环境日志输出
   */
  private logMetrics(metrics: ThemePerformanceMetrics): void {
    const { loadDuration, themeKey, cacheHit, errorOccurred } = metrics;
    const threshold = PERFORMANCE_CONFIG.THRESHOLDS.THEME_LOAD_SERVER;

    if (errorOccurred) {
      console.error(
        `🚨 Theme ${themeKey} failed to load:`,
        metrics.errorMessage
      );
    } else if (loadDuration > threshold) {
      console.warn(
        `⚠️ Theme ${themeKey} loaded slowly: ${loadDuration.toFixed(2)}ms (threshold: ${threshold}ms)`
      );
    } else {
      console.log(
        `✅ Theme ${themeKey} loaded in ${loadDuration.toFixed(2)}ms ${cacheHit ? "(cached)" : "(fresh)"}`
      );
    }
  }
}

/**
 * 全局性能监控实例
 */
export const themePerformanceMonitor = new ThemePerformanceMonitor();

/**
 * 便捷的监控函数
 */
export function trackThemeLoad<T>(
  themeKey: string,
  themeVersion: string,
  host: string,
  loadFunction: () => Promise<T>
): Promise<T> {
  const loadId = themePerformanceMonitor.startThemeLoad(
    themeKey,
    themeVersion,
    host
  );

  return loadFunction()
    .then((result) => {
      themePerformanceMonitor.endThemeLoad(
        loadId,
        themeKey,
        themeVersion,
        host,
        {
          cacheHit: false, // 可以根据实际情况判断
        }
      );
      return result;
    })
    .catch((error) => {
      themePerformanceMonitor.endThemeLoad(
        loadId,
        themeKey,
        themeVersion,
        host,
        {
          errorOccurred: true,
          errorMessage: error.message,
        }
      );
      throw error;
    });
}

/**
 * Web Vitals 监控
 */
export function trackWebVitals(): void {
  if (typeof window === "undefined") {
    return;
  }

  // 这里可以集成 web-vitals 库
  // import { getLCP, getFID, getCLS } from 'web-vitals';

  // getLCP((metric) => {
  //   console.log('LCP:', metric);
  //   // 上报到分析服务
  // });
}

/**
 * Bundle 大小监控（构建时）
 */
export interface BundleStats {
  themeKey: string;
  bundleSize: number;
  gzipSize: number;
  assets: string[];
}

export function validateBundleSize(stats: BundleStats): boolean {
  const { gzipSize, themeKey } = stats;
  const threshold = PERFORMANCE_CONFIG.THRESHOLDS.BUNDLE_SIZE_GZIP;

  if (gzipSize > threshold) {
    console.error(
      `❌ Theme ${themeKey} bundle too large: ${gzipSize} bytes (threshold: ${threshold} bytes)`
    );
    return false;
  }

  console.log(`✅ Theme ${themeKey} bundle size OK: ${gzipSize} bytes`);
  return true;
}

// 类型扩展（如果使用 Google Analytics）
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}
