import React from 'react';
import { Metadata } from 'next';
import FavoritesContent from './FavoritesContent';
import PageContainer from '@/components/layout/PageContainer';
import Section from '@/components/layout/Section';

// 强制动态渲染，因为此页面使用客户端认证
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '我的收藏 - IDP Portal',
  description: '管理您收藏的文章',
};

export default function FavoritesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PageContainer padding="lg">
        <Section space="lg">
          <div className="max-w-6xl mx-auto">
            <FavoritesContent />
          </div>
        </Section>
      </PageContainer>
    </div>
  );
}
