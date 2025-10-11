#!/bin/bash

###############################################################################
# 站点配置脚本
# 用于快速配置新站点的品牌信息和域名
###############################################################################

set -e

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║          🌐 站点配置向导                                              ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# 交互式输入
read -p "📝 站点 ID (例如: aivoya): " SITE_ID
read -p "📝 站点名称 (例如: AI旅行门户): " SITE_NAME
read -p "📝 品牌名称 (例如: AI旅行): " BRAND_NAME
read -p "📝 生产域名 (例如: aivoya.travel): " DOMAIN_NAME
read -p "📝 主题主色调 (例如: #06b6d4): " PRIMARY_COLOR

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 配置摘要"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "站点 ID:      $SITE_ID"
echo "站点名称:     $SITE_NAME"
echo "品牌名称:     $BRAND_NAME"
echo "生产域名:     $DOMAIN_NAME"
echo "主题主色调:   $PRIMARY_COLOR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "确认配置并继续？(yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "❌ 配置已取消"
    exit 1
fi

echo ""
echo "🔧 开始配置..."
echo ""

# 备份原文件
BACKUP_DIR="backup/site_config_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 备份原始配置文件..."
cp .env.core "$BACKUP_DIR/" 2>/dev/null || true
cp .env.production "$BACKUP_DIR/" 2>/dev/null || true
cp sites/lib/config/sites.ts "$BACKUP_DIR/" 2>/dev/null || true
cp apps/core/site_utils.py "$BACKUP_DIR/" 2>/dev/null || true

echo "✅ 备份完成：$BACKUP_DIR"
echo ""

# 1. 修改 .env.core
echo "📝 1/4 更新 .env.core..."
cat > .env.core << EOF
# 项目基础配置
PROJECT_NAME=${SITE_NAME}CMS
SITE_NAME=${SITE_NAME}
BRAND_NAME=${BRAND_NAME}

# Django 配置
SECRET_KEY=\${SECRET_KEY:-django-insecure-change-this-in-production}
DJANGO_SETTINGS_MODULE=config.settings.production
DEBUG=False

# 数据库配置
POSTGRES_DB=cms
POSTGRES_USER=postgres
POSTGRES_PASSWORD=\${POSTGRES_PASSWORD:-postgres}
DATABASE_URL=postgresql://postgres:\${POSTGRES_PASSWORD}@postgres:5432/cms

# Redis 配置
REDIS_URL=redis://redis:6379/0

# MinIO 配置
MINIO_ROOT_USER=\${MINIO_ROOT_USER:-minioadmin}
MINIO_ROOT_PASSWORD=\${MINIO_ROOT_PASSWORD:-minioadmin}
MINIO_ENDPOINT=minio:9000
MINIO_USE_SSL=False

# OpenSearch 配置
OPENSEARCH_HOST=opensearch
OPENSEARCH_PORT=9200
OPENSEARCH_USER=admin
OPENSEARCH_PASSWORD=\${OPENSEARCH_PASSWORD:-admin}

# ClickHouse 配置
CLICKHOUSE_HOST=clickhouse
CLICKHOUSE_PORT=8123
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=\${CLICKHOUSE_PASSWORD:-thends}

# 前端配置
FRONTEND_BASE_URL=https://${DOMAIN_NAME}
BACKEND_BASE_URL=https://${DOMAIN_NAME}
NEXT_PUBLIC_API_URL=https://${DOMAIN_NAME}/api
EOF

# 2. 修改 .env.production
echo "📝 2/4 更新 .env.production..."
cat > .env.production << EOF
# 生产环境配置

# Django 配置
DJANGO_ALLOWED_HOSTS=${DOMAIN_NAME},www.${DOMAIN_NAME},localhost
FRONTEND_ORIGIN=https://${DOMAIN_NAME}

# CORS 配置
CORS_ALLOWED_ORIGINS=https://${DOMAIN_NAME},https://www.${DOMAIN_NAME}

# 安全配置
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True

# 性能配置
CACHE_ENABLED=True
CACHE_TIMEOUT=300
EOF

# 3. 修改前端配置
echo "📝 3/4 更新前端站点配置..."
cat > sites/lib/config/sites.ts << EOF
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
    id: '${SITE_ID}',
    name: '${SITE_NAME}',
    hostname: '${DOMAIN_NAME}',
    theme: { key: 'portal', layout: 'layout-portal-classic' },
    route: 'portal',
    order: 0
  },
  {
    id: 'localhost',
    name: '本地开发',
    hostname: 'localhost',
    theme: { key: 'portal', layout: 'layout-portal-classic' },
    route: 'portal',
    order: 1
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

  getSiteByHostname(hostname: string): SiteConfig | null {
    return this.sites.get(hostname) || null;
  }

  getSiteById(id: string): SiteConfig | null {
    return this.sites.get(id) || null;
  }

  getAllSites(): SiteConfig[] {
    return Array.from(this.sites.values()).sort((a, b) => a.order - b.order);
  }

  getAllHostnames(): string[] {
    return DEFAULT_SITES.map(site => site.hostname);
  }

  getAllowedSitesString(): string {
    return DEFAULT_SITES.map(site => site.hostname).join(',');
  }

  isAllowedSite(hostname: string): boolean {
    return this.sites.has(hostname);
  }

  getDefaultSite(): SiteConfig {
    return DEFAULT_SITES[0];
  }

  getMainSite(): SiteConfig {
    return this.getSiteById('${SITE_ID}')!;
  }

  getLocalSites(): SiteConfig[] {
    return DEFAULT_SITES.filter(site => site.id !== 'localhost' && site.id !== '${SITE_ID}');
  }

  getSitesByRoute(route: string): SiteConfig[] {
    return DEFAULT_SITES.filter(site => site.route === route);
  }

  getSiteRouteMap(): Record<string, string> {
    const map: Record<string, string> = {};
    DEFAULT_SITES.forEach(site => {
      map[site.hostname] = site.route;
    });
    return map;
  }

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
EOF

# 4. 修改主题颜色（可选）
if [ -f "sites/app/globals.css" ]; then
    echo "📝 4/4 更新主题颜色..."
    # 只修改主色调，保留其他配置
    sed -i "s/--brand-primary: #[0-9A-Fa-f]\{6\}/--brand-primary: $PRIMARY_COLOR/" sites/app/globals.css
    echo "✅ 主题颜色已更新"
else
    echo "⚠️  未找到 globals.css，跳过主题颜色更新"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 配置完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 已更新的文件："
echo "  • .env.core"
echo "  • .env.production"
echo "  • sites/lib/config/sites.ts"
echo "  • sites/app/globals.css (主题颜色)"
echo ""
echo "💾 备份位置：$BACKUP_DIR"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 下一步："
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. 创建数据库站点："
echo "   ./create-wagtail-site.sh ${SITE_ID} \"${SITE_NAME}\" ${DOMAIN_NAME}"
echo ""
echo "2. 启动生产环境："
echo "   ./start-production.sh"
echo ""
echo "3. 配置 DNS："
echo "   ${DOMAIN_NAME} → A记录 → 您的服务器IP"
echo ""
echo "4. 配置 Nginx 并申请 SSL："
echo "   见文档：DEPLOY_SECOND_HOST.md"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

