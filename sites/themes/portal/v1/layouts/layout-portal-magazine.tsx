/**
 * Portal 杂志布局
 */

import React from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function LayoutPortalMagazine({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-serif">Portal Magazine Layout</h1>
          <nav className="mt-2">
            <ul className="flex space-x-6 text-gray-600">
              <li>News</li>
              <li>Features</li>
              <li>Culture</li>
              <li>Sports</li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">{children}</div>
          <aside className="bg-white p-4 rounded shadow">
            <h3 className="font-bold mb-4">Sidebar</h3>
            <p className="text-gray-600">Additional content...</p>
          </aside>
        </div>
      </main>
    </div>
  );
}
