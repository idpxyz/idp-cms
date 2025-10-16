import React from 'react';
import { Metadata } from 'next';
import ProfileContent from './ProfileContent';
import PageContainer from '@/components/layout/PageContainer';
import Section from '@/components/layout/Section';

// 强制动态渲染，因为此页面使用客户端认证
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '个人资料 - IDP Portal',
  description: '管理您的个人资料信息',
};

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PageContainer padding="lg">
        <Section space="lg">
          <div className="max-w-4xl mx-auto">
            <ProfileContent />
          </div>
        </Section>
      </PageContainer>
    </div>
  );
}
