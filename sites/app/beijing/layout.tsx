import React from "react";
import { Metadata } from "next";
import { getSiteSettings } from "@/lib/api/client";
import { getSiteByHostname } from "@/lib/config/sites";
import BeijingClassicLayout from "@/layouts/layout-beijing-classic";
import { validateSiteConfig } from "@/lib/site-config-manager";

export const metadata: Metadata = {
  title: "北京新闻资讯 - 了解北京最新动态",
  description:
    "了解北京最新动态，掌握首都发展脉搏，关注北京城市建设、经济发展、文化传承等全方位资讯。",
  keywords: "北京,新闻,资讯,首都,城市建设,经济发展",
};

interface BeijingLayoutProps {
  children: React.ReactNode;
}

export default async function BeijingLayout({ children }: BeijingLayoutProps) {
  // 获取北京站点的配置
  const beijingSite = getSiteByHostname("beijing.aivoya.com");
  if (!beijingSite) {
    throw new Error("北京站点配置不存在");
  }

  const siteSettings = await getSiteSettings(beijingSite.hostname, {
    forceRefresh: false, // 允许使用缓存
    timeout: 8000, // 增加超时时间
  });

  // 验证配置（非阻塞性）
  if (siteSettings) {
    const validation = validateSiteConfig(siteSettings);
    if (!validation.valid) {
      console.warn("Beijing site config validation failed:", validation.errors);
    }
  }

  return (
    <BeijingClassicLayout siteSettings={siteSettings}>
      {children}
    </BeijingClassicLayout>
  );
}
