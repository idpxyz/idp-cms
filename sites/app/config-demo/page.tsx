import React from "react";
import { Metadata } from "next";
import {
  getSiteConfig,
  getThemeConfig,
  getLayoutConfig,
  getAvailableSites,
  validateSiteConfig,
} from "@/lib/site-config-manager";
import { getMainSite } from "@/lib/config/sites";

export const metadata: Metadata = {
  title: "配置管理器演示 - 站点配置管理",
  description: "演示 SiteConfigManager 的功能和使用方法",
};

export default async function ConfigDemoPage() {
  // 获取所有可用站点
  const availableSites = getAvailableSites();

  // 获取示例站点配置
  const beijingConfig = await getSiteConfig("beijing.aivoya.com");
  const hangzhouConfig = await getSiteConfig("hangzhou.aivoya.com");

  // 获取主题配置
  const portalThemeConfig = getThemeConfig("portal");
  const localsiteThemeConfig = getThemeConfig("localsite-default");

  // 获取布局配置
  const portalLayoutConfig = getLayoutConfig("layout-portal-classic");
  const gridLayoutConfig = getLayoutConfig("layout-localsite-grid");

  // 验证配置
  const beijingValidation = beijingConfig
    ? validateSiteConfig(beijingConfig)
    : null;
  const hangzhouValidation = hangzhouConfig
    ? validateSiteConfig(hangzhouConfig)
    : null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          配置管理器演示
        </h1>

        {/* 可用站点列表 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">可用站点</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {availableSites.map((site) => {
              // 根据站点生成对应的链接
              const getSiteLink = (siteName: string) => {
                const siteMap: { [key: string]: string } = {
                  localhost: "/",
                  [getMainSite().hostname]: "/",
                  "beijing.aivoya.com": "/beijing",
                  "shanghai.aivoya.com": "/shanghai",
                  "hangzhou.aivoya.com": "/hangzhou",
                  "shenzhen.aivoya.com": "/shenzhen",
                };
                return siteMap[siteName] || "/";
              };

              const siteLink = getSiteLink(site);

              return (
                <a
                  key={site}
                  href={siteLink}
                  className="bg-blue-50 p-3 rounded-lg hover:bg-blue-100 transition-colors duration-200 cursor-pointer block"
                >
                  <span className="text-blue-800 font-medium">{site}</span>
                  <div className="text-xs text-blue-600 mt-1">点击访问 →</div>
                </a>
              );
            })}
          </div>
        </div>

        {/* 站点配置 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* 北京站点配置 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              北京站点配置
            </h2>
            {beijingConfig ? (
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">站点名称:</span>
                  <span className="ml-2 text-gray-900">
                    {beijingConfig.site_name}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">主题:</span>
                  <span className="ml-2 text-gray-900">
                    {beijingConfig.theme_key}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">布局:</span>
                  <span className="ml-2 text-gray-900">
                    {beijingConfig.layout_key}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">主色调:</span>
                  <span className="ml-2 text-gray-900">
                    {beijingConfig.primary_color}
                  </span>
                </div>
                {beijingValidation && (
                  <div
                    className={`p-3 rounded-lg ${beijingValidation.valid ? "bg-green-50" : "bg-red-50"}`}
                  >
                    <span
                      className={`font-medium ${beijingValidation.valid ? "text-green-800" : "text-red-800"}`}
                    >
                      配置验证: {beijingValidation.valid ? "通过" : "失败"}
                    </span>
                    {!beijingValidation.valid && (
                      <ul className="mt-2 text-sm text-red-700">
                        {beijingValidation.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">配置加载失败</p>
            )}
          </div>

          {/* 杭州站点配置 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              杭州站点配置
            </h2>
            {hangzhouConfig ? (
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">站点名称:</span>
                  <span className="ml-2 text-gray-900">
                    {hangzhouConfig.site_name}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">主题:</span>
                  <span className="ml-2 text-gray-900">
                    {hangzhouConfig.theme_key}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">布局:</span>
                  <span className="ml-2 text-gray-900">
                    {hangzhouConfig.layout_key}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">主色调:</span>
                  <span className="ml-2 text-gray-900">
                    {hangzhouConfig.primary_color}
                  </span>
                </div>
                {hangzhouValidation && (
                  <div
                    className={`p-3 rounded-lg ${hangzhouValidation.valid ? "bg-green-50" : "bg-red-50"}`}
                  >
                    <span
                      className={`font-medium ${hangzhouValidation.valid ? "text-green-800" : "text-red-800"}`}
                    >
                      配置验证: {hangzhouValidation.valid ? "通过" : "失败"}
                    </span>
                    {!hangzhouValidation.valid && (
                      <ul className="mt-2 text-sm text-red-700">
                        {hangzhouValidation.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">配置加载失败</p>
            )}
          </div>
        </div>

        {/* 主题配置 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Portal 主题 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Portal 主题配置
            </h2>
            {portalThemeConfig ? (
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">主题名称:</span>
                  <span className="ml-2 text-gray-900">
                    {portalThemeConfig.name}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">版本:</span>
                  <span className="ml-2 text-gray-900">
                    {portalThemeConfig.version}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">描述:</span>
                  <span className="ml-2 text-gray-900">
                    {portalThemeConfig.description}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">可用布局:</span>
                  <div className="mt-1 space-y-1">
                    {Object.entries(portalThemeConfig.layouts).map(
                      ([key, name]) => (
                        <div key={key} className="text-sm text-gray-600 ml-4">
                          • {key}: {name}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">主题配置未找到</p>
            )}
          </div>

          {/* LocalSite 主题 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              LocalSite 主题配置
            </h2>
            {localsiteThemeConfig ? (
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">主题名称:</span>
                  <span className="ml-2 text-gray-900">
                    {localsiteThemeConfig.name}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">版本:</span>
                  <span className="ml-2 text-gray-900">
                    {localsiteThemeConfig.version}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">描述:</span>
                  <span className="ml-2 text-gray-900">
                    {localsiteThemeConfig.description}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">可用模块:</span>
                  <div className="mt-1 space-y-1">
                    {Object.entries(localsiteThemeConfig.modules).map(
                      ([key, name]) => (
                        <div key={key} className="text-sm text-gray-600 ml-4">
                          • {key}: {name}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">主题配置未找到</p>
            )}
          </div>
        </div>

        {/* 布局配置 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Portal 布局 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Portal 布局配置
            </h2>
            {portalLayoutConfig ? (
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">布局名称:</span>
                  <span className="ml-2 text-gray-900">
                    {portalLayoutConfig.name}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">描述:</span>
                  <span className="ml-2 text-gray-900">
                    {portalLayoutConfig.description}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">组件路径:</span>
                  <span className="ml-2 text-gray-900 font-mono text-sm">
                    {portalLayoutConfig.component}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">布局配置未找到</p>
            )}
          </div>

          {/* Grid 布局 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Grid 布局配置
            </h2>
            {gridLayoutConfig ? (
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">布局名称:</span>
                  <span className="ml-2 text-gray-900">
                    {gridLayoutConfig.name}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">描述:</span>
                  <span className="ml-2 text-gray-900">
                    {gridLayoutConfig.description}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">组件路径:</span>
                  <span className="ml-2 text-gray-900 font-mono text-sm">
                    {gridLayoutConfig.component}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">布局配置未找到</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
