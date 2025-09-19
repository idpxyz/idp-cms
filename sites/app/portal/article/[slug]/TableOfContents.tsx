"use client";

import React, { useEffect, useState } from 'react';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
  className?: string;
}

export default function TableOfContents({ content, className = '' }: TableOfContentsProps) {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  // 解析文章内容生成目录
  useEffect(() => {
    const parseHeadings = () => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      
      const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const items: TocItem[] = [];
      
      headings.forEach((heading, index) => {
        const level = parseInt(heading.tagName.charAt(1));
        const text = heading.textContent?.trim() || '';
        
        if (text) {
          // 为标题生成ID（如果没有的话）
          let id = heading.id || `heading-${index}`;
          
          items.push({
            id,
            text,
            level
          });
          
          // 在实际DOM中为标题添加ID
          setTimeout(() => {
            const realHeading = document.querySelector(`[data-article-content] ${heading.tagName}:nth-of-type(${Array.from(tempDiv.querySelectorAll(heading.tagName)).indexOf(heading) + 1})`);
            if (realHeading && !realHeading.id) {
              realHeading.id = id;
            }
          }, 100);
        }
      });
      
      setTocItems(items);
    };

    if (content) {
      parseHeadings();
    }
  }, [content]);

  // 监听滚动，高亮当前阅读位置
  useEffect(() => {
    const handleScroll = () => {
      const headings = tocItems.map(item => document.getElementById(item.id)).filter(Boolean);
      
      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i];
        if (heading) {
          const rect = heading.getBoundingClientRect();
          if (rect.top <= 100) {
            setActiveId(heading.id);
            break;
          }
        }
      }
    };

    if (tocItems.length > 0) {
      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll(); // 初始调用
      
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [tocItems]);

  // 平滑滚动到指定标题
  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80; // 给顶部留点空间
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveId(id);
    }
  };

  if (tocItems.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="p-4">
        <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          文章目录
        </h3>
        
        <nav className="space-y-1">
          {tocItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToHeading(item.id)}
              className={`w-full text-left px-2 py-1 rounded text-sm transition-colors ${
                activeId === item.id
                  ? 'bg-red-50 text-red-700 font-medium'
                  : 'text-gray-600 hover:text-red-600 hover:bg-gray-50'
              }`}
              style={{ 
                paddingLeft: `${(item.level - 1) * 12 + 8}px`,
                fontSize: item.level === 1 ? '14px' : item.level === 2 ? '13px' : '12px'
              }}
            >
              <span className="block truncate">
                {item.text}
              </span>
            </button>
          ))}
        </nav>
        
        {/* 回到顶部按钮 */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-full mt-4 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-gray-50 rounded transition-colors border border-gray-200"
        >
          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          回到顶部
        </button>
      </div>
    </div>
  );
}
