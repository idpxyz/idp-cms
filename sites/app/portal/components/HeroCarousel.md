# HeroCarousel 组件（增强版）

一个功能完整的新闻轮播组件，用于门户网站首页的 HERO 区域展示。基于专业设计理念，支持多种高度模式和场景化适配。

## 功能特性

### 🎯 核心功能
- ✅ 支持 3-5 条轮播内容
- ✅ 大图/视频封面展示
- ✅ 突发新闻红角标
- ✅ 直播内容标识
- ✅ 自动播放控制（可配置间隔）
- ✅ 手动导航控制（箭头、指示点）
- ✅ 鼠标悬停暂停
- ✅ 键盘操作支持（方向键、空格键）

### 🚀 增强功能（新增）
- ✅ **三种高度模式**：Compact (32-40vh) / Standard (48-60vh) / Takeover (85-95svh)
- ✅ **智能自适应**：根据内容类型自动选择最佳高度模式
- ✅ **右侧栏布局**：支持栅格系统和侧边栏集成
- ✅ **媒体类型适配**：图片/视频/数据头条的专门处理
- ✅ **事件模式触发**：直播、突发事件自动切换到 Takeover 模式
- ✅ **性能优化**：LCP 保护、首屏内容可见性优化

### 📱 响应式设计
- ✅ 响应式高度适配：
  - ≥1280px: 60-75vh
  - 768-1279px: 50-60vh  
  - ≤767px: 45-55vh
- ✅ 移动端触摸滑动支持
- ✅ 图片懒加载优化
- ✅ 首张图片优先加载（fetchpriority=high）

### ♿ 无障碍访问
- ✅ 屏幕阅读器支持
- ✅ ARIA 标签完整
- ✅ 键盘导航友好
- ✅ 焦点管理优化

## 使用方法

### 基本使用

```tsx
import HeroCarousel from './components/HeroCarousel';
import { getHeroItems } from './components/HeroCarousel.utils';

export default async function HomePage() {
  const heroItems = await getHeroItems(5);
  
  return (
    <HeroCarousel 
      items={heroItems}
      autoPlay={true}
      autoPlayInterval={6000}
      showDots={true}
      showArrows={true}
    />
  );
}
```

### 数据结构

```tsx
interface HeroItem {
  id: string;
  title: string;
  excerpt?: string;
  image_url?: string;
  video_url?: string;
  publish_time?: string;
  author?: string;
  source?: string;
  channel?: {
    id: string;
    name: string;
    slug: string;
  };
  topic?: {
    id: string;
    name: string;
    slug: string;
  };
  slug: string;
  is_breaking?: boolean; // 突发新闻标识
  is_live?: boolean; // 直播标识
  tags?: string[];
}
```

### 配置选项

```tsx
interface HeroCarouselProps {
  items: HeroItem[];              // 轮播项目数据
  autoPlay?: boolean;             // 是否自动播放，默认 true
  autoPlayInterval?: number;      // 自动播放间隔（毫秒），默认 6000
  showDots?: boolean;             // 是否显示指示点，默认 true
  showArrows?: boolean;           // 是否显示导航箭头，默认 true
  className?: string;             // 自定义样式类
  onItemClick?: (item: HeroItem) => void; // 项目点击回调
}
```

## 数据获取

### 智能推荐数据

```tsx
import { getHeroItems } from './HeroCarousel.utils';

// 获取 5 条轮播数据
const heroItems = await getHeroItems(5);
```

### 模拟数据

```tsx
import { generateMockHeroItems } from './HeroCarousel.utils';

// 生成模拟数据用于开发和测试
const mockItems = generateMockHeroItems();
```

## 样式定制

组件使用 Tailwind CSS 构建，支持通过 `className` 属性进行样式定制：

```tsx
<HeroCarousel 
  items={items}
  className="rounded-lg overflow-hidden shadow-xl"
/>
```

## 键盘操作

- `←` / `→` : 上一张/下一张
- `空格键` : 暂停/播放自动轮播
- `Tab` : 焦点导航

## 性能优化

1. **图片懒加载**: 非首张图片采用懒加载
2. **优先加载**: 首张图片设置 `fetchpriority="high"`
3. **内存管理**: 自动清理定时器和事件监听器
4. **防抖处理**: 用户操作防抖，避免频繁触发

## 浏览器兼容性

- ✅ Chrome 88+
- ✅ Firefox 85+
- ✅ Safari 14+
- ✅ Edge 88+

## 演示页面

访问 `/portal/demo/hero-carousel` 查看完整的功能演示和配置选项。

## 更新日志

### v1.0.0 (2025-09-17)
- ✅ 初始版本发布
- ✅ 完整功能实现
- ✅ 响应式设计
- ✅ 无障碍访问支持
- ✅ 性能优化
- ✅ 文档完善
