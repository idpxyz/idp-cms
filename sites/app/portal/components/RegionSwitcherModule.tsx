"use client";
import React from "react";

export default function RegionSwitcherModule() {
  const regions = [
    { slug: 'beijing', name: '北京' },
    { slug: 'shanghai', name: '上海' },
    { slug: 'shenzhen', name: '深圳' },
    { slug: 'hangzhou', name: '杭州' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">切换地区</h3>
      <div className="grid grid-cols-2 gap-3">
        {regions.map((r) => (
          <a
            key={r.slug}
            href={`/${r.slug}`}
            className="text-sm px-3 py-2 rounded border border-gray-200 hover:border-red-300 hover:text-red-500 transition-colors text-center"
          >
            {r.name}
          </a>
        ))}
      </div>
    </div>
  );
}


