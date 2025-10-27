/**
 * 站点配置管理
 * 统一管理所有站点相关的配置，避免硬编码
 */

// 站点类型定义
export interface SiteConfig {
  id: string;
  name: string;
  hostname: string;
  theme: {
    key: string;
    layout: string;
  };
  route: string;
  order: number;
}

// 默认站点配置
export const DEFAULT_SITES: SiteConfig[] = [
  {
    id: 'localhost',
    name: '本地开发',
    hostname: 'localhost',
    theme: { key: 'portal', layout: 'layout-portal-classic' },
    route: 'portal',
    order: 0
  },
  {
    id: 'aivoya',
    name: 'AI旅行门户',
    hostname: 'aivoya.com',
    theme: { key: 'portal', layout: 'layout-portal-classic' },
    route: 'portal',
    order: 1
  },
  {
    id: 'beijing',
    name: '北京站',
    hostname: 'beijing.aivoya.com',
    theme: { key: 'localsite-default', layout: 'layout-localsite-grid' },
    route: 'localsite',
    order: 2
  },
  {
    id: 'shanghai',
    name: '上海站',
    hostname: 'shanghai.aivoya.com',
    theme: { key: 'localsite-default', layout: 'layout-localsite-grid' },
    route: 'localsite',
    order: 3
  },
  {
    id: 'hangzhou',
    name: '杭州站',
    hostname: 'hangzhou.aivoya.com',
    theme: { key: 'localsite-default', layout: 'layout-localsite-grid' },
    route: 'localsite',
    order: 4
  },
  {
    id: 'shenzhen',
    name: '深圳站',
    hostname: 'shenzhen.aivoya.com',
    theme: { key: 'localsite-default', layout: 'layout-localsite-grid' },
    route: 'localsite',
    order: 5
  }
];

// 站点管理器类
class SiteManager {
  private static instance: SiteManager;
  private sites: Map<string, SiteConfig> = new Map();

  private constructor() {
    this.initializeSites();
  }

  static getInstance(): SiteManager {
    if (!SiteManager.instance) {
      SiteManager.instance = new SiteManager();
    }
    return SiteManager.instance;
  }

  private initializeSites(): void {
    DEFAULT_SITES.forEach(site => {
      this.sites.set(site.hostname, site);
      this.sites.set(site.id, site);
    });
  }

  // 根据hostname获取站点配置
  getSiteByHostname(hostname: string): SiteConfig | null {
    return this.sites.get(hostname) || null;
  }

  // 根据ID获取站点配置
  getSiteById(id: string): SiteConfig | null {
    return this.sites.get(id) || null;
  }

  // 获取所有站点
  getAllSites(): SiteConfig[] {
    return Array.from(this.sites.values()).sort((a, b) => a.order - b.order);
  }

  // 获取所有hostname
  getAllHostnames(): string[] {
    return DEFAULT_SITES.map(site => site.hostname);
  }

  // 获取允许的站点白名单（用于环境变量）
  getAllowedSitesString(): string {
    return DEFAULT_SITES.map(site => site.hostname).join(',');
  }

  // 检查站点是否被允许
  isAllowedSite(hostname: string): boolean {
    return this.sites.has(hostname);
  }

  // 获取默认站点
  getDefaultSite(): SiteConfig {
    return DEFAULT_SITES[0]; // localhost
  }

  // 获取主站点（根据环境变量动态返回）
  getMainSite(): SiteConfig {
    // 优先使用环境变量配置的站点
    // 客户端使用 NEXT_PUBLIC_ 前缀的环境变量
    const siteHostname = process.env.NEXT_PUBLIC_SITE_HOSTNAME ||
                         process.env.SITE_HOSTNAME || 
                         process.env.NEXT_PUBLIC_PORTAL_SITE ||
                         process.env.PORTAL_SITE || 
                         'localhost';
    
    // 尝试通过hostname或id查找站点
    const site = this.getSiteByHostname(siteHostname) || 
                 this.getSiteById(siteHostname);
    
    // 如果找不到，返回localhost作为默认主站点
    return site || this.getSiteById('localhost')!;
  }

  // 获取地方站点
  getLocalSites(): SiteConfig[] {
    return DEFAULT_SITES.filter(site => site.id !== 'localhost' && site.id !== 'aivoya');
  }

  // 根据路由类型获取站点
  getSitesByRoute(route: string): SiteConfig[] {
    return DEFAULT_SITES.filter(site => site.route === route);
  }

  // 获取站点路由映射
  getSiteRouteMap(): Record<string, string> {
    const map: Record<string, string> = {};
    DEFAULT_SITES.forEach(site => {
      map[site.hostname] = site.route;
    });
    return map;
  }

  // 获取主题配置映射
  getThemeConfigMap(): Record<string, { theme_key: string; layout_key: string }> {
    const map: Record<string, { theme_key: string; layout_key: string }> = {};
    DEFAULT_SITES.forEach(site => {
      map[site.hostname] = {
        theme_key: site.theme.key,
        layout_key: site.theme.layout
      };
    });
    return map;
  }
}

// 导出单例实例
export const siteManager = SiteManager.getInstance();

// 便捷函数
export const getSiteByHostname = (hostname: string) => siteManager.getSiteByHostname(hostname);
export const getSiteById = (id: string) => siteManager.getSiteById(id);
export const getAllSites = () => siteManager.getAllSites();
export const getAllHostnames = () => siteManager.getAllHostnames();
export const isAllowedSite = (hostname: string) => siteManager.isAllowedSite(hostname);
export const getDefaultSite = () => siteManager.getDefaultSite();
export const getMainSite = () => siteManager.getMainSite();
export const getLocalSites = () => siteManager.getLocalSites();
export const getSiteRouteMap = () => siteManager.getSiteRouteMap();
export const getThemeConfigMap = () => siteManager.getThemeConfigMap();

/**
 * 获取 Portal 使用的站点标识
 * 可以通过环境变量 PORTAL_SITE 来配置
 * 默认: 'localhost'
 * 生产环境可以保持为: 'localhost'（这是站点内部标识，不是访问地址）
 */
export const getPortalSiteIdentifier = (): string => {
  return process.env.PORTAL_SITE || process.env.NEXT_PUBLIC_PORTAL_SITE || 'localhost';
};

// 导出类型已在上面定义
