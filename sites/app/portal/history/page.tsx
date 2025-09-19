import React from 'react';
import { Metadata } from 'next';
import HistoryContent from './HistoryContent';
import PageContainer from '@/components/layout/PageContainer';
import Section from '@/components/layout/Section';

export const metadata: Metadata = {
  title: '阅读历史 - IDP Portal',
  description: '查看您的阅读历史记录',
};

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PageContainer padding="lg">
        <Section space="lg">
          <div className="max-w-6xl mx-auto">
            <HistoryContent />
          </div>
        </Section>
      </PageContainer>
    </div>
  );
}
