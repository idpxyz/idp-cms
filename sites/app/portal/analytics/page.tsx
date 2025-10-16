import { Metadata } from 'next';
import AnalyticsContent from './AnalyticsContent';

// 强制动态渲染
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '数据分析 - IDP Portal',
  description: '查看用户行为分析数据',
};

export default function AnalyticsPage() {
  return <AnalyticsContent />;
}

