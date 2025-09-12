/**
 * Magazine 编辑布局
 */

import React from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function LayoutMagazineEditorial({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Editorial Header */}
      <header className="bg-black text-white p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-5xl font-bold mb-4">EDITORIAL</h1>
          <p className="text-xl text-gray-300">
            In-depth analysis and commentary
          </p>
        </div>
      </header>

      {/* Editorial Content */}
      <main className="max-w-6xl mx-auto p-8">
        <div className="grid grid-cols-3 gap-12">
          <div className="col-span-2">{children}</div>
          <aside className="space-y-8">
            <div className="border-l-4 border-black pl-6">
              <h3 className="font-bold text-xl mb-3">About the Author</h3>
              <p className="text-gray-600">Editorial team bio...</p>
            </div>
            <div className="border-l-4 border-gray-300 pl-6">
              <h3 className="font-bold text-xl mb-3">Related Articles</h3>
              <p className="text-gray-600">More editorial content...</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
