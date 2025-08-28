'use client';

import React, { useState } from 'react';
import { Play, Copy, CheckCircle, XCircle, Loader } from 'lucide-react';

interface ApiTestResult {
  status: number;
  responseTime: number;
  data: any;
  error?: string;
}

interface ApiTesterProps {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  onTestComplete?: (result: ApiTestResult) => void;
}

export default function ApiTester({ endpoint, method, onTestComplete }: ApiTesterProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<ApiTestResult | null>(null);
  const [requestBody, setRequestBody] = useState('');

  const testApi = async () => {
    setIsTesting(true);
    const startTime = Date.now();
    
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (method !== 'GET' && requestBody.trim()) {
        try {
          options.body = requestBody;
        } catch (e) {
          console.error('Invalid JSON body');
        }
      }

      const response = await fetch(endpoint, options);
      const responseTime = Date.now() - startTime;
      
      let data;
      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }

      const testResult: ApiTestResult = {
        status: response.status,
        responseTime,
        data,
      };

      setResult(testResult);
      onTestComplete?.(testResult);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const testResult: ApiTestResult = {
        status: 0,
        responseTime,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      
      setResult(testResult);
      onTestComplete?.(testResult);
    } finally {
      setIsTesting(false);
    }
  };

  const copyEndpoint = () => {
    navigator.clipboard.writeText(endpoint);
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 400 && status < 500) return 'text-yellow-600';
    if (status >= 500) return 'text-red-600';
    return 'text-gray-600';
  };

  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) return <CheckCircle className="w-4 h-4" />;
    if (status >= 400) return <XCircle className="w-4 h-4" />;
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            method === 'GET' ? 'bg-blue-100 text-blue-800' :
            method === 'POST' ? 'bg-green-100 text-green-800' :
            method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
            method === 'DELETE' ? 'bg-red-100 text-red-800' :
            'bg-purple-100 text-purple-800'
          }`}>
            {method}
          </span>
          <span className="text-sm font-mono text-gray-600">{endpoint}</span>
        </div>
        <button
          onClick={copyEndpoint}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title="复制接口地址"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>

      {method !== 'GET' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            请求体 (JSON)
          </label>
          <textarea
            value={requestBody}
            onChange={(e) => setRequestBody(e.target.value)}
            placeholder='{"key": "value"}'
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            rows={3}
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={testApi}
          disabled={isTesting}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isTesting ? (
            <Loader className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          {isTesting ? '测试中...' : '测试接口'}
        </button>

        {result && (
          <div className="flex items-center space-x-2 text-sm">
            <span className={`flex items-center space-x-1 ${getStatusColor(result.status)}`}>
              {getStatusIcon(result.status)}
              <span>状态: {result.status || 'Error'}</span>
            </span>
            <span className="text-gray-500">
              响应时间: {result.responseTime}ms
            </span>
          </div>
        )}
      </div>

      {result && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <div className="text-sm font-medium text-gray-700 mb-2">响应结果:</div>
          {result.error ? (
            <div className="text-red-600 text-sm">{result.error}</div>
          ) : (
            <pre className="text-xs text-gray-800 overflow-x-auto">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}




