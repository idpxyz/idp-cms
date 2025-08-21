'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Clock, 
  Eye, 
  Tag, 
  ExternalLink, 
  Share2, 
  Bookmark, 
  Heart,
  MessageCircle,
  Twitter,
  Facebook,
  Linkedin,
  Link as LinkIcon,
  TrendingUp,
  Star
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import { AINews } from '@/types/ai';

export default function NewsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [news, setNews] = useState<AINews | null>(null);
  const [relatedNews, setRelatedNews] = useState<AINews[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  
  // Mock news data (in real app, this would come from API)
  const mockNews: AINews[] = [
    {
      id: 1,
      title: 'OpenAI发布GPT-5，性能大幅提升，推理能力显著增强',
      introduction: 'OpenAI今日正式发布GPT-5，新版本在推理能力、多模态理解和代码生成方面都有显著改进。相比GPT-4，新版本在复杂推理任务上的准确率提升了23%，在代码生成方面的效率提高了35%。',
      body: `OpenAI今日正式发布GPT-5，新版本在推理能力、多模态理解和代码生成方面都有显著改进。相比GPT-4，新版本在复杂推理任务上的准确率提升了23%，在代码生成方面的效率提高了35%。

## 技术架构升级

GPT-5采用了全新的架构设计，引入了更先进的注意力机制和训练方法。新版本在以下几个方面都有重要突破：

### 1. 推理能力提升
- 复杂逻辑推理准确率提升23%
- 数学问题解决能力显著增强
- 多步骤问题分析更加准确

### 2. 多模态理解
- 图像理解能力大幅提升
- 音频处理更加精准
- 跨模态信息融合更加自然

### 3. 代码生成优化
- 代码质量提升35%
- 支持更多编程语言
- 代码注释和文档生成更加智能

## 安全性和可靠性

OpenAI在GPT-5的开发过程中特别注重安全性和可靠性：

- 引入了更严格的训练数据筛选机制
- 增强了有害内容识别和过滤能力
- 改进了偏见检测和纠正算法
- 提升了事实准确性验证

## 性能测试结果

在多个标准测试中，GPT-5都展现出了超越前代的能力：

| 测试项目 | GPT-4 | GPT-5 | 提升幅度 |
|---------|-------|-------|----------|
| 数学推理 | 78.2% | 96.1% | +23% |
| 代码生成 | 76.2% | 102.7% | +35% |
| 逻辑分析 | 82.1% | 94.8% | +15% |
| 创意写作 | 85.3% | 92.7% | +9% |

## 商业应用前景

GPT-5的发布为多个行业带来了新的可能性：

### 企业应用
- 更智能的客户服务
- 高效的文档处理
- 精准的数据分析

### 教育领域
- 个性化学习助手
- 智能题库生成
- 学习进度跟踪

### 研发创新
- 加速科研进程
- 创新方案生成
- 技术文档编写

## 未来发展规划

OpenAI CEO Sam Altman表示："GPT-5代表了我们在AI安全性和能力方面的重大进步。我们相信这个版本将为用户提供更可靠、更强大的AI助手体验。"

新版本已经开始向部分用户开放测试，预计将在下个月全面发布。OpenAI计划在未来几个月内推出更多针对特定行业的定制版本。

## 技术细节

GPT-5采用了以下关键技术：

- **改进的Transformer架构**：更高效的注意力机制
- **多任务学习**：同时处理多种类型的任务
- **强化学习优化**：基于人类反馈的持续改进
- **知识蒸馏**：从更大模型中提取关键知识

这些技术的结合使得GPT-5在保持高效推理的同时，具备了更强的泛化能力和适应性。`,
      source: 'TechCrunch',
      source_url: 'https://techcrunch.com',
      category: 'technology',
      tags: ['OpenAI', 'GPT-5', '技术突破', 'AI模型', '大语言模型', '自然语言处理'],
      last_published_at: '2024-01-15T10:30:00',
      is_hot: true,
      is_top: true,
      read_count: 15000,
      image_url: '/images/news1.jpg',
      url: '/news/1',
      author_name: 'AI编辑部',
      has_video: false
    },
    {
      id: 2,
      title: 'Google推出Gemini Ultra 2.0，在代码生成和数学推理方面表现优异',
      introduction: 'Google今日发布Gemini Ultra 2.0，新版本在代码生成、数学推理和创意写作方面表现优异，特别是在多语言代码生成方面有显著提升。',
      body: 'Google今日发布Gemini Ultra 2.0，新版本在代码生成、数学推理和创意写作方面表现优异，特别是在多语言代码生成方面有显著提升。\n\n新版本采用了Google最新的训练方法，在多个基准测试中都取得了优异成绩。在HumanEval代码生成测试中，Gemini Ultra 2.0的通过率达到了78.5%，超过了GPT-4的76.2%。\n\nGoogle AI负责人Jeff Dean表示："Gemini Ultra 2.0代表了我们在多模态AI领域的最新成果。新版本不仅在文本和代码方面表现出色，在图像理解和生成方面也有重要突破。"\n\n该版本已经开始向Google Cloud用户开放，预计将在本月底向所有用户开放。',
      source: 'The Verge',
      source_url: 'https://theverge.com',
      category: 'product',
      tags: ['Google', 'Gemini', '产品发布', '代码生成'],
      last_published_at: '2024-01-14T14:15:00',
      is_hot: true,
      is_top: false,
      read_count: 12000,
      image_url: '/images/news2.jpg',
      url: '/news/2',
      author_name: 'AI编辑部',
      has_video: false
    },
    {
      id: 3,
      title: 'AI投资热潮持续，2024年融资超500亿美元，生成式AI领域投资创历史新高',
      introduction: '2024年生成式AI领域投资持续升温，全年融资总额超过500亿美元，创下历史新高。投资者对AI技术的信心不断增强。',
      body: '2024年生成式AI领域投资持续升温，全年融资总额超过500亿美元，创下历史新高。投资者对AI技术的信心不断增强。\n\n根据CB Insights的最新报告，生成式AI初创公司在2024年获得了创纪录的投资，其中OpenAI、Anthropic和Cohere等头部公司占据了大部分资金。\n\n投资主要集中在以下几个领域：\n- 大语言模型开发\n- AI应用工具\n- 企业AI解决方案\n- AI基础设施\n\n风险投资家表示，AI技术的快速发展和商业化前景是吸引投资的主要原因。预计2025年AI投资将继续保持增长势头。',
      source: 'Bloomberg',
      source_url: 'https://bloomberg.com',
      category: 'investment',
      tags: ['投资', '融资', '生成式AI', '风险投资'],
      last_published_at: '2024-01-13T09:45:00',
      is_hot: true,
      is_top: false,
      read_count: 9800,
      image_url: '/images/news3.jpg',
      url: '/news/3',
      author_name: 'AI编辑部',
      has_video: false
    }
  ];
  
  useEffect(() => {
    const newsId = parseInt(params.id as string);
    const foundNews = mockNews.find(n => n.id === newsId);
    if (foundNews) {
      setNews(foundNews);
      // Find related news (same category, different news)
      const related = mockNews.filter(n => n.id !== newsId && n.category === foundNews.category);
      setRelatedNews(related);
    }
  }, [params.id]);
  
  if (!news) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-16 text-center py-12">
          <div className="text-gray-400 mb-4">
            <Clock className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">加载中...</h3>
        </div>
      </div>
    );
  }
  
  const handleBack = () => {
    router.back();
  };
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: news.title,
        text: news.introduction,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('链接已复制到剪贴板');
    }
  };
  
  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
  };
  
  const handleLike = () => {
    setIsLiked(!isLiked);
  };
  
  const formatContent = (content: string) => {
    return content.split('\n').map((line, index) => {
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-2xl font-bold text-gray-900 mt-8 mb-4">{line.substring(3)}</h2>;
      } else if (line.startsWith('### ')) {
        return <h3 key={index} className="text-xl font-semibold text-gray-900 mt-6 mb-3">{line.substring(4)}</h3>;
      } else if (line.startsWith('- ')) {
        return <li key={index} className="ml-6 text-gray-700 mb-2">{line.substring(2)}</li>;
      } else if (line.startsWith('| ')) {
        return <tr key={index} className="border-b border-gray-200">
          {line.split('|').slice(1, -1).map((cell, cellIndex) => (
            <td key={cellIndex} className="px-4 py-2 text-gray-700">{cell.trim()}</td>
          ))}
        </tr>;
      } else if (line.trim() === '') {
        return <br key={index} />;
      } else {
        return <p key={index} className="text-gray-700 leading-relaxed mb-4">{line}</p>;
      }
    });
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Back Button */}
      <section className="pt-16 pb-4 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回资讯列表</span>
          </button>
        </div>
      </section>
      
      {/* News Content */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-4 gap-8">
            
            {/* Main Content */}
            <div className="lg:col-span-3">
              <article className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                
                {/* Header */}
                <div className="p-8 border-b border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {news.is_top && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full font-medium">
                          置顶
                        </span>
                      )}
                      {news.is_hot && (
                        <span className="bg-red-100 text-red-800 text-xs px-3 py-1 rounded-full font-medium">
                          热门
                        </span>
                      )}
                      <span className="text-sm text-gray-500">{news.source}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleBookmark}
                        className={`p-2 rounded-lg transition-colors ${
                          isBookmarked ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        <Bookmark className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleLike}
                        className={`p-2 rounded-lg transition-colors ${
                          isLiked ? 'text-red-600 bg-red-50' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                      >
                        <Heart className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleShare}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
                    {news.title}
                  </h1>
                  
                  <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                    {news.introduction}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        {news.last_published_at ? new Date(news.last_published_at).toLocaleString() : '未知时间'}
                      </span>
                      <span className="flex items-center">
                        <Eye className="w-4 h-4 mr-2" />
                        {news.read_count.toLocaleString()} 次阅读
                      </span>
                    </div>
                    <a
                      href={news.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      查看原文
                    </a>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-8">
                  <div className="prose prose-lg max-w-none">
                    {news.body && formatContent(news.body)}
                  </div>
                </div>
                
                {/* Tags */}
                <div className="px-8 pb-8">
                  <div className="flex items-center space-x-2 mb-4">
                    <Tag className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">标签：</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {news.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Social Share */}
                <div className="px-8 pb-8 border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">分享到：</span>
                    <div className="flex items-center space-x-3">
                      <button className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                        <Twitter className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        <Facebook className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors">
                        <Linkedin className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleShare}
                        className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        <LinkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            </div>
            
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="space-y-6">
                
                {/* Related News */}
                {relatedNews.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">相关资讯</h3>
                    <div className="space-y-4">
                      {relatedNews.map((related) => (
                        <div
                          key={related.id}
                          className="p-3 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors cursor-pointer"
                          onClick={() => router.push(`/news/${related.id}`)}
                        >
                          <h4 className="font-medium text-gray-900 text-sm mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
                            {related.title}
                          </h4>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{related.source}</span>
                            <span>{related.last_published_at ? new Date(related.last_published_at).toLocaleDateString() : '未知时间'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Popular Tags */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">热门标签</h3>
                  <div className="flex flex-wrap gap-2">
                    {['AI技术', '机器学习', '深度学习', '自然语言处理', '计算机视觉', 'AI应用', 'AI工具', 'AI研究'].map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Subscribe */}
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-6 text-white">
                  <h3 className="text-lg font-semibold mb-2">订阅AI资讯</h3>
                  <p className="text-blue-100 text-sm mb-4">第一时间获取最新AI动态和工具更新</p>
                  <button className="w-full bg-white text-blue-600 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                    立即订阅
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
