import React from 'react';
import { Metadata } from 'next';
import CommentsContent from './CommentsContent';
import PageContainer from '@/components/layout/PageContainer';
import Section from '@/components/layout/Section';

export const metadata: Metadata = {
  title: '我的评论 - IDP Portal',
  description: '管理您发布的所有评论',
};

export default function CommentsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PageContainer padding="lg">
        <Section space="lg">
          <div className="max-w-6xl mx-auto">
            <CommentsContent />
          </div>
        </Section>
      </PageContainer>
    </div>
  );
}
