import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IDP-CMS Sites",
  description: "多站点新闻聚合平台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        {/* 主题令牌注入器 */}
        <ThemeTokenInjector />
        {children}
      </body>
    </html>
  );
}

/**
 * 主题令牌注入器组件
 * 动态注入CSS变量
 *
 * 注意：这里的颜色值只是默认值，实际的颜色应该由各个站点的配置覆盖
 * 真正的动态颜色更新应该在各个站点的布局组件中实现
 */
function ThemeTokenInjector() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
        :root {
          /* 默认主题令牌 - 这些只是基础值 */
          --brand-primary: #3b82f6;
          --brand-secondary: #6b7280;
          --brand-radius: 0.5rem;
          --brand-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          --brand-font: 'Inter', system-ui, sans-serif;
        }
        
        /* 主题切换类 - 这些是预定义的主题 */
        .theme-portal {
          --brand-primary: #1a365d;
          --brand-secondary: #2d3748;
          --brand-radius: 0.25rem;
          --brand-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        
        .theme-localsite-default {
          --brand-primary: #3b82f6;
          --brand-secondary: #6b7280;
          --brand-radius: 0.5rem;
          --brand-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .theme-localsite-shanghai {
          --brand-primary: #dc2626;
          --brand-secondary: #7f1d1d;
          --brand-radius: 0.75rem;
          --brand-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
      `,
      }}
    />
  );
}
