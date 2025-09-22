# 📁 基于目录的频道模板系统

## 🎯 设计理念

**告别复杂的JSON配置，拥抱简洁的文件目录！**

### 🔄 新 vs 旧

| 特性 | 旧系统 (复杂JSON配置) | 新系统 (目录模板) |
|------|----------------------|-------------------|
| **配置方式** | ❌ 复杂JSON配置 | ✅ 独立模板文件 |
| **维护难度** | ❌ 配置容易出错 | ✅ 代码级别控制 |
| **开发体验** | ❌ 需要来回切换 | ✅ 直接编辑模板 |
| **版本控制** | ❌ JSON难以跟踪 | ✅ Git友好 |
| **类型安全** | ❌ 运行时错误 | ✅ TypeScript检查 |
| **代码复用** | ❌ 难以复用组件 | ✅ React组件化 |

## 📂 目录结构

```
sites/app/portal/templates/channels/
├── index.ts                  # 🗂️ 模板导出和映射
├── DefaultTemplate.tsx       # 📄 默认模板
├── SocialTemplate.tsx        # 🏘️ 社会频道模板
├── CultureTemplate.tsx       # 🎭 文化频道模板
├── TechTemplate.tsx          # 💻 科技频道模板
├── SportsTemplate.tsx        # 🏃 体育频道模板 (待添加)
├── EntertainmentTemplate.tsx # 🎬 娱乐频道模板 (待添加)
└── FinanceTemplate.tsx       # 💰 财经频道模板 (待添加)
```

## 🎨 如何使用

### 1. 自动匹配规则

系统会根据频道的 `slug` 自动选择对应的模板：

- `social` → `SocialTemplate.tsx`
- `culture` → `CultureTemplate.tsx`
- `tech` → `TechTemplate.tsx`
- 未匹配到 → `DefaultTemplate.tsx`

### 2. 创建新的频道模板

#### **步骤一：创建模板文件**

```typescript
// /templates/channels/SportsTemplate.tsx
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

const SportsTemplate: React.FC<ChannelTemplateProps> = ({ 
  channel, 
  channels, 
  tags 
}) => {
  return (
    <PageContainer>
      {/* 🏃 体育频道专属设计 */}
      <Section space="lg">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🏃 {channel.name}运动
          </h1>
          <p className="text-green-600 font-medium text-lg">
            挥洒汗水 · 超越极限 · 体育精神
          </p>
        </div>
      </Section>

      {/* 🏆 体育内容 */}
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

#### **步骤二：注册到索引文件**

```typescript
// /templates/channels/index.ts
import SportsTemplate from './SportsTemplate';

export const CHANNEL_TEMPLATES = {
  'social': SocialTemplate,
  'culture': CultureTemplate,
  'tech': TechTemplate,
  'sports': SportsTemplate,  // 🆕 新增
  // ... 其他模板
};
```

### 3. 现有模板预览

#### **🏘️ 社会频道模板** (SocialTemplate.tsx)
- **设计风格**: 温暖橙色系，人文关怀
- **特色功能**: 
  - 社会关注度仪表板
  - 热点话题列表
  - 社区互动反馈
  - 志愿服务报名

#### **🎭 文化频道模板** (CultureTemplate.tsx)
- **设计风格**: 优雅紫色系，艺术气息
- **特色功能**:
  - 文化影响力指标
  - 历史文化展示
  - 艺术作品推荐

#### **💻 科技频道模板** (TechTemplate.tsx)
- **设计风格**: 现代蓝色系，科技感
- **特色功能**:
  - 科技动态指标
  - AI/创新技术分类
  - 科技企业动态

## 🛠️ 开发指南

### 模板开发最佳实践

1. **🎨 设计一致性**
   ```typescript
   // 每个模板都应该有独特的色彩主题
   const primaryColors = {
     social: '#f97316',    // 橙色
     culture: '#8b5cf6',   // 紫色
     tech: '#3b82f6',      // 蓝色
     sports: '#10b981',    // 绿色
   };
   ```

2. **📱 响应式设计**
   ```typescript
   // 使用Tailwind的响应式类名
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
   ```

3. **♿ 可访问性**
   ```typescript
   // 提供有意义的alt文本和ARIA标签
   <button aria-label="打开社区反馈表单">我要反馈</button>
   ```

### 组件复用

所有模板都可以使用这些公共组件：

- `PageContainer` - 页面容器
- `Section` - 内容区域
- `ChannelStrip` - 文章列表
- `NewsContent` - 智能推荐

### 自定义CSS

如果需要特殊样式，可以创建对应的CSS模块：

```typescript
// SocialTemplate.module.css
.socialGradient {
  background: linear-gradient(135deg, #fff7ed 0%, #fef3c7 50%, #fefce8 100%);
}
```

## 🚀 部署和测试

### 本地测试

访问对应频道页面测试模板：

- 社会频道: http://localhost:3001/portal?channel=social
- 文化频道: http://localhost:3001/portal?channel=culture  
- 科技频道: http://localhost:3001/portal?channel=tech

### 添加新频道

1. **创建频道** (Django后台)
   - 名称: 体育
   - 标识(slug): sports
   - 无需设置复杂的JSON配置

2. **创建模板文件**: `SportsTemplate.tsx`

3. **注册模板**: 在 `index.ts` 中添加映射

4. **测试**: 访问 `?channel=sports`

## 🎯 优势总结

### ✅ **开发者友好**
- 代码即配置，所见即所得
- TypeScript类型检查
- Git版本控制友好
- 组件化开发

### ✅ **维护简单**
- 每个频道独立文件
- 修改不影响其他频道
- 易于代码审查

### ✅ **扩展灵活**  
- 可以任意自定义UI
- 可以添加专属功能
- 可以使用任何React生态组件

### ✅ **性能优秀**
- 按需加载模板
- 编译时优化
- 静态分析支持

## 🔄 迁移指南

### 从旧系统迁移

1. **识别现有配置**
   ```json
   // 旧的 channel_config
   {
     "template_type": "social_news",
     "modules": {
       "hot_topics": true,
       "community_services": true
     }
   }
   ```

2. **转换为代码**
   ```typescript
   // 新的 SocialTemplate.tsx
   const showHotTopics = true;        // 直接在代码中控制
   const showCommunityServices = true;
   ```

3. **清理后台配置**
   - 保留基本的频道信息 (name, slug, description)
   - 删除复杂的 JSON 配置
   - template_type 字段变为可选

## 📋 TODO 清单

- [x] 创建基础模板系统
- [x] 实现社会频道模板
- [x] 实现文化频道模板  
- [x] 实现科技频道模板
- [ ] 体育频道模板
- [ ] 娱乐频道模板
- [ ] 财经频道模板
- [ ] 政治频道模板
- [ ] 健康频道模板
- [ ] 国际频道模板

**开始你的频道模板定制之旅吧！** 🚀
