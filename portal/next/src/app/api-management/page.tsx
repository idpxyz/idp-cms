'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Settings, 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Copy,
  ExternalLink,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
  ArrowLeft
} from 'lucide-react';
import ApiTester from '../../components/ApiTester';
import PostmanTester from '../../components/PostmanTester';

interface ApiEndpoint {
  id: string;
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  status: 'active' | 'inactive' | 'error';
  responseTime: number;
  lastTested: string;
  description: string;
  category: string;
  version: string;
  isExpanded?: boolean;
}

const mockApiEndpoints: ApiEndpoint[] = [
  // 内容流API
  {
    id: '1',
    name: '智能推荐流',
    path: '/api/feed',
    method: 'GET',
    status: 'active',
    responseTime: 180,
    lastTested: '2024-01-15 14:30',
    description: '获取智能推荐的内容流，支持模板、频道、排序等参数',
    category: '内容流',
    version: 'v1'
  },
  {
    id: '2',
    name: '内容映射查询',
    path: '/api/feed-to-content/{feed_article_id}',
    method: 'GET',
    status: 'active',
    responseTime: 95,
    lastTested: '2024-01-15 14:25',
    description: '根据feed文章ID获取实际内容ID',
    category: '内容流',
    version: 'v1'
  },

  // AI工具API
  {
    id: '3',
    name: 'AI工具列表',
    path: '/api/ai-tools',
    method: 'GET',
    status: 'active',
    responseTime: 120,
    lastTested: '2024-01-15 14:20',
    description: '获取AI工具列表，支持分类、搜索、定价等筛选',
    category: 'AI工具',
    version: 'v1'
  },
  {
    id: '4',
    name: 'AI工具分类',
    path: '/api/ai-tools/categories',
    method: 'GET',
    status: 'active',
    responseTime: 85,
    lastTested: '2024-01-15 14:15',
    description: '获取AI工具分类列表和统计信息',
    category: 'AI工具',
    version: 'v1'
  },
  {
    id: '5',
    name: '热门AI工具',
    path: '/api/ai-tools/hot',
    method: 'GET',
    status: 'active',
    responseTime: 95,
    lastTested: '2024-01-15 14:10',
    description: '获取热门AI工具列表',
    category: 'AI工具',
    version: 'v1'
  },
  {
    id: '6',
    name: 'AI工具详情',
    path: '/api/ai-tools/{tool_id}',
    method: 'GET',
    status: 'active',
    responseTime: 75,
    lastTested: '2024-01-15 14:05',
    description: '获取指定AI工具的详细信息',
    category: 'AI工具',
    version: 'v1'
  },

  // AI新闻API
  {
    id: '7',
    name: 'AI新闻列表',
    path: '/api/ai-news',
    method: 'GET',
    status: 'active',
    responseTime: 110,
    lastTested: '2024-01-15 14:00',
    description: '获取AI新闻列表，支持分类、搜索等筛选',
    category: 'AI新闻',
    version: 'v1'
  },
  {
    id: '8',
    name: 'AI新闻分类',
    path: '/api/ai-news/categories',
    method: 'GET',
    status: 'active',
    responseTime: 80,
    lastTested: '2024-01-15 13:55',
    description: '获取AI新闻分类列表',
    category: 'AI新闻',
    version: 'v1'
  },
  {
    id: '9',
    name: '热门AI新闻',
    path: '/api/ai-news/hot',
    method: 'GET',
    status: 'active',
    responseTime: 90,
    lastTested: '2024-01-15 13:50',
    description: '获取热门AI新闻列表',
    category: 'AI新闻',
    version: 'v1'
  },
  {
    id: '10',
    name: 'AI新闻详情',
    path: '/api/ai-news/{news_id}',
    method: 'GET',
    status: 'active',
    responseTime: 70,
    lastTested: '2024-01-15 13:45',
    description: '获取指定AI新闻的详细信息',
    category: 'AI新闻',
    version: 'v1'
  },
  {
    id: '11',
    name: '更新阅读数',
    path: '/api/ai-news/{news_id}/read',
    method: 'POST',
    status: 'active',
    responseTime: 65,
    lastTested: '2024-01-15 13:40',
    description: '更新AI新闻的阅读计数',
    category: 'AI新闻',
    version: 'v1'
  },

  // AI教程API
  {
    id: '12',
    name: 'AI教程列表',
    path: '/api/ai-tutorials',
    method: 'GET',
    status: 'active',
    responseTime: 105,
    lastTested: '2024-01-15 13:35',
    description: '获取AI教程列表，支持分类、难度等筛选',
    category: 'AI教程',
    version: 'v1'
  },
  {
    id: '13',
    name: 'AI教程分类',
    path: '/api/ai-tutorials/categories',
    method: 'GET',
    status: 'active',
    responseTime: 75,
    lastTested: '2024-01-15 13:30',
    description: '获取AI教程分类列表',
    category: 'AI教程',
    version: 'v1'
  },
  {
    id: '14',
    name: 'AI教程难度',
    path: '/api/ai-tutorials/difficulties',
    method: 'GET',
    status: 'active',
    responseTime: 70,
    lastTested: '2024-01-15 13:25',
    description: '获取AI教程难度等级列表',
    category: 'AI教程',
    version: 'v1'
  },
  {
    id: '15',
    name: 'AI教程详情',
    path: '/api/ai-tutorials/{tutorial_id}',
    method: 'GET',
    status: 'active',
    responseTime: 80,
    lastTested: '2024-01-15 13:20',
    description: '获取指定AI教程的详细信息',
    category: 'AI教程',
    version: 'v1'
  },

  // 站点信息API
  {
    id: '16',
    name: '站点信息',
    path: '/api/site/info',
    method: 'GET',
    status: 'active',
    responseTime: 60,
    lastTested: '2024-01-15 13:15',
    description: '获取站点基本信息和配置',
    category: '站点配置',
    version: 'v1'
  },
  {
    id: '17',
    name: '站点功能',
    path: '/api/site/features',
    method: 'GET',
    status: 'active',
    responseTime: 65,
    lastTested: '2024-01-15 13:10',
    description: '获取站点功能特性列表',
    category: '站点配置',
    version: 'v1'
  },
  {
    id: '18',
    name: '功能检查',
    path: '/api/site/check-feature',
    method: 'GET',
    status: 'active',
    responseTime: 55,
    lastTested: '2024-01-15 13:05',
    description: '检查指定功能是否启用',
    category: '站点配置',
    version: 'v1'
  },
  {
    id: '19',
    name: '站点主题',
    path: '/api/site/theme',
    method: 'GET',
    status: 'active',
    responseTime: 50,
    lastTested: '2024-01-15 13:00',
    description: '获取站点主题配置',
    category: '站点配置',
    version: 'v1'
  },

  // 缓存管理API
  {
    id: '20',
    name: '缓存统计',
    path: '/api/cache/stats',
    method: 'GET',
    status: 'active',
    responseTime: 45,
    lastTested: '2024-01-15 12:55',
    description: '获取缓存使用统计信息',
    category: '缓存管理',
    version: 'v1'
  },
  {
    id: '21',
    name: '清除缓存',
    path: '/api/cache/clear',
    method: 'POST',
    status: 'active',
    responseTime: 200,
    lastTested: '2024-01-15 12:50',
    description: '清除所有缓存',
    category: '缓存管理',
    version: 'v1'
  },
  {
    id: '22',
    name: '模式失效',
    path: '/api/cache/invalidate',
    method: 'POST',
    status: 'active',
    responseTime: 150,
    lastTested: '2024-01-15 12:45',
    description: '根据模式失效指定缓存',
    category: '缓存管理',
    version: 'v1'
  },
  {
    id: '23',
    name: '新闻缓存失效',
    path: '/api/cache/invalidate-news',
    method: 'POST',
    status: 'active',
    responseTime: 140,
    lastTested: '2024-01-15 12:40',
    description: '失效新闻相关缓存',
    category: '缓存管理',
    version: 'v1'
  },
  {
    id: '24',
    name: '工具缓存失效',
    path: '/api/cache/invalidate-tools',
    method: 'POST',
    status: 'error',
    responseTime: 0,
    lastTested: '2024-01-15 12:35',
    description: '失效工具相关缓存',
    category: '缓存管理',
    version: 'v1'
  },
  {
    id: '25',
    name: '缓存健康检查',
    path: '/api/cache/health',
    method: 'GET',
    status: 'active',
    responseTime: 40,
    lastTested: '2024-01-15 12:30',
    description: '检查缓存系统健康状态',
    category: '缓存管理',
    version: 'v1'
  },

  // 用户行为追踪API
  {
    id: '26',
    name: '用户行为追踪',
    path: '/api/track',
    method: 'POST',
    status: 'active',
    responseTime: 85,
    lastTested: '2024-01-15 12:25',
    description: '记录用户行为和交互数据',
    category: '数据分析',
    version: 'v1'
  },

  // 搜索API
  {
    id: '27',
    name: '全文搜索',
    path: '/api/search',
    method: 'GET',
    status: 'active',
    responseTime: 250,
    lastTested: '2024-01-15 12:20',
    description: 'OpenSearch全文搜索服务',
    category: '搜索服务',
    version: 'v1'
  },

  // 管理后台API
  {
    id: '28',
    name: 'Wagtail管理',
    path: '/admin/',
    method: 'GET',
    status: 'active',
    responseTime: 120,
    lastTested: '2024-01-15 12:15',
    description: 'Wagtail CMS管理后台',
    category: '管理后台',
    version: 'v1'
  },
  {
    id: '29',
    name: 'Django管理',
    path: '/django-admin/',
    method: 'GET',
    status: 'active',
    responseTime: 110,
    lastTested: '2024-01-15 12:10',
    description: 'Django原生管理后台',
    category: '管理后台',
    version: 'v1'
  }
];

