import React from "react";
import { Metadata } from "next";
import { getSiteSettings } from "@/lib/api/client";
import { getSiteByHostname } from "@/lib/config/sites";
import { loadThemeLayout } from "@/lib/theme-loader";
import { validateSiteConfig } from "@/lib/site-config-manager";

export const metadata: Metadata = {
  title: "杭州新闻资讯 - 了解杭州最新动态",
  description:
    "了解杭州最新动态，掌握城市发展脉搏，关注杭州城市建设、经济发展、文化传承等全方位资讯。",
  keywords: "杭州,新闻,资讯,互联网,城市建设,经济发展",
};

interface HangzhouLayoutProps {
  children: React.ReactNode;
}

export default async function HangzhouLayout({
  children,
}: HangzhouLayoutProps) {
  // 获取杭州站点的配置
  const hangzhouSite = getSiteByHostname("hangzhou.aivoya.com");
  if (!hangzhouSite) {
    throw new Error("杭州站点配置不存在");
  }

  const siteSettings = await getSiteSettings(hangzhouSite.hostname);

  // 验证配置
  if (siteSettings) {
    const validation = validateSiteConfig(siteSettings);
    if (!validation.valid) {
      console.warn(
        "Hangzhou site config validation failed:",
        validation.errors
      );
    }
  }

  const Layout = await loadThemeLayout(siteSettings);

  return <Layout siteSettings={siteSettings}>{children}</Layout>;
}
