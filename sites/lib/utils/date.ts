/**
 * 日期格式化工具函数
 * 解决SSR水合问题，确保服务器端和客户端日期格式一致
 */

/**
 * 格式化日期为中文格式
 * @param date 日期字符串或Date对象
 * @param options 格式化选项
 * @returns 格式化后的日期字符串
 */
export function formatDate(
  date: string | Date | null | undefined,
  options: {
    includeTime?: boolean;
    includeSeconds?: boolean;
    hour12?: boolean;
  } = {}
): string {
  const {
    includeTime = false,
    includeSeconds = false,
    hour12 = false,
  } = options;

  // 处理空值情况
  if (!date) {
    return "--";
  }

  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  // 检查日期是否有效
  if (isNaN(dateObj.getTime())) {
    return "--";
  }

  const formatOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Shanghai", // 固定时区
    ...(includeTime && {
      hour: "2-digit",
      minute: "2-digit",
      hour12,
    }),
    ...(includeTime &&
      includeSeconds && {
        second: "2-digit",
      }),
  };

  return dateObj.toLocaleString("zh-CN", formatOptions);
}

/**
 * 格式化日期为简短格式（仅日期）
 */
export function formatDateShort(date: string | Date): string {
  return formatDate(date, { includeTime: false });
}

/**
 * 格式化日期为完整格式（包含时间）
 */
export function formatDateTime(date: string | Date): string {
  return formatDate(date, { includeTime: true, includeSeconds: false });
}

/**
 * 格式化日期为详细格式（包含秒）
 */
export function formatDateTimeFull(date: string | Date): string {
  return formatDate(date, { includeTime: true, includeSeconds: true });
}

/**
 * 获取相对时间（如"2小时前"）- 新闻网站专用版本
 * 针对新闻场景优化显示逻辑
 */
export function getRelativeTime(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  // 检查日期是否有效
  if (isNaN(dateObj.getTime())) {
    return "--";
  }
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  // 未来时间或刚刚发布
  if (diffInSeconds < 60) {
    return "刚刚";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}分钟前`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}小时前`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}天前`;
  }

  // 7天以上，显示具体日期
  const currentYear = now.getFullYear();
  const dateYear = dateObj.getFullYear();
  
  // 今年的新闻：只显示月日
  if (currentYear === dateYear) {
    return dateObj.toLocaleDateString('zh-CN', { 
      month: 'long', 
      day: 'numeric',
      timeZone: 'Asia/Shanghai'
    });
  }
  
  // 往年的新闻：显示年月日
  return dateObj.toLocaleDateString('zh-CN', { 
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    timeZone: 'Asia/Shanghai'
  });
}

/**
 * 格式化时间为"X时间前"的形式（别名函数，为了兼容性）
 */
export function formatTimeAgo(date: string | Date): string {
  return getRelativeTime(date);
}

/**
 * 安全的时间格式化函数，避免SSR水合错误
 * 使用固定的日期格式，不依赖实时计算
 */
export function formatTimeForSSR(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  // 检查日期是否有效
  if (isNaN(dateObj.getTime())) {
    return "--";
  }
  
  // 使用固定的日期格式，避免服务端/客户端差异
  return dateObj.toLocaleDateString('zh-CN', { 
    month: 'short', 
    day: 'numeric',
    timeZone: 'Asia/Shanghai' // 固定时区避免差异
  });
}
