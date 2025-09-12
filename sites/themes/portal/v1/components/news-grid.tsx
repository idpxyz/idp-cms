/**
 * Portal 新闻网格组件
 */

import React from "react";

interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  image?: string;
  publishedAt: string;
}

interface NewsGridProps {
  items?: NewsItem[];
}

export default function NewsGrid({ items = [] }: NewsGridProps) {
  // Mock data if no items provided
  const mockItems: NewsItem[] = [
    {
      id: "1",
      title: "Latest News Story",
      excerpt: "This is a sample news excerpt...",
      publishedAt: "2024-01-01",
    },
    {
      id: "2",
      title: "Technology Update",
      excerpt: "New developments in tech...",
      publishedAt: "2024-01-02",
    },
    {
      id: "3",
      title: "World Events",
      excerpt: "International news summary...",
      publishedAt: "2024-01-03",
    },
  ];

  const displayItems = items.length > 0 ? items : mockItems;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {displayItems.map((item) => (
        <article key={item.id} className="bg-white rounded-lg shadow p-4">
          {item.image && (
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-32 object-cover rounded mb-3"
            />
          )}
          <h3 className="font-bold text-lg mb-2">{item.title}</h3>
          <p className="text-gray-600 mb-3">{item.excerpt}</p>
          <time className="text-sm text-gray-500">{item.publishedAt}</time>
        </article>
      ))}
    </div>
  );
}
