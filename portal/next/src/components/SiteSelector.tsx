'use client';

import { useState, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { getCurrentSite, getAvailableSites, getSiteDisplayName } from '@/lib/siteDetection';

export default function SiteSelector() {
  const [currentSite, setCurrentSite] = useState<string>('localhost');
  const [isOpen, setIsOpen] = useState(false);
  const [availableSites, setAvailableSites] = useState<Array<{id: string, name: string}>>([]);

  useEffect(() => {
    setCurrentSite(getCurrentSite());
    setAvailableSites(getAvailableSites());
  }, []);

  const handleSiteChange = (siteId: string) => {
    if (siteId === currentSite) {
      setIsOpen(false);
      return;
    }

    // 切换站点的方式
    const currentUrl = new URL(window.location.href);
    
    if (siteId === 'localhost') {
      // 切换到localhost - 清除site参数，使用域名
      currentUrl.searchParams.delete('site');
      currentUrl.hostname = 'localhost';
      currentUrl.port = '3000';
    } else {
      // 切换到其他站点 - 可以使用URL参数或域名
      currentUrl.searchParams.set('site', siteId);
    }
    
    window.location.href = currentUrl.toString();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Globe className="w-4 h-4 text-gray-500" />
        <span className="text-gray-700">{getSiteDisplayName(currentSite)}</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* 下拉菜单 */}
          <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                选择站点
              </div>
              {availableSites.map((site) => (
                <button
                  key={site.id}
                  onClick={() => handleSiteChange(site.id)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span>{site.name}</span>
                  </div>
                  {site.id === currentSite && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
            
            <div className="border-t border-gray-100 py-1">
              <div className="px-3 py-2 text-xs text-gray-500">
                当前站点：<span className="font-medium">{currentSite}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
