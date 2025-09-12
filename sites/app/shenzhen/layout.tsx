import React from "react";
import { Metadata } from "next";
import { getSiteSettings } from "@/lib/api/client";
import { getSiteByHostname } from "@/lib/config/sites";
import { loadThemeLayout } from "@/lib/theme-loader";
import { validateSiteConfig } from "@/lib/site-config-manager";

export const metadata: Metadata = {
  title: "深圳新闻资讯 - 了解深圳最新动态",
  description:
    "了解深圳最新动态，掌握城市发展脉搏，关注深圳城市建设、经济发展、文化传承等全方位资讯。",
  keywords: "深圳,新闻,资讯,创新,城市建设,经济发展",
};

interface ShenzhenLayoutProps {
  children: React.ReactNode;
}

export default async function ShenzhenLayout({
  children,
}: ShenzhenLayoutProps) {
  // 获取深圳站点的配置
  const shenzhenSite = getSiteByHostname("shenzhen.aivoya.com");
  if (!shenzhenSite) {
    throw new Error("深圳站点配置不存在");
  }

  const siteSettings = await getSiteSettings(shenzhenSite.hostname);

  // 验证配置
  if (siteSettings) {
    const validation = validateSiteConfig(siteSettings);
    if (!validation.valid) {
      console.warn(
        "Shenzhen site config validation failed:",
        validation.errors
      );
    }
  }

  const Layout = await loadThemeLayout(siteSettings);

  return <Layout siteSettings={siteSettings}>{children}</Layout>;
}
