import React from 'react';
import { Metadata } from 'next';
import SettingsContent from './SettingsContent';
import PageContainer from '@/components/layout/PageContainer';
import Section from '@/components/layout/Section';

export const metadata: Metadata = {
  title: '设置 - IDP Portal',
  description: '管理您的账户设置和偏好',
};

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PageContainer padding="lg">
        <Section space="lg">
          <div className="max-w-4xl mx-auto">
            <SettingsContent />
          </div>
        </Section>
      </PageContainer>
    </div>
  );
}
