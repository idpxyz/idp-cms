/**
 * LocalSite 砌墙布局
 */

import React from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function LayoutLocalsiteMasonry({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-green-700 text-white p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">LocalSite Masonry Layout</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4">
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
          {children}
        </div>
      </main>
    </div>
  );
}
