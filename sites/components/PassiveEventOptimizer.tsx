"use client";

import { useEffect } from 'react';

/**
 * 全局被动事件监听器优化组件
 * 解决第三方库或浏览器默认行为导致的触摸事件性能警告
 */
export default function PassiveEventOptimizer() {
  useEffect(() => {
    // 只在客户端运行
    if (typeof window === 'undefined') return;

    // 存储原始的 addEventListener
    const originalAddEventListener = EventTarget.prototype.addEventListener;

    // 需要自动设为被动的事件类型
    const passiveEvents = [
      'touchstart',
      'touchmove',
      'touchend',
      'wheel',
      'mousewheel',
      'scroll'
    ];

    // 重写 addEventListener 以自动添加 passive: true
    EventTarget.prototype.addEventListener = function(
      type: string,
      listener: any,
      options?: boolean | AddEventListenerOptions
    ) {
      // 如果是需要被动处理的事件类型
      if (passiveEvents.includes(type)) {
        // 如果没有显式设置 options，或者 options 是 boolean
        if (typeof options === 'boolean' || !options) {
          options = { 
            passive: true,
            capture: typeof options === 'boolean' ? options : false
          };
        } 
        // 如果 options 是对象但没有设置 passive
        else if (typeof options === 'object' && options.passive === undefined) {
          options = { 
            ...options, 
            passive: true 
          };
        }
      }

      // 调用原始的 addEventListener
      return originalAddEventListener.call(this, type, listener, options);
    };

    // 清理函数：恢复原始 addEventListener
    return () => {
      EventTarget.prototype.addEventListener = originalAddEventListener;
    };
  }, []);

  // 这个组件不渲染任何内容
  return null;
}
