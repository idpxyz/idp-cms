import React from "react";
import Image from "next/image";

interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  image?: string;
  publishedAt: string;
  category: string;
  slug: string;
}

interface TopNewsProps {
  title?: string;
  news: NewsItem[];
  variant?: "list" | "grid" | "carousel";
  limit?: number;
}

export default function TopNews({
  title = "头条新闻",
  news,
  variant = "list",
  limit = 5,
}: TopNewsProps) {
  const displayNews = news.slice(0, limit);

  if (variant === "grid") {
    return (
      <section className="py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayNews.map((item) => (
            <article
              key={item.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
            >
              {item.image && (
                <div className="relative w-full h-48">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-center mb-2">
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {item.category}
                  </span>
                  <span className="text-gray-500 text-sm ml-auto">
                    {new Date(item.publishedAt).toLocaleDateString("zh-CN")}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  <a
                    href={`/articles/${item.slug}`}
                    className="hover:text-blue-600"
                  >
                    {item.title}
                  </a>
                </h3>
                <p className="text-gray-600 text-sm line-clamp-3">
                  {item.excerpt}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (variant === "carousel") {
    return (
      <section className="py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
        <div className="relative">
          <div className="flex space-x-4 overflow-x-auto pb-4">
            {displayNews.map((item) => (
              <article
                key={item.id}
                className="flex-shrink-0 w-80 bg-white rounded-lg shadow-md overflow-hidden"
              >
                {item.image && (
                  <div className="relative w-full h-48">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center mb-2">
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {item.category}
                    </span>
                    <span className="text-gray-500 text-sm ml-auto">
                      {new Date(item.publishedAt).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    <a
                      href={`/articles/${item.slug}`}
                      className="hover:text-blue-600"
                    >
                      {item.title}
                    </a>
                  </h3>
                  <p className="text-gray-600 text-sm line-clamp-3">
                    {item.excerpt}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Default list variant
  return (
    <section className="py-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
      <div className="space-y-4">
        {displayNews.map((item, index) => (
          <article
            key={item.id}
            className="flex space-x-4 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            {item.image && (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center mb-2">
                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {item.category}
                </span>
                <span className="text-gray-500 text-sm ml-auto">
                  {new Date(item.publishedAt).toLocaleDateString("zh-CN")}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                <a
                  href={`/articles/${item.slug}`}
                  className="hover:text-blue-600"
                >
                  {item.title}
                </a>
              </h3>
              <p className="text-gray-600 text-sm line-clamp-2">
                {item.excerpt}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
