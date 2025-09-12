"use client";
import React from "react";

export default function StrategyBarModule({
  strategy,
  userType,
  confidence,
  description,
}: {
  strategy?: string;
  userType?: string;
  confidence?: number;
  description?: string;
}) {
  if (!strategy) return null;
  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="text-blue-600 font-medium">🧠</span>
            <span className="text-gray-700">策略: <span className="font-semibold text-blue-700">{strategy}</span></span>
          </div>
          {userType && (
            <div className="flex items-center space-x-2">
              <span className="text-green-600 font-medium">👤</span>
              <span className="text-gray-700">类型: <span className="font-semibold text-green-700">{userType}</span></span>
            </div>
          )}
          {typeof confidence === 'number' && (
            <div className="flex items-center space-x-2">
              <span className="text-purple-600 font-medium">🎯</span>
              <span className="text-gray-700">置信度: <span className="font-semibold text-purple-700">{(confidence * 100).toFixed(0)}%</span></span>
            </div>
          )}
        </div>
        {description && (
          <div className="text-xs text-gray-600 bg-white bg-opacity-50 rounded px-2 py-1">
            {description}
          </div>
        )}
      </div>
    </div>
  );
}


