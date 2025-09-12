import React from "react";
import { Metadata } from "next";
import { getSiteSettings } from "@/lib/api/client";
import { getSiteByHostname } from "@/lib/config/sites";
import ShanghaiClassicLayout from "@/layouts/layout-shanghai-classic";
import { validateSiteConfig } from "@/lib/site-config-manager";

export const metadata: Metadata = {
  title: "上海新闻资讯 - 了解上海最新动态",
  description:
    "了解上海最新动态，掌握城市发展脉搏，关注上海城市建设、经济发展、文化传承等全方位资讯。",
  keywords: "上海,新闻,资讯,魔都,城市建设,经济发展",
};

interface ShanghaiLayoutProps {
  children: React.ReactNode;
}

export default async function ShanghaiLayout({
  children,
}: ShanghaiLayoutProps) {
  // 获取上海站点的配置
  const shanghaiSite = getSiteByHostname("shanghai.aivoya.com");
  if (!shanghaiSite) {
    throw new Error("上海站点配置不存在");
  }

  const siteSettings = await getSiteSettings(shanghaiSite.hostname);

  // 验证配置
  if (siteSettings) {
    const validation = validateSiteConfig(siteSettings);
    if (!validation.valid) {
      console.warn(
        "Shanghai site config validation failed:",
        validation.errors
      );
    }
  }

  return (
    <ShanghaiClassicLayout siteSettings={siteSettings}>
      {children}
    </ShanghaiClassicLayout>
  );
}
