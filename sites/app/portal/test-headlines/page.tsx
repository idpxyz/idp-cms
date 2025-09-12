import React from "react";
import TestHeadlinesModule from "../components/TestHeadlinesModule";

export default function TestHeadlinesPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-8">今日头条模块测试</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 测试API版本 */}
        <div className="max-w-md">
          <h2 className="text-lg font-semibold mb-4 text-blue-600">测试API版本</h2>
          <TestHeadlinesModule 
            count={8}
            countLg={10}
            useTestApi={true}
          />
        </div>
        
        {/* 生产API版本 */}
        <div className="max-w-md">
          <h2 className="text-lg font-semibold mb-4 text-green-600">生产API版本</h2>
          <TestHeadlinesModule 
            count={8}
            countLg={10}
            useTestApi={false}
          />
        </div>
      </div>
      
      <div className="mt-8 text-sm text-gray-600">
        <p>测试说明：</p>
        <ul className="list-disc pl-5 mt-2">
          <li>左侧使用测试API，右侧使用生产API</li>
          <li>测试API响应快速且稳定</li>
          <li>生产API可能较慢或超时</li>
          <li>观察浏览器控制台的调试信息</li>
        </ul>
      </div>
    </div>
  );
}
