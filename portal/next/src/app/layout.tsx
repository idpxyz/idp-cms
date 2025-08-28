import type { Metadata } from 'next';
import './globals.css';
import { CacheProvider } from '@/components/CacheProvider';

export const metadata: Metadata = {
  title: 'AI旅行 - AI工具导航与行业资讯门户',
  description:
    '发现最新AI工具，掌握前沿技术动态，开启你的AI探索之旅。AI工具导航、行业资讯、技术趋势。',
  keywords:
    'AI工具, AI导航, AI资讯, 人工智能, 生成式AI, AI工具推荐, aivoya.com',
  authors: [{ name: 'AI旅行团队' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'AI旅行 - AI工具导航与行业资讯门户',
    description: '发现最新AI工具，掌握前沿技术动态，开启你的AI探索之旅。',
    type: 'website',
    locale: 'zh_CN',
    url: 'https://aivoya.com',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <CacheProvider>{children}</CacheProvider>
      </body>
    </html>
  );
}
