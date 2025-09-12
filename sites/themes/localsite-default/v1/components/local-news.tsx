/**
 * LocalSite 本地新闻组件
 */

import React from "react";

interface LocalNewsItem {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string;
}

interface LocalNewsProps {
  items?: LocalNewsItem[];
}

export default function LocalNews({ items = [] }: LocalNewsProps) {
  // Mock local news data
  const mockItems: LocalNewsItem[] = [
    {
      id: "1",
      title: "New Park Opens Downtown",
      excerpt: "The city's newest park provides green space for families...",
      category: "Community",
      publishedAt: "2024-01-01",
    },
    {
      id: "2",
      title: "Local School Wins Award",
      excerpt: "Recognition for outstanding education programs...",
      category: "Education",
      publishedAt: "2024-01-02",
    },
    {
      id: "3",
      title: "Weekend Farmers Market",
      excerpt: "Fresh produce and local vendors every Saturday...",
      category: "Events",
      publishedAt: "2024-01-03",
    },
  ];

  const displayItems = items.length > 0 ? items : mockItems;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Local News</h2>
      {displayItems.map((item) => (
        <article
          key={item.id}
          className="border-l-4 border-green-500 pl-4 py-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
              {item.category}
            </span>
            <time className="text-gray-500 text-sm">{item.publishedAt}</time>
          </div>
          <h3 className="font-bold text-lg mb-2">{item.title}</h3>
          <p className="text-gray-600">{item.excerpt}</p>
        </article>
      ))}
    </div>
  );
}
