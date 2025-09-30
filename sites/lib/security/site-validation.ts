/**
 * 站点验证安全工具
 * 防止开放代理攻击和越权访问
 */

// 允许的站点白名单
const ALLOWED_SITES = process.env.ALLOWED_SITES?.split(",") || [
  "localhost",
  "beijing.aivoya.com",
  "shanghai.aivoya.com",
  "hangzhou.aivoya.com",
  "shenzhen.aivoya.com",
];

/**
 * 验证站点是否在白名单中
 * @param host 站点主机名
 * @returns 是否允许访问
 */
export function isAllowedSite(host: string): boolean {
  if (!host) return false;

  // 基本格式验证
  if (!/^[a-z0-9.-]+$/.test(host)) return false;

  // 防止路径遍历攻击
  if (host.includes("..")) return false;

  // 检查是否在白名单中
  return ALLOWED_SITES.includes(host);
}

/**
 * 获取当前站点的主题和布局配置
 * @param host 站点主机名
 * @returns 站点信息
 */
export function getSiteInfo(host: string): {
  theme_key: string;
  layout_key: string;
} {
  // 根据主机名返回对应的主题和布局
  switch (host) {
    case "localhost":
      return {
        theme_key: "localsite-default",
        layout_key: "layout-localsite-grid",
      };
    case "beijing.aivoya.com":
      return {
        theme_key: "localsite-default",
        layout_key: "layout-localsite-grid",
      };
    case "shanghai.aivoya.com":
      return {
        theme_key: "localsite-shanghai",
        layout_key: "layout-localsite-magazine",
      };
    case "hangzhou.aivoya.com":
      return {
        theme_key: "localsite-default",
        layout_key: "layout-localsite-grid",
      };
    case "shenzhen.aivoya.com":
      return {
        theme_key: "localsite-default",
        layout_key: "layout-localsite-grid",
      };
    default:
      return {
        theme_key: "localsite-default",
        layout_key: "layout-localsite-grid",
      };
  }
}

/**
 * 生成请求ID用于追踪
 * @returns 唯一的请求ID
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * 验证HMAC签名
 * @param payload 请求体
 * @param signature 签名
 * @param secret 密钥
 * @returns 是否验证通过
 */
export function verifyHMAC(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // 这里应该实现HMAC验证逻辑
  // 为了安全，密钥不应该暴露在前端
  return false;
}
