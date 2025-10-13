'use client';

import { useEffect } from 'react';

/**
 * 客户端组件 - 处理图片加载完成后移除占位符
 * 
 * 避免hydration错误的关键：
 * - 不修改服务端渲染的HTML结构
 * - 只在客户端通过事件监听器添加属性
 */
export default function ImageLoadHandler() {
  useEffect(() => {
    // 等待DOM完全加载
    const handleImageLoad = () => {
      const images = document.querySelectorAll('.lazy-image-placeholder');
      
      images.forEach((img) => {
        if (img instanceof HTMLImageElement) {
          // 如果图片已经加载完成
          if (img.complete && img.naturalHeight > 0) {
            img.setAttribute('data-loaded', 'true');
          } else {
            // 监听图片加载完成事件
            img.addEventListener('load', function onLoad() {
              img.setAttribute('data-loaded', 'true');
              img.removeEventListener('load', onLoad);
            });
            
            // 监听加载失败（也移除占位符，避免一直显示动画）
            img.addEventListener('error', function onError() {
              img.setAttribute('data-loaded', 'true');
              img.removeEventListener('error', onError);
            });
          }
        }
      });
    };

    // 立即执行一次
    handleImageLoad();
    
    // 当新内容加载时（如懒加载的图片）
    const observer = new MutationObserver(handleImageLoad);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return null; // 不渲染任何内容
}

