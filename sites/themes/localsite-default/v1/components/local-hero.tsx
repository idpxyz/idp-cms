/**
 * LocalSite 本地横幅组件
 */

import React from "react";

interface LocalHeroProps {
  title?: string;
  subtitle?: string;
  cityName?: string;
}

export default function LocalHero({
  title = "Welcome to Our Community",
  subtitle = "Stay connected with local news and events",
  cityName = "Your City",
}: LocalHeroProps) {
  return (
    <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-8 rounded-lg mb-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p className="text-lg mb-2">{subtitle}</p>
        <span className="bg-white text-green-600 px-3 py-1 rounded-full text-sm font-medium">
          {cityName}
        </span>
      </div>
    </div>
  );
}
