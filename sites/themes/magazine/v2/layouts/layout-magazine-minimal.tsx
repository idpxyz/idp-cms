/**
 * Magazine 极简布局
 */

import React from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function LayoutMagazineMinimal({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal Header */}
      <header className="bg-white border-b p-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-light tracking-wide">MAGAZINE</h1>
        </div>
      </header>

      {/* Clean Content Area */}
      <main className="max-w-4xl mx-auto p-8">{children}</main>
    </div>
  );
}
