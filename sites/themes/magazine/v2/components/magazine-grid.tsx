/**
 * Magazine 杂志网格组件
 */

import React from "react";

interface MagazineArticle {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  category: string;
  publishedAt: string;
  image?: string;
}

interface MagazineGridProps {
  articles?: MagazineArticle[];
}

export default function MagazineGrid({ articles = [] }: MagazineGridProps) {
  // Mock magazine articles
  const mockArticles: MagazineArticle[] = [
    {
      id: "1",
      title: "The Art of Storytelling",
      excerpt: "Exploring narrative techniques in modern journalism...",
      author: "Jane Smith",
      category: "Culture",
      publishedAt: "2024-01-01",
    },
    {
      id: "2",
      title: "Digital Revolution",
      excerpt: "How technology is reshaping our daily lives...",
      author: "John Doe",
      category: "Technology",
      publishedAt: "2024-01-02",
    },
    {
      id: "3",
      title: "Urban Perspectives",
      excerpt: "A look at city life through different lenses...",
      author: "Sarah Wilson",
      category: "Lifestyle",
      publishedAt: "2024-01-03",
    },
  ];

  const displayArticles = articles.length > 0 ? articles : mockArticles;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
      {displayArticles.map((article) => (
        <article key={article.id} className="group">
          {article.image && (
            <div className="mb-4 overflow-hidden rounded">
              <img
                src={article.image}
                alt={article.title}
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}
          <div className="mb-2">
            <span className="text-red-600 font-medium text-sm uppercase tracking-wider">
              {article.category}
            </span>
          </div>
          <h3 className="font-serif text-xl font-bold mb-3 group-hover:text-red-600 transition-colors">
            {article.title}
          </h3>
          <p className="text-gray-600 mb-3">{article.excerpt}</p>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>By {article.author}</span>
            <time>{article.publishedAt}</time>
          </div>
        </article>
      ))}
    </div>
  );
}
