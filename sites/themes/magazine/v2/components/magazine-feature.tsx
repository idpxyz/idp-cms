/**
 * Magazine 特色文章组件
 */

import React from "react";

interface FeatureArticle {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  author: string;
  publishedAt: string;
  tags?: string[];
  image?: string;
}

interface MagazineFeatureProps {
  article?: FeatureArticle;
}

export default function MagazineFeature({ article }: MagazineFeatureProps) {
  // Mock feature article
  const defaultArticle: FeatureArticle = {
    id: "feature-1",
    title: "The Future of Journalism",
    subtitle: "How digital transformation is reshaping the media landscape",
    content:
      "In an era of rapid technological advancement, the journalism industry faces unprecedented challenges and opportunities. From AI-powered newsrooms to virtual reality storytelling, the way we consume and create news is evolving at breakneck speed...",
    author: "Editorial Team",
    publishedAt: "January 15, 2024",
    tags: ["Technology", "Media", "Future"],
  };

  const displayArticle = article || defaultArticle;

  return (
    <article className="bg-gray-50 p-8 rounded-lg mb-8">
      <div className="mb-6">
        <div className="text-red-600 font-bold text-sm uppercase tracking-wider mb-2">
          Featured Article
        </div>
        <h2 className="font-serif text-3xl font-bold mb-3">
          {displayArticle.title}
        </h2>
        {displayArticle.subtitle && (
          <p className="text-xl text-gray-600 mb-4">
            {displayArticle.subtitle}
          </p>
        )}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
          <span>By {displayArticle.author}</span>
          <span>•</span>
          <time>{displayArticle.publishedAt}</time>
        </div>
      </div>

      {displayArticle.image && (
        <div className="mb-6">
          <img
            src={displayArticle.image}
            alt={displayArticle.title}
            className="w-full h-64 object-cover rounded"
          />
        </div>
      )}

      <div className="prose prose-lg max-w-none mb-6">
        <p className="text-gray-700 leading-relaxed">
          {displayArticle.content}
        </p>
      </div>

      {displayArticle.tags && displayArticle.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {displayArticle.tags.map((tag) => (
            <span
              key={tag}
              className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
