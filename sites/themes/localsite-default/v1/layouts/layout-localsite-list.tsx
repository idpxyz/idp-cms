/**
 * LocalSite 列表布局
 */

import React from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function LayoutLocalsiteList({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-green-600 text-white p-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold">LocalSite List Layout</h1>
          <nav className="mt-2">
            <ul className="flex space-x-4 text-green-200">
              <li>Home</li>
              <li>Local News</li>
              <li>Events</li>
              <li>Community</li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-4 gap-6">
          <div className="col-span-3">{children}</div>
          <aside className="bg-gray-50 p-4 rounded">
            <h3 className="font-bold mb-4">Local Info</h3>
            <div className="space-y-3">
              <div className="text-sm">
                <h4 className="font-medium">Weather</h4>
                <p className="text-gray-600">Sunny, 22°C</p>
              </div>
              <div className="text-sm">
                <h4 className="font-medium">Events</h4>
                <p className="text-gray-600">Community meeting today</p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 p-4 mt-8">
        <div className="max-w-6xl mx-auto text-center text-gray-600">
          <p>&copy; 2024 Local Site. Serving our community.</p>
        </div>
      </footer>
    </div>
  );
}
