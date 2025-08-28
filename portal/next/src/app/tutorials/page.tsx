'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  BookOpen, 
  Play, 
  Clock, 
  User,
  Star,
  ExternalLink,
  Grid3X3,
  List,
  Code,
  Brain,
  Palette,
  Video,
  MessageSquare,
  BarChart3,
  Globe
} from 'lucide-react';
import Navigation from '@/components/Navigation';

export default function TutorialsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [difficulty, setDifficulty] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  
  // Mock tutorials data
  const mockTutorials = [
    {
      id: '1',
      title: 'ChatGPT入门指南：从零开始使用AI助手',
      description: '全面介绍ChatGPT的基本功能和使用技巧，包括对话技巧、提示词编写和常见应用场景',
      category: 'chatbot',
      difficulty: 'beginner',
      duration: '2小时',
      author: 'AI专家',
      rating: 4.8,
      students: 15000,
      tags: ['ChatGPT', '入门', 'AI助手', '提示词'],
      isFree: true,
      isHot: true,
      imageUrl: '/images/tutorial1.jpg',
      url: '#'
    },
    {
      id: '2',
      title: 'Midjourney艺术创作完全教程',
      description: '深入学习Midjourney的图像生成技巧，掌握艺术风格控制和创意表达方法',
      category: 'image-generation',
      difficulty: 'intermediate',
      duration: '4小时',
      author: '数字艺术家',
      rating: 4.9,
      students: 8500,
      tags: ['Midjourney', '艺术创作', '图像生成', '创意设计'],
      isFree: false,
      isHot: true,
      imageUrl: '/images/tutorial2.jpg',
      url: '#'
    },
    {
      id: '3',
      title: 'AI编程助手实战：提升开发效率',
      description: '学习如何有效使用GitHub Copilot、Claude等AI编程工具，提高代码质量和开发速度',
      category: 'code-generation',
      difficulty: 'intermediate',
      duration: '3小时',
      author: '资深开发者',
      rating: 4.7,
      students: 12000,
      tags: ['AI编程', 'GitHub Copilot', '开发效率', '代码质量'],
      isFree: true,
      isHot: false,
      imageUrl: '/images/tutorial3.jpg',
      url: '#'
    },
    {
      id: '4',
      title: '大语言模型原理与应用',
      description: '深入理解大语言模型的工作原理，包括Transformer架构、训练方法和实际应用',
      category: 'ai-fundamentals',
      difficulty: 'advanced',
      duration: '6小时',
      author: 'AI研究员',
      rating: 4.6,
      students: 6800,
      tags: ['大语言模型', 'Transformer', 'AI原理', '深度学习'],
      isFree: false,
      isHot: false,
      imageUrl: '/images/tutorial4.jpg',
      url: '#'
    },
    {
      id: '5',
      title: 'AI视频制作从入门到精通',
      description: '学习使用Runway ML、Synthesia等AI视频工具，创建专业级视频内容',
      category: 'video-generation',
      difficulty: 'intermediate',
      duration: '5小时',
      author: '视频制作专家',
      rating: 4.5,
      students: 9500,
      tags: ['AI视频', 'Runway ML', '视频制作', '创意内容'],
      isFree: false,
      isHot: true,
      imageUrl: '/images/tutorial5.jpg',
      url: '#'
    },
    {
      id: '6',
      title: 'AI数据分析与可视化',
      description: '掌握AI驱动的数据分析方法，学习使用AI工具进行数据洞察和可视化展示',
      category: 'data-analysis',
      difficulty: 'intermediate',
      duration: '4小时',
      author: '数据科学家',
      rating: 4.4,
      students: 7200,
      tags: ['数据分析', 'AI工具', '数据可视化', '商业智能'],
      isFree: true,
      isHot: false,
      imageUrl: '/images/tutorial6.jpg',
      url: '#'
    },
    {
      id: '7',
      title: 'AI安全与伦理实践指南',
      description: '了解AI技术的安全风险和伦理问题，学习负责任地开发和使用AI系统',
      category: 'ai-ethics',
      difficulty: 'intermediate',
      duration: '3小时',
      author: 'AI伦理专家',
      rating: 4.3,
      students: 5800,
      tags: ['AI安全', 'AI伦理', '负责任AI', '风险管理'],
      isFree: true,
      isHot: false,
      imageUrl: '/images/tutorial7.jpg',
      url: '#'
    },
    {
      id: '8',
      title: 'AI创业与商业化策略',
      description: '学习如何将AI技术转化为商业价值，包括产品定位、市场分析和商业模式设计',
      category: 'ai-business',
      difficulty: 'advanced',
      duration: '4小时',
      author: 'AI创业者',
      rating: 4.2,
      students: 4200,
      tags: ['AI创业', '商业化', '商业模式', '市场分析'],
      isFree: false,
      isHot: false,
      imageUrl: '/images/tutorial8.jpg',
      url: '#'
    }
  ];

  // Tutorial categories
  const tutorialCategories = [
    { id: 'all', name: '全部教程', icon: <BookOpen className="w-5 h-5" />, count: mockTutorials.length, color: 'bg-gray-500' },
    { id: 'chatbot', name: '聊天机器人', icon: <MessageSquare className="w-5 h-5" />, count: mockTutorials.filter(t => t.category === 'chatbot').length, color: 'bg-blue-500' },
    { id: 'image-generation', name: '图像生成', icon: <Palette className="w-5 h-5" />, count: mockTutorials.filter(t => t.category === 'image-generation').length, color: 'bg-purple-500' },
    { id: 'video-generation', name: '视频生成', icon: <Video className="w-5 h-5" />, count: mockTutorials.filter(t => t.category === 'video-generation').length, color: 'bg-red-500' },
    { id: 'code-generation', name: '代码生成', icon: <Code className="w-5 h-5" />, count: mockTutorials.filter(t => t.category === 'code-generation').length, color: 'bg-green-500' },
    { id: 'ai-fundamentals', name: 'AI基础', icon: <Brain className="w-5 h-5" />, count: mockTutorials.filter(t => t.category === 'ai-fundamentals').length, color: 'bg-indigo-500' },
    { id: 'data-analysis', name: '数据分析', icon: <BarChart3 className="w-5 h-5" />, count: mockTutorials.filter(t => t.category === 'data-analysis').length, color: 'bg-yellow-500' },
    { id: 'ai-ethics', name: 'AI伦理', icon: <Globe className="w-5 h-5" />, count: mockTutorials.filter(t => t.category === 'ai-ethics').length, color: 'bg-pink-500' },
    { id: 'ai-business', name: 'AI商业', icon: <BookOpen className="w-5 h-5" />, count: mockTutorials.filter(t => t.category === 'ai-business').length, color: 'bg-orange-500' }
  ];

  // Filter and sort tutorials
  const filteredTutorials = mockTutorials
    .filter(tutorial => {
      const matchesCategory = selectedCategory === 'all' || tutorial.category === selectedCategory;
      const matchesDifficulty = difficulty === 'all' || tutorial.difficulty === difficulty;
      const matchesSearch = searchQuery === '' || 
        tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tutorial.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tutorial.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesDifficulty && matchesSearch;
    })
    .sort((a, b) => b.rating - a.rating);

  const handleTutorialClick = (tutorial: any) => {
    // Navigate to tutorial detail or external link
    if (tutorial.url) {
      window.open(tutorial.url, '_blank');
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyText = (diff: string) => {
    switch (diff) {
      case 'beginner': return '初级';
      case 'intermediate': return '中级';
      case 'advanced': return '高级';
      default: return '未知';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Header */}
      <section className="pt-16 pb-8 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">技术教程</h1>
              <p className="text-gray-600">学习AI技术，掌握前沿技能，提升专业能力</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="搜索教程、技能、工具..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-12 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'all' | 'beginner' | 'intermediate' | 'advanced')}
                className="px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部难度</option>
                <option value="beginner">初级</option>
                <option value="intermediate">中级</option>
                <option value="advanced">高级</option>
              </select>
              <button className="p-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Categories */}
      <section className="py-6 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {tutorialCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className={`p-3 rounded-lg text-center transition-all ${
                  selectedCategory === category.id
                    ? `${category.color} text-white shadow-md`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className={`w-8 h-8 ${category.color} rounded-lg flex items-center justify-center text-white`}>
                    {category.icon}
                  </div>
                  <div className="text-xs font-medium">{category.name}</div>
                  <div className="text-xs opacity-75">({category.count})</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
      
      {/* Tutorials List */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {filteredTutorials.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Search className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">未找到相关教程</h3>
              <p className="text-gray-600">尝试调整搜索条件或选择其他分类</p>
            </div>
          ) : (
            <div className={`grid gap-6 ${
              viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'lg:grid-cols-1'
            }`}>
              {filteredTutorials.map((tutorial, index) => (
                <motion.div
                  key={tutorial.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all cursor-pointer ${
                    viewMode === 'list' ? 'flex' : ''
                  }`}
                  onClick={() => handleTutorialClick(tutorial)}
                >
                  {viewMode === 'list' ? (
                    // List view
                    <>
                      <div className="flex-1 p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            {tutorial.isHot && (
                              <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                                热门
                              </span>
                            )}
                            <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(tutorial.difficulty)}`}>
                              {getDifficultyText(tutorial.difficulty)}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              tutorial.isFree ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {tutorial.isFree ? '免费' : '付费'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span>{tutorial.rating}</span>
                          </div>
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-900 mb-3 hover:text-blue-600 transition-colors">
                          {tutorial.title}
                        </h3>
                        
                        <p className="text-gray-600 mb-4 leading-relaxed">
                          {tutorial.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-2">
                            {tutorial.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                {tag}
                              </span>
                            ))}
                          </div>
                          <button className="text-blue-600 hover:text-blue-700 font-medium">
                            开始学习 <ExternalLink className="w-4 h-4 inline ml-1" />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    // Grid view
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {tutorial.isHot && (
                            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                              热门
                            </span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(tutorial.difficulty)}`}>
                            {getDifficultyText(tutorial.difficulty)}
                          </span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          tutorial.isFree ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {tutorial.isFree ? '免费' : '付费'}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-gray-900 mb-3 hover:text-blue-600 transition-colors line-clamp-2">
                        {tutorial.title}
                      </h3>
                      
                      <p className="text-gray-600 mb-4 leading-relaxed line-clamp-3">
                        {tutorial.description}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {tutorial.duration}
                        </span>
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {tutorial.students.toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                        <span className="flex items-center">
                          <Star className="w-3 h-3 text-yellow-500 fill-current mr-1" />
                          {tutorial.rating}
                        </span>
                        <span className="text-xs text-gray-400">
                          {tutorial.author}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        {tutorial.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      <button className="w-full text-center text-blue-600 hover:text-blue-700 font-medium py-2 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                        开始学习 <Play className="w-4 h-4 inline ml-1" />
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
          
          {/* Load More */}
          {filteredTutorials.length > 0 && (
            <div className="text-center mt-12">
              <button className="btn-secondary px-8 py-3">
                加载更多教程
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
