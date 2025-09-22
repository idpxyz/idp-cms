# 🚀 频道模板快速开始指南

## 🎯 5分钟创建专属频道模板

### 步骤1: 创建模板文件

```bash
# 进入模板目录
cd /opt/idp-cms/sites/app/portal/templates/channels

# 创建你的频道模板 (以体育频道为例)
touch SportsTemplate.tsx
```

### 步骤2: 复制模板代码

```typescript
// SportsTemplate.tsx
import React from 'react';
import PageContainer from "@/components/layout/PageContainer";
import Section from "@/components/layout/Section";
import NewsContent from "@/components/NewsContent";
import ChannelStrip from "@/components/ChannelStrip";

interface ChannelTemplateProps {
  channel: any;
  channels: any[];
  tags?: string;
}

/**
 * 🏃 体育频道专属模板
 */
const SportsTemplate: React.FC<ChannelTemplateProps> = ({ 
  channel, 
  channels, 
  tags 
}) => {
  return (
    <PageContainer>
      {/* 🎨 体育频道头部 - 你可以完全定制这里 */}
      <Section space="lg">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-8 border border-green-100">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl">🏃</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {channel.name}体育
              </h1>
              <p className="text-green-600 font-medium text-lg">
                挥洒汗水 · 超越极限 · 体育精神
              </p>
            </div>
          </div>
          
          <p className="text-gray-700 text-lg leading-relaxed">
            {channel.description || "关注体育赛事，感受运动魅力。从职业联赛到全民健身，我们为您带来最精彩的体育资讯。"}
          </p>
        </div>
      </Section>

      {/* 📰 体育新闻内容 */}
      <Section space="lg">
        <ChannelStrip
          channelId={channel.id}
          channelName={channel.name}
          channelSlug={channel.slug}
          showCategories={true}
          showViewMore={false}
          articleLimit={12}
        />
      </Section>

      {/* 智能推荐 */}
      <Section space="md">
        <NewsContent
          channels={channels}
          initialChannelId={channel.id}
          tags={tags}
        />
      </Section>
    </PageContainer>
  );
};

export default SportsTemplate;
```

### 步骤3: 注册模板

编辑 `/templates/channels/index.ts`:

```typescript
// 添加导入
import SportsTemplate from './SportsTemplate';

// 添加到映射表
export const CHANNEL_TEMPLATES = {
  'social': SocialTemplate,
  'culture': CultureTemplate,
  'tech': TechTemplate,
  'sports': SportsTemplate,  // 🆕 新增
  // ... 其他模板
};

// 添加到导出
export {
  // ... 其他导出
  SportsTemplate,
};
```

### 步骤4: 测试模板

访问: http://localhost:3001/portal?channel=sports

## 🎨 定制建议

### 颜色主题

```typescript
const colorThemes = {
  sports: 'from-green-50 to-emerald-50',     // 绿色 - 活力
  finance: 'from-yellow-50 to-amber-50',    // 黄色 - 财富
  entertainment: 'from-pink-50 to-rose-50', // 粉色 - 娱乐
  politics: 'from-red-50 to-orange-50',     // 红色 - 权威
  health: 'from-blue-50 to-cyan-50',        // 蓝色 - 医疗
};
```

### 图标选择

```typescript
const channelIcons = {
  sports: '🏃',      // 体育
  finance: '💰',     // 财经
  entertainment: '🎬', // 娱乐
  politics: '🏛️',    // 政治
  health: '🏥',      // 健康
  travel: '✈️',      // 旅游
  food: '🍽️',       // 美食
  education: '📚',   // 教育
};
```

## ✨ 完成！

你的专属频道模板就完成了！比复杂的JSON配置简单多了对吧？

**现在你可以：**
- 🎨 完全自定义UI设计
- 📊 添加专属功能模块  
- 🔧 使用任何React组件
- 📱 确保响应式设计
- ⚡ 享受TypeScript类型安全

**需要帮助？** 参考已有的模板文件作为例子！
