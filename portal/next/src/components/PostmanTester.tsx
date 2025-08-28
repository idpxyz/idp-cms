'use client';

import React, { useState, useEffect } from 'react';
import { Play, Copy, CheckCircle, XCircle, Loader, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';

interface PostmanTesterProps {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  onTestComplete?: (result: any) => void;
}

interface QueryParam {
  key: string;
  value: string;
  enabled: boolean;
}

interface Header {
  key: string;
  value: string;
  enabled: boolean;
}

export default function PostmanTester({ endpoint, method, onTestComplete }: PostmanTesterProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [requestBody, setRequestBody] = useState('');
  const [url, setUrl] = useState(endpoint);
  const [localMethod, setLocalMethod] = useState(method);
  const [queryParams, setQueryParams] = useState<QueryParam[]>([
    { key: '', value: '', enabled: true }
  ]);
  const [headers, setHeaders] = useState<Header[]>([
    { key: 'Content-Type', value: 'application/json', enabled: true }
  ]);
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body'>('params');

  // 当endpoint或method prop变化时，更新本地状态
  useEffect(() => {
    setUrl(endpoint);
    setLocalMethod(method);
  }, [endpoint, method]);

  const addQueryParam = () => {
    setQueryParams([...queryParams, { key: '', value: '', enabled: true }]);
  };

  const removeQueryParam = (index: number) => {
    setQueryParams(queryParams.filter((_, i) => i !== index));
  };

  const updateQueryParam = (index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    const newParams = [...queryParams];
    newParams[index] = { ...newParams[index], [field]: value };
    setQueryParams(newParams);
  };

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '', enabled: true }]);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const updateHeader = (index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    setHeaders(newHeaders);
  };

  const buildUrl = () => {
    const enabledParams = queryParams.filter(p => p.enabled && p.key.trim());
    if (enabledParams.length === 0) return url;
    
    const params = enabledParams
      .map(p => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value.trim())}`)
      .join('&');
    
    return `${url}?${params}`;
  };

  const testApi = async () => {
    setIsTesting(true);
    const startTime = Date.now();
    
    try {
      const finalUrl = buildUrl();
      console.log('Testing API:', { method: localMethod, url: finalUrl });
      
      const enabledHeaders = headers.filter(h => h.enabled && h.key.trim());
      
      const options: RequestInit = {
        method: localMethod,
        headers: {},
      };

      // 添加请求头
      enabledHeaders.forEach(header => {
        options.headers![header.key.trim()] = header.value.trim();
      });

      // 添加请求体
      if (localMethod !== 'GET' && requestBody.trim()) {
        try {
          options.body = requestBody;
        } catch (e) {
          console.error('Invalid JSON body');
        }
      }

      const response = await fetch(finalUrl, options);
      const responseTime = Date.now() - startTime;
      
      let data;
      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }

      const testResult = {
        status: response.status,
        statusText: response.statusText,
        responseTime,
        data,
        headers: Object.fromEntries(response.headers.entries()),
        url: url,
        timestamp: new Date().toISOString()
      };

      setResult(testResult);
      onTestComplete?.(testResult);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const testResult = {
        status: 0,
        statusText: 'Error',
        responseTime,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        url: finalUrl,
        timestamp: new Date().toISOString()
      };
      
      setResult(testResult);
      onTestComplete?.(testResult);
    } finally {
      setIsTesting(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(buildUrl());
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
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      {/* 请求配置区域 */}
      <div className="mb-4">
        {/* 请求方法和URL */}
        <div className="flex items-center space-x-3 mb-4">
          <select
            value={localMethod}
            onChange={(e) => setLocalMethod(e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
          </select>
          
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="输入API接口地址..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-mono"
            />
            <button
              onClick={copyUrl}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              title="复制URL"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={testApi}
            disabled={isTesting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            {isTesting ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>{isTesting ? '发送中...' : '发送'}</span>
          </button>
        </div>

        {/* 配置标签页 */}
        <div className="border border-gray-200 rounded-md bg-white">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('params')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'params'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              查询参数
            </button>
            <button
              onClick={() => setActiveTab('headers')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'headers'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              请求头
            </button>
            {localMethod !== 'GET' && (
              <button
                onClick={() => setActiveTab('body')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'body'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                请求体
              </button>
            )}
          </div>

          <div className="p-4">
            {/* 查询参数 */}
            {activeTab === 'params' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">查询参数</span>
                  <button
                    onClick={addQueryParam}
                    className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    <span>添加参数</span>
                  </button>
                </div>
                {queryParams.map((param, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={param.enabled}
                      onChange={(e) => updateQueryParam(index, 'enabled', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <input
                      type="text"
                      placeholder="参数名"
                      value={param.key}
                      onChange={(e) => updateQueryParam(index, 'key', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <input
                      type="text"
                      placeholder="参数值"
                      value={param.value}
                      onChange={(e) => updateQueryParam(index, 'value', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <button
                      onClick={() => removeQueryParam(index)}
                      className="p-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 请求头 */}
            {activeTab === 'headers' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">请求头</span>
                  <button
                    onClick={addHeader}
                    className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    <span>添加请求头</span>
                  </button>
                </div>
                {headers.map((header, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={header.enabled}
                      onChange={(e) => updateHeader(index, 'enabled', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <input
                      type="text"
                      placeholder="请求头名"
                      value={header.key}
                      onChange={(e) => updateHeader(index, 'key', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <input
                      type="text"
                      placeholder="请求头值"
                      value={header.value}
                      onChange={(e) => updateHeader(index, 'value', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <button
                      onClick={() => removeHeader(index)}
                      className="p-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 请求体 */}
            {activeTab === 'body' && localMethod !== 'GET' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  JSON 请求体
                </label>
                <textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  placeholder='{"key": "value"}'
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                  rows={6}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 响应结果 */}
      {result && (
        <div className="border border-gray-200 rounded-md bg-white">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700">响应结果</h3>
          </div>
          
          <div className="p-4 space-y-4">
            {/* 响应状态 */}
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 ${getStatusColor(result.status)}`}>
                {getStatusIcon(result.status)}
                <span className="font-medium">状态: {result.status || 'Error'}</span>
                {result.statusText && <span className="text-sm">({result.statusText})</span>}
              </div>
              <span className="text-gray-500">响应时间: {result.responseTime}ms</span>
              <span className="text-gray-500">时间: {new Date(result.timestamp).toLocaleTimeString()}</span>
            </div>

            {/* 响应头 */}
            {result.headers && Object.keys(result.headers).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">响应头</h4>
                <div className="bg-gray-50 rounded-md p-3">
                  <pre className="text-xs text-gray-800 overflow-x-auto">
                    {JSON.stringify(result.headers, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* 响应数据 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">响应数据</h4>
              <div className="bg-gray-50 rounded-md p-3">
                {result.error ? (
                  <div className="text-red-600 text-sm">{result.error}</div>
                ) : (
                  <pre className="text-xs text-gray-800 overflow-x-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
