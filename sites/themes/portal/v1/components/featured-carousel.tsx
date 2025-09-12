/**
 * Portal 特色内容轮播组件
 */

import React from "react";

interface FeaturedItem {
  id: string;
  title: string;
  description: string;
  image?: string;
  link?: string;
}

interface FeaturedCarouselProps {
  items?: FeaturedItem[];
}

export default function FeaturedCarousel({
  items = [],
}: FeaturedCarouselProps) {
  // Mock data if no items provided
  const mockItems: FeaturedItem[] = [
    {
      id: "1",
      title: "Featured Story 1",
      description: "This is a featured story description...",
    },
    {
      id: "2",
      title: "Featured Story 2",
      description: "Another featured story description...",
    },
    {
      id: "3",
      title: "Featured Story 3",
      description: "Third featured story description...",
    },
  ];

  const displayItems = items.length > 0 ? items : mockItems;

  return (
    <div className="bg-gray-100 p-6 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Featured Content</h2>
      <div className="space-y-4">
        {displayItems.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded shadow">
            <h3 className="font-bold text-lg mb-2">{item.title}</h3>
            <p className="text-gray-600">{item.description}</p>
            {item.link && (
              <a
                href={item.link}
                className="text-blue-600 hover:underline mt-2 inline-block"
              >
                Read more →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