export default function ApiManagementPage() {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>(mockApiEndpoints.map(ep => ({ ...ep, isExpanded: false })));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  const categories = ['all', '内容流', 'AI工具', 'AI新闻', 'AI教程', '站点配置', '缓存管理', '数据分析', '搜索服务', '管理后台'];
  const statuses = ['all', 'active', 'inactive', 'error'];

  const filteredEndpoints = endpoints.filter(endpoint => {
    const matchesSearch = endpoint.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         endpoint.path.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || endpoint.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || endpoint.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    if (isDarkTheme) {
      switch (status) {
        case 'active': return 'text-green-400 bg-green-900/30 border border-green-700';
        case 'inactive': return 'text-gray-400 bg-gray-700/30 border border-gray-600';
        case 'error': return 'text-red-400 bg-red-900/30 border border-red-700';
        default: return 'text-gray-400 bg-gray-700/30 border border-gray-600';
      }
    } else {
      switch (status) {
        case 'active': return 'text-green-600 bg-green-100 border border-green-300';
        case 'inactive': return 'text-gray-600 bg-gray-100 border border-gray-300';
        case 'error': return 'text-red-600 bg-red-100 border border-red-300';
        default: return 'text-gray-600 bg-gray-100 border border-gray-300';
      }
    }
  };

  const getMethodColor = (method: string) => {
    if (isDarkTheme) {
      switch (method) {
        case 'GET': return 'bg-blue-900/50 text-blue-300 border border-blue-700';
        case 'POST': return 'bg-green-900/50 text-green-300 border border-green-700';
        case 'PUT': return 'bg-yellow-900/50 text-yellow-300 border border-yellow-700';
        case 'DELETE': return 'bg-red-900/50 text-red-300 border border-red-700';
        case 'PATCH': return 'bg-purple-900/50 text-purple-300 border border-purple-700';
        default: return 'bg-gray-700/50 text-gray-300 border border-gray-600';
      }
    } else {
      switch (method) {
        case 'GET': return 'bg-blue-100 text-blue-800 border border-blue-300';
        case 'POST': return 'bg-green-100 text-green-800 border border-green-300';
        case 'PUT': return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
        case 'DELETE': return 'bg-red-100 text-red-800 border border-red-300';
        case 'PATCH': return 'bg-purple-100 text-purple-800 border border-purple-300';
        default: return 'bg-gray-100 text-gray-800 border border-gray-300';
      }
    }
  };

  const testEndpoint = async (endpoint: ApiEndpoint) => {
    setIsTesting(endpoint.id);
    try {
      // 实际API测试
      const startTime = Date.now();
      const response = await fetch(endpoint.path, { method: endpoint.method });
      const responseTime = Date.now() - startTime;
      
      // 更新测试结果
      setEndpoints(prev => prev.map(ep => 
        ep.id === endpoint.id 
          ? { 
              ...ep, 
              lastTested: new Date().toLocaleString('zh-CN'), 
              status: response.ok ? 'active' as const : 'error' as const,
              responseTime: response.ok ? responseTime : 0
            }
          : ep
      ));
    } catch (error) {
      console.error('API测试失败:', error);
      // 更新为错误状态
      setEndpoints(prev => prev.map(ep => 
        ep.id === endpoint.id 
          ? { ...ep, lastTested: new Date().toLocaleString('zh-CN'), status: 'error' as const, responseTime: 0 }
          : ep
      ));
    } finally {
      setIsTesting(null);
    }
  };

  const toggleEndpointExpansion = (endpointId: string) => {
    setEndpoints(prev => prev.map(ep => 
      ep.id === endpointId 
        ? { ...ep, isExpanded: !ep.isExpanded }
        : ep
    ));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // 可以添加一个toast提示
  };

  // 动态主题样式
  const themeClasses = {
    container: isDarkTheme ? 'min-h-screen bg-gray-900' : 'min-h-screen bg-gray-50',
    header: isDarkTheme ? 'bg-gray-800 border-b border-gray-700' : 'bg-white border-b border-gray-200',
    headerTitle: isDarkTheme ? 'text-white' : 'text-gray-900',
    headerSubtitle: isDarkTheme ? 'text-gray-300' : 'text-gray-600',
    headerButton: isDarkTheme ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50',
    searchContainer: isDarkTheme ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200',
    searchInput: isDarkTheme ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500',
    searchSelect: isDarkTheme ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900',
    searchButton: isDarkTheme ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50',
    statsCard: isDarkTheme ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200',
    statsTitle: isDarkTheme ? 'text-gray-300' : 'text-gray-500',
    statsValue: isDarkTheme ? 'text-white' : 'text-gray-900',
    statsIcon: isDarkTheme ? 'text-green-500 text-red-500 text-yellow-500 text-blue-500' : 'text-green-600 text-red-600 text-yellow-600 text-blue-600',
    overviewContainer: isDarkTheme ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200',
    overviewHeader: isDarkTheme ? 'border-gray-700' : 'border-gray-200',
    overviewTitle: isDarkTheme ? 'text-white' : 'text-gray-900',
    overviewSubtitle: isDarkTheme ? 'text-gray-300' : 'text-gray-600',
    overviewCard: isDarkTheme ? 'border-gray-600 bg-gray-700 hover:border-gray-500' : 'border-gray-200 bg-white hover:shadow-md',
    overviewCardTitle: isDarkTheme ? 'text-white' : 'text-gray-900',
    overviewCardText: isDarkTheme ? 'text-gray-300' : 'text-gray-500',
    overviewCardValue: isDarkTheme ? 'text-green-400 text-red-400 text-blue-400' : 'text-green-600 text-red-600 text-blue-600',
    tableContainer: isDarkTheme ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200',
    tableHeader: isDarkTheme ? 'border-gray-700' : 'border-gray-200',
    tableTitle: isDarkTheme ? 'text-white' : 'text-gray-900',
    tableSubtitle: isDarkTheme ? 'text-gray-300' : 'text-gray-600',
    tableHead: isDarkTheme ? 'bg-gray-700' : 'bg-gray-50',
    tableHeadText: isDarkTheme ? 'text-gray-300' : 'text-gray-500',
    tableBody: isDarkTheme ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200',
    tableRow: isDarkTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-50',
    tableCellText: isDarkTheme ? 'text-white' : 'text-gray-900',
    tableCellSecondary: isDarkTheme ? 'text-gray-300' : 'text-gray-500',
    tableCellTertiary: isDarkTheme ? 'text-gray-400' : 'text-gray-400',
    expandedArea: isDarkTheme ? 'bg-gray-700' : 'bg-gray-50',
    expandedTitle: isDarkTheme ? 'text-white' : 'text-gray-900',
  };

  return (
    <div className={themeClasses.container}>
      {/* 页面头部 */}
      <div className={themeClasses.header}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${themeClasses.headerTitle}`}>API接口管理</h1>
              <p className={`mt-2 ${themeClasses.headerSubtitle}`}>管理和监控后端API接口状态</p>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => setIsDarkTheme(!isDarkTheme)}
                className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${themeClasses.headerButton}`}
              >
                {isDarkTheme ? (
                  <>
                    <Sun className="w-4 h-4 mr-2" />
                    浅色主题
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 mr-2" />
                    深色主题
                  </>
                )}
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <Plus className="w-4 h-4 mr-2" />
                添加接口
              </button>
              <button className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${themeClasses.headerButton}`}>
                <Settings className="w-4 h-4 mr-2" />
                配置
              </button>
              <button 
                onClick={() => window.history.back()}
                className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${themeClasses.headerButton}`}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className={`rounded-lg border p-6 mb-6 ${themeClasses.searchContainer}`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜索接口名称或路径..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${themeClasses.searchInput}`}
              />
            </div>

            {/* 分类筛选 */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${themeClasses.searchSelect}`}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? '所有分类' : category}
                </option>
              ))}
            </select>

            {/* 状态筛选 */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={`px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${themeClasses.searchSelect}`}
            >
              {statuses.map(status => (
                <option key={status} value={status}>
                  {status === 'all' ? '所有状态' : status}
                </option>
              ))}
            </select>

            {/* 刷新按钮 */}
            <button 
              onClick={() => window.location.reload()}
              className={`inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${themeClasses.searchButton}`}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className={`rounded-lg border p-6 ${themeClasses.statsCard}`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className={`w-8 h-8 ${isDarkTheme ? 'text-green-500' : 'text-green-600'}`} />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${themeClasses.statsTitle}`}>活跃接口</p>
                <p className={`text-2xl font-semibold ${themeClasses.statsValue}`}>
                  {endpoints.filter(ep => ep.status === 'active').length}
                </p>
              </div>
            </div>
          </div>

          <div className={`rounded-lg border p-6 ${themeClasses.statsCard}`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircle className={`w-8 h-8 ${isDarkTheme ? 'text-red-500' : 'text-red-600'}`} />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${themeClasses.statsTitle}`}>错误接口</p>
                <p className={`text-2xl font-semibold ${themeClasses.statsValue}`}>
                  {endpoints.filter(ep => ep.status === 'error').length}
                </p>
              </div>
            </div>
          </div>

          <div className={`rounded-lg border p-6 ${themeClasses.statsCard}`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className={`w-8 h-8 ${isDarkTheme ? 'text-yellow-500' : 'text-yellow-600'}`} />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${themeClasses.statsTitle}`}>平均响应时间</p>
                <p className={`text-2xl font-semibold ${themeClasses.statsValue}`}>
                  {Math.round(endpoints.reduce((sum, ep) => sum + ep.responseTime, 0) / endpoints.length)}ms
                </p>
              </div>
            </div>
          </div>

          <div className={`rounded-lg border p-6 ${themeClasses.statsCard}`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExternalLink className={`w-8 h-8 ${isDarkTheme ? 'text-blue-500' : 'text-blue-600'}`} />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${themeClasses.statsTitle}`}>总接口数</p>
                <p className={`text-2xl font-semibold ${themeClasses.statsValue}`}>{endpoints.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 接口分组概览 */}
        <div className={`rounded-lg border overflow-hidden mb-6 ${themeClasses.overviewContainer}`}>
          <div className={`px-6 py-4 border-b ${themeClasses.overviewHeader}`}>
            <h3 className={`text-lg font-medium ${themeClasses.overviewTitle}`}>接口分组概览</h3>
            <p className={`text-sm mt-1 ${themeClasses.overviewSubtitle}`}>按功能模块分组的API接口统计</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.filter(cat => cat !== 'all').map(category => {
                const categoryEndpoints = endpoints.filter(ep => ep.category === category);
                const activeCount = categoryEndpoints.filter(ep => ep.status === 'active').length;
                const errorCount = categoryEndpoints.filter(ep => ep.status === 'error').length;
                const avgResponseTime = categoryEndpoints.length > 0 
                  ? Math.round(categoryEndpoints.reduce((sum, ep) => sum + ep.responseTime, 0) / categoryEndpoints.length)
                  : 0;
                
                return (
                  <div key={category} className={`border rounded-lg p-4 transition-colors ${themeClasses.overviewCard}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className={`font-medium ${themeClasses.overviewCardTitle}`}>{category}</h4>
                      <span className={`text-sm ${themeClasses.overviewCardText}`}>{categoryEndpoints.length}个接口</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className={themeClasses.overviewCardText}>正常:</span>
                        <span className={`font-medium ${isDarkTheme ? 'text-green-400' : 'text-green-600'}`}>{activeCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className={themeClasses.overviewCardText}>错误:</span>
                        <span className={`font-medium ${isDarkTheme ? 'text-red-400' : 'text-red-600'}`}>{errorCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className={themeClasses.overviewCardText}>平均响应:</span>
                        <span className={`font-medium ${isDarkTheme ? 'text-blue-400' : 'text-blue-600'}`}>{avgResponseTime}ms</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 接口列表 */}
        <div className={`rounded-lg border overflow-hidden ${themeClasses.tableContainer}`}>
          <div className={`px-6 py-4 border-b ${themeClasses.tableHeader}`}>
            <h3 className={`text-lg font-medium ${themeClasses.tableTitle}`}>接口列表</h3>
            <p className={`text-sm mt-1 ${themeClasses.tableSubtitle}`}>点击接口行展开Postman风格的测试界面，或使用操作按钮进行快速测试</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className={`min-w-full divide-y ${isDarkTheme ? 'divide-gray-700' : 'divide-gray-200'}`}>
              <thead className={themeClasses.tableHead}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${themeClasses.tableHeadText}`}>
                    接口信息
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${themeClasses.tableHeadText}`}>
                    分类
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${themeClasses.tableHeadText}`}>
                    状态
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${themeClasses.tableHeadText}`}>
                    响应时间
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${themeClasses.tableHeadText}`}>
                    最后测试
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${themeClasses.tableHeadText}`}>
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className={themeClasses.tableBody}>
                {filteredEndpoints.map((endpoint) => (
                  <React.Fragment key={endpoint.id}>
                    <tr className={`cursor-pointer transition-colors ${themeClasses.tableRow}`} onClick={() => toggleEndpointExpansion(endpoint.id)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <button className={`mr-2 ${isDarkTheme ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                            {endpoint.isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                          <div className="flex-shrink-0">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMethodColor(endpoint.method)}`}>
                              {endpoint.method}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className={`text-sm font-medium ${themeClasses.tableCellText}`}>{endpoint.name}</div>
                            <div className={`text-sm font-mono ${themeClasses.tableCellSecondary}`}>{endpoint.path}</div>
                            <div className={`text-sm mt-1 ${themeClasses.tableCellTertiary}`}>{endpoint.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`text-sm ${themeClasses.tableCellText}`}>{endpoint.category}</div>
                        <div className={`text-sm ${themeClasses.tableCellTertiary}`}>v{endpoint.version}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(endpoint.status)}`}>
                          {endpoint.status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {endpoint.status === 'error' && <XCircle className="w-3 h-3 mr-1" />}
                          {endpoint.status === 'inactive' && <AlertCircle className="w-3 h-3 mr-1" />}
                          {endpoint.status === 'active' ? '正常' : endpoint.status === 'error' ? '错误' : '停用'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`text-sm ${themeClasses.tableCellText}`}>
                          {endpoint.responseTime > 0 ? `${endpoint.responseTime}ms` : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`text-sm ${themeClasses.tableCellTertiary}`}>{endpoint.lastTested}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              testEndpoint(endpoint);
                            }}
                            disabled={isTesting === endpoint.id}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            {isTesting === endpoint.id ? (
                              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <Play className="w-3 h-3 mr-1" />
                            )}
                            {isTesting === endpoint.id ? '测试中' : '测试'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(endpoint.path);
                            }}
                            className={`inline-flex items-center px-3 py-1.5 border text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${isDarkTheme ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            复制
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleEndpointExpansion(endpoint.id);
                            }}
                            className={`inline-flex items-center px-3 py-1.5 border text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${isDarkTheme ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}
                          >
                            {endpoint.isExpanded ? (
                              <ChevronDown className="w-3 h-3 mr-1" />
                            ) : (
                              <ChevronRight className="w-3 h-3 mr-1" />
                            )}
                            {endpoint.isExpanded ? '收起' : '展开'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* 展开的测试界面 */}
                    {endpoint.isExpanded && (
                      <tr>
                        <td colSpan={6} className={`px-6 py-4 ${themeClasses.expandedArea}`}>
                          <div className="border-l-4 border-blue-500 pl-4">
                            <h4 className={`text-lg font-medium mb-4 ${themeClasses.expandedTitle}`}>
                              {endpoint.name} - API测试
                            </h4>
                            <PostmanTester 
                              endpoint={endpoint.path}
                              method={endpoint.method}
                              onTestComplete={(result) => {
                                console.log(`${endpoint.name} 测试结果:`, result);
                                // 更新接口状态
                                if (result.status >= 200 && result.status < 300) {
                                  setEndpoints(prev => prev.map(ep => 
                                    ep.id === endpoint.id 
                                      ? { 
                                          ...ep, 
                                          lastTested: new Date().toLocaleString('zh-CN'), 
                                          status: 'active' as const,
                                          responseTime: result.responseTime
                                        }
                                      : ep
                                  ));
                                } else {
                                  setEndpoints(prev => prev.map(ep => 
                                    ep.id === endpoint.id 
                                      ? { 
                                          ...ep, 
                                          lastTested: new Date().toLocaleString('zh-CN'), 
                                          status: 'error' as const,
                                          responseTime: 0
                                        }
                                      : ep
                                  ));
                                }
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 通用API测试界面 */}
        <div className={`rounded-lg border overflow-hidden mt-6 ${themeClasses.tableContainer}`}>
          <div className={`px-6 py-4 border-b ${themeClasses.tableHeader}`}>
            <h3 className={`text-lg font-medium ${themeClasses.tableTitle}`}>通用API测试工具</h3>
            <p className={`text-sm mt-1 ${themeClasses.tableSubtitle}`}>类似Postman的接口测试界面，可以测试任意API接口</p>
          </div>
          
          <div className="p-6">
            <PostmanTester 
              endpoint="http://localhost:8000/api/feed"
              method="GET"
              onTestComplete={(result) => {
                console.log('通用API测试结果:', result);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
