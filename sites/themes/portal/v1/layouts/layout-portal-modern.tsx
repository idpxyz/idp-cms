/**
 * Portal 现代布局
 */

import React from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function LayoutPortalModern({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">Portal Modern Layout</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4">{children}</main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white p-4 mt-8">
        <div className="max-w-7xl mx-auto text-center">
          <p>&copy; 2024 Portal Site. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
