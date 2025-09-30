# 🎯 首页性能优化实施总结

> 基于 `HOMEPAGE_LOADING_ANALYSIS.md` 的分析，完成了P0和P1优先级的优化。

---

## ✅ 已完成优化

### P0-1: 修复ChannelNavigation布局偏移 🔴

**问题：** 
- 服务端渲染占位符（8个"加载中..."）与客户端真实频道按钮高度不一致
- 导致hydration后布局跳动，Hero上方出现空白

**解决方案：**
```typescript
// sites/app/portal/ChannelNavigation.tsx
if (!isClient) {
  if (channels.length > 0) {
    // ✅ 使用真实channels数据渲染占位符（disabled状态）
    return (
      <section>
        {channels.slice(0, 8).map((channel) => (
          <button disabled>{channel.name}</button>
        ))}
      </section>
    );
  }
  return null; // 无数据时不占据空间
}
```

**效果：**
- ✅ 消除布局跳动
- ✅ CLS预计从0.15-0.25降至<0.05
- ✅ Hero位置稳定，无上方空白

---

### P0-2: 消除Channels重复请求 🔴

**问题：**
- `portal/layout.tsx` 和 `portal/page.tsx` 都调用了 `getChannels()`
- 虽然有缓存，但代码重复，缓存策略不一致（2小时 vs 10分钟）

**解决方案：**
```typescript
// 新增 sites/app/portal/utils/channels.ts
export async function getChannels(): Promise<Channel[]> {
  // 统一的缓存策略：10分钟
  // 统一的错误处理
  // 统一的数据转换
}

// layout.tsx 和 page.tsx 都使用
import { getChannels } from "./utils/channels";
```

**效果：**
- ✅ 代码复用，单一职责
- ✅ 缓存策略统一（10分钟）
- ✅ 维护性提升
- ✅ TTFB预计减少50-200ms（消除混乱）

---

### P0-3: BreakingTicker使用固定高度 🔴

**问题：**
- 快讯为空时 `return null`，不占据空间
- 后续加载时突然出现，造成布局偏移

**解决方案：**
```typescript
// sites/app/portal/components/BreakingTicker.tsx
if (items.length === 0) {
  return (
    <div style={{ height: '40px' }}>  // 固定高度，而非minHeight
      <div className="opacity-0">占位符</div>
    </div>
  );
}
```

**效果：**
- ✅ 始终保留40px高度
- ✅ 无内容时不可见但占位
- ✅ 加载后无布局跳动
- ✅ CLS降低

---

### P1-1: 优化Hero切换时机 🟡

**问题：**
- 原策略：等待 `window.load` + `requestIdleCallback` + 300ms
- 切换过晚，用户看静态首图时间过长

**解决方案：**
```typescript
// sites/app/layout.tsx
document.addEventListener('DOMContentLoaded', function() {
  var heroImg = document.querySelector('.hero-ssr-preload img');
  
  if (heroImg) {
    // ✅ 检测图片是否已加载
    if (heroImg.complete && heroImg.naturalHeight > 0) {
      setTimeout(switchToCarousel, 150); // 缩短到150ms
    } else {
      heroImg.addEventListener('load', function() {
        setTimeout(switchToCarousel, 150);
      });
    }
  }
  
  // 备用：最多等待2秒
  setTimeout(switchToCarousel, 2000);
});
```

**效果：**
- ✅ 更早触发切换（DOMContentLoaded vs load）
- ✅ 智能检测图片加载完成
- ✅ 延迟缩短（300ms → 150ms）
- ✅ 用户体验更流畅

---

## 📊 预期性能提升

| 指标 | 优化前 | 优化后（预期） | 改进 |
|------|--------|---------------|------|
| **TTFB** | 800-1800ms | 600-1400ms | ↓25% |
| **FCP** | 1000-2200ms | 800-1800ms | ↓20% |
| **LCP** | 1400-2800ms | **1200-1800ms** | ↓稳定 |
| **TTI** | 1500-3500ms | 1200-2800ms | ↓20% |
| **CLS** | 0.15-0.25 | **<0.05** | ↓80% |

---

## 🛠️ 修改文件列表

### 新增文件
- ✅ `/opt/idp-cms/sites/app/portal/utils/channels.ts` - 统一channels获取逻辑

### 修改文件
- ✅ `/opt/idp-cms/sites/app/portal/ChannelNavigation.tsx` - 使用真实数据渲染占位符
- ✅ `/opt/idp-cms/sites/app/portal/layout.tsx` - 使用共享getChannels
- ✅ `/opt/idp-cms/sites/app/portal/page.tsx` - 使用共享getChannels，删除重复函数
- ✅ `/opt/idp-cms/sites/app/portal/components/BreakingTicker.tsx` - 固定高度占位符
- ✅ `/opt/idp-cms/sites/app/layout.tsx` - 智能Hero切换时机

---

## 🔬 测试建议

### 1. 布局偏移测试
```bash
# 打开首页，观察：
1. Hero区域上方是否有空白
2. 频道导航是否平滑出现（无跳动）
3. 快讯区域是否稳定（有无时占位）
```

### 2. 性能测试
```bash
# 使用Lighthouse测试
1. 清除缓存
2. 刷新页面
3. 检查LCP值（应<2.5秒，理想<1.8秒）
4. 检查CLS值（应<0.1，理想<0.05）
```

### 3. Hero切换测试
```bash
# 观察Hero图片加载和切换：
1. SSR首图是否立即显示
2. 切换到轮播是否流畅（无明显延迟）
3. LCP是否稳定在SSR首图
```

---

## 🚀 后续优化方向（P2）

### 1. Streaming SSR
使用React 18 Suspense实现流式渲染，让各部分独立加载：
```typescript
<Suspense fallback={<HeroSkeleton />}>
  <HeroSection />
</Suspense>
```

### 2. 代码分割
懒加载非关键组件：
```typescript
const MegaMenu = dynamic(() => import('./MegaMenu'), {
  loading: () => <div>加载中...</div>
});
```

### 3. 客户端/服务端边界优化
将更多静态内容提取为Server Components，减少JavaScript bundle大小。

---

## 📝 总结

本次优化聚焦于**布局稳定性**和**感知性能**：

1. **布局稳定性** ✅
   - 修复了3个导致CLS的问题
   - 确保所有动态内容都有合适的占位符
   - 使用固定高度而非minHeight

2. **感知性能** ✅
   - Hero切换更流畅、更早
   - 消除了代码重复和请求混乱
   - 为后续性能优化打下基础

3. **代码质量** ✅
   - 提取共享逻辑到utils
   - 统一缓存策略
   - 改进可维护性

**预期用户体验提升：**
- 页面加载更稳定，无跳动
- Hero图片切换更自然
- 整体感觉更快、更流畅

---

## 🔗 相关文档

- [首页加载流程分析](/opt/idp-cms/docs/HOMEPAGE_LOADING_ANALYSIS.md)
- [WebP优化指南](/opt/idp-cms/docs/WEBP_OPTIMIZATION_GUIDE.md)
