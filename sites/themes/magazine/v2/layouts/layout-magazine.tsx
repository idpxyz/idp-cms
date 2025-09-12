/**
 * Magazine 主布局
 */

import React from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function LayoutMagazine({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b-2 border-red-600 p-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-serif text-red-600 mb-2">
            Magazine Layout
          </h1>
          <nav>
            <ul className="flex space-x-8 text-gray-600 font-medium">
              <li>Features</li>
              <li>Opinion</li>
              <li>Culture</li>
              <li>Lifestyle</li>
              <li>Reviews</li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-6">
        <div className="grid grid-cols-5 gap-8">
          <div className="col-span-4">{children}</div>
          <aside className="space-y-6">
            <div className="bg-red-50 p-4 rounded">
              <h3 className="font-bold text-red-800 mb-3">Editor's Pick</h3>
              <p className="text-sm text-red-700">
                Featured editorial content...
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-bold mb-3">Subscribe</h3>
              <p className="text-sm text-gray-600">Get our weekly digest</p>
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white p-6 mt-12">
        <div className="max-w-5xl mx-auto text-center">
          <p>&copy; 2024 Magazine. Quality journalism since 1950.</p>
        </div>
      </footer>
    </div>
  );
}
