import React from "react";

interface RankingItem {
  id: string;
  title: string;
  views: number;
  rank: number;
  change?: "up" | "down" | "new";
  category?: string;
}

interface RankingProps {
  title?: string;
  items: RankingItem[];
  variant?: "top10" | "trending" | "popular";
  limit?: number;
}

export default function Ranking({
  title = "热门排行",
  items,
  variant = "top10",
  limit = 10,
}: RankingProps) {
  const displayItems = items.slice(0, limit);

  const getRankColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-500 text-white";
    if (rank === 2) return "bg-gray-400 text-white";
    if (rank === 3) return "bg-orange-500 text-white";
    return "bg-gray-100 text-gray-600";
  };

  const getChangeIcon = (change?: "up" | "down" | "new") => {
    if (change === "up") {
      return (
        <svg
          className="w-4 h-4 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
      );
    }
    if (change === "down") {
      return (
        <svg
          className="w-4 h-4 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      );
    }
    if (change === "new") {
      return (
        <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
          新
        </span>
      );
    }
    return null;
  };

  if (variant === "trending") {
    return (
      <section className="py-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
        <div className="space-y-3">
          {displayItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center space-x-3 p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg hover:bg-gradient-to-r hover:from-orange-100 hover:to-red-100 transition-all duration-200"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankColor(
                  item.rank
                )}`}
              >
                {item.rank}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {item.title}
                </h3>
                {item.category && (
                  <p className="text-xs text-gray-500 mt-1">{item.category}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {getChangeIcon(item.change)}
                <span className="text-sm text-gray-500">
                  {item.views.toLocaleString()} 次
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (variant === "popular") {
    return (
      <section className="py-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
        <div className="space-y-3">
          {displayItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg hover:bg-gradient-to-r hover:from-blue-100 hover:to-purple-100 transition-all duration-200"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankColor(
                  item.rank
                )}`}
              >
                {item.rank}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {item.title}
                </h3>
                <div className="flex items-center mt-1">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          (item.views /
                            Math.max(...displayItems.map((i) => i.views))) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 ml-2">
                    {item.views.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Default top10 variant
  return (
    <section className="py-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
      <div className="space-y-3">
        {displayItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankColor(
                item.rank
              )}`}
            >
              {item.rank}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">
                {item.title}
              </h3>
              {item.category && (
                <p className="text-xs text-gray-500 mt-1">{item.category}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {getChangeIcon(item.change)}
              <span className="text-sm text-gray-500">
                {item.views.toLocaleString()} 次
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
