# 🎣 Portal Hooks

React Hooks 库，用于 Portal 应用的各种功能。

---

## 📚 可用 Hooks

### 🔗 `useAdaptiveLink` - 自适应链接

**文件：** `useAdaptiveLink.ts`

根据设备类型自动调整链接打开方式：
- 桌面端：新标签页打开
- 移动端：当前页打开

**快速开始：**
```tsx
import { useAdaptiveLinkSSR } from '@/app/portal/hooks/useAdaptiveLink';

function ArticleCard({ article }) {
  const linkProps = useAdaptiveLinkSSR();
  
  return (
    <a href={`/article/${article.slug}`} {...linkProps}>
      {article.title}
    </a>
  );
}
```

**查看完整文档：**
- `../templates/channels/ADAPTIVE_LINKS_GUIDE.md` - 完整指南
- `../templates/channels/ADAPTIVE_LINKS_SUMMARY.md` - 简明总结

---

## 📁 目录结构

```
hooks/
├── useAdaptiveLink.ts      # 自适应链接 Hook
├── README.md               # 本文档
└── [其他 hooks...]
```

---

## 🚀 添加新 Hook

创建新 Hook 时，请：

1. 创建独立文件（如 `useMyHook.ts`）
2. 添加完整的 TypeScript 类型
3. 添加 JSDoc 注释
4. 提供使用示例
5. 更新本 README

**示例模板：**

```typescript
/**
 * 你的 Hook 说明
 * 
 * @example
 * ```tsx
 * const result = useMyHook(params);
 * ```
 */
export function useMyHook(params: MyParams): MyResult {
  // Hook 实现
}
```

---

**最后更新：** 2025年10月9日

