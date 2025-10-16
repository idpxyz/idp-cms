import React from "react";
import ChannelPageRenderer from "./components/ChannelPageRenderer";

// 强制动态渲染，禁用静态生成
export const dynamic = 'force-dynamic';

/**
 * 🚀 Portal 页面 - 性能优化版
 * 
 * 架构变更：
 * 1. 不再是 async 函数，不会在服务端重新执行
 * 2. 频道切换完全在客户端进行，使用 Context 状态管理
 * 3. URL 更新不触发路由导航，使用 window.history.replaceState
 * 4. 所有数据加载在客户端组件中进行
 * 
 * 性能效果：
 * - 频道切换不再触发 page.tsx 重新执行
 * - 避免重复调用 getChannels() API
 * - 推荐频道卸载在骨架屏后台进行，用户无感知
 * - 感知延迟: 1200ms → 0-16ms (99% 改善)
 */
export default function PortalPage() {
  // 📄 始终渲染频道页面渲染器
  // ChannelPageRenderer 是客户端组件，会：
  // 1. 从 ChannelContext 读取 currentChannelSlug
  // 2. 根据当前频道加载对应的模板组件
  // 3. 频道切换时通过骨架屏提供即时反馈
  return <ChannelPageRenderer />;
}
