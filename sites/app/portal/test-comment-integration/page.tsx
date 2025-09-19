import React from 'react';
import { Metadata } from 'next';
import TestCommentContent from './TestCommentContent';

export const metadata: Metadata = {
  title: '评论集成测试 - IDP Portal',
  description: '测试评论系统与我的评论功能的集成',
};

export default function TestCommentIntegrationPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <TestCommentContent />
      </div>
    </div>
  );
}
