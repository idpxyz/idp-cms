"use client";

import React from 'react';
import Link from 'next/link';
import CommentSection from '../article/[slug]/CommentSection';

export default function TestCommentContent() {
  return (
    <div className="space-y-8">
      {/* 页面说明 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          评论系统集成测试
        </h1>
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-4">
            这是一个测试页面，用于验证评论系统与"我的评论"功能的集成是否正常工作。
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-medium text-blue-900 mb-2">测试步骤：</h3>
            <ol className="list-decimal list-inside text-blue-800 space-y-1">
              <li>请先登录您的账户</li>
              <li>在下方评论区发表一条评论或回复</li>
              <li>前往 <Link href="/portal/comments" className="text-blue-600 hover:text-blue-700 underline">我的评论</Link> 页面</li>
              <li>确认刚才发表的评论已经出现在"我的评论"列表中</li>
              <li>评论状态应该显示为"审核中"</li>
            </ol>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-green-900 mb-2">功能说明：</h3>
            <ul className="list-disc list-inside text-green-800 space-y-1">
              <li><strong>主评论</strong>：直接发表在文章下的评论</li>
              <li><strong>回复评论</strong>：对其他用户评论的回复</li>
              <li><strong>自动记录</strong>：所有评论会自动保存到用户的"我的评论"中</li>
              <li><strong>状态管理</strong>：新评论默认为"审核中"状态</li>
              <li><strong>完整信息</strong>：记录评论内容、文章信息、发表时间等</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 模拟文章信息 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="border-b border-gray-200 pb-4 mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
            <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
            <span>科技频道</span>
            <span>•</span>
            <span>2024年1月15日</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            评论系统集成测试文章
          </h2>
          <p className="text-gray-600">
            这是一篇用于测试评论系统与"我的评论"功能集成的示例文章。
            您可以在此文章下发表评论，然后前往"我的评论"页面查看是否正确记录。
          </p>
        </div>

        {/* 文章内容 */}
        <div className="prose prose-gray max-w-none">
          <p>
            现代新闻平台的评论系统是用户互动的重要组成部分。一个好的评论系统应该具备以下特点：
          </p>
          <ul>
            <li><strong>实时性</strong>：用户发表评论后立即显示</li>
            <li><strong>层级性</strong>：支持对评论的回复，形成对话</li>
            <li><strong>管理性</strong>：用户能够管理自己的评论历史</li>
            <li><strong>安全性</strong>：具备内容审核和过滤机制</li>
          </ul>
          <p>
            本测试页面展示了评论系统如何与用户评论管理功能无缝集成，
            为用户提供完整的评论体验和管理能力。
          </p>
        </div>
      </div>

      {/* 评论区 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <CommentSection
          articleId="test-comment-integration"
          commentCount={0}
          onCommentCountChange={(count) => {
            console.log('评论数量变化:', count);
          }}
          articleInfo={{
            title: "评论系统集成测试文章",
            slug: "test-comment-integration",
            channel: "科技"
          }}
        />
      </div>

      {/* 快速链接 */}
      <div className="bg-gray-100 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">快速链接</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/portal/comments"
            className="flex items-center justify-center px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">我的评论</span>
          </Link>
          <Link
            href="/portal/history"
            className="flex items-center justify-center px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">阅读历史</span>
          </Link>
          <Link
            href="/portal/favorites"
            className="flex items-center justify-center px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">我的收藏</span>
          </Link>
          <Link
            href="/portal/profile"
            className="flex items-center justify-center px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">个人资料</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
