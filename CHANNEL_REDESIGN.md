# 频道系统重新设计方案

## 🎯 设计原则

### 1. URL 作为单一数据源
- 所有频道状态都通过 URL 参数管理
- 消除组件间的状态同步
- 浏览器前进/后退自然支持

### 2. 统一的频道切换行为
- 所有页面使用相同的切换逻辑
- 始终通过 router.push() 更新 URL
- 组件通过 URL 参数自动响应变化

### 3. 简化的组件职责

#### ChannelNavigation (展示层)
- 纯展示组件，不维护内部状态
- 从 URL 读取当前频道
- 点击时调用统一的切换函数

#### ChannelProvider (逻辑层)  
- 提供频道数据和切换函数
- 管理频道切换的统一逻辑
- 处理 URL 参数的解析和更新

#### NewsContent (消费层)
- 监听 URL 参数变化
- 根据当前频道加载内容
- 不需要监听自定义事件

## 🔧 实现方案

### 新的 ChannelProvider
```tsx
export function ChannelProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // 从 URL 读取当前频道
  const currentChannelSlug = searchParams.get('channel') || 'recommend';
  
  // 统一的频道切换函数
  const switchChannel = useCallback((channelSlug: string) => {
    const newUrl = channelSlug === 'recommend' 
      ? pathname 
      : `${pathname}?channel=${channelSlug}`;
    router.push(newUrl);
  }, [router, pathname]);
  
  return (
    <ChannelContext.Provider value={{
      channels,
      currentChannelSlug,
      switchChannel,
      loading,
      error
    }}>
      {children}
    </ChannelContext.Provider>
  );
}
```

### 简化的 ChannelNavigation
```tsx
export default function ChannelNavigation() {
  const { channels, currentChannelSlug, switchChannel } = useChannels();
  
  return (
    <nav>
      {channels.map(channel => (
        <button
          key={channel.slug}
          onClick={() => switchChannel(channel.slug)}
          className={currentChannelSlug === channel.slug ? 'active' : ''}
        >
          {channel.name}
        </button>
      ))}
    </nav>
  );
}
```

### 简化的 NewsContent  
```tsx
export default function NewsContent() {
  const { currentChannelSlug } = useChannels();
  const [news, setNews] = useState([]);
  
  // 监听频道变化，重新加载内容
  useEffect(() => {
    loadNews(currentChannelSlug);
  }, [currentChannelSlug]);
  
  // 不需要事件监听器！
}
```

## 🎁 优势

### 1. 极简状态管理
- 只有一个状态源: URL
- 自动支持浏览器历史记录
- 无需手动状态同步

### 2. 一致的用户体验
- 所有页面行为相同
- URL 总是反映真实状态
- 刷新页面状态保持

### 3. 更好的可维护性
- 代码更少，逻辑更清晰
- 无复杂的事件监听器
- 组件职责明确

### 4. 天然支持 SSR
- URL 参数在服务端可用
- 初始渲染就是正确状态
- 无水合问题

## 🚀 迁移计划

### Phase 1: 重构 Context
- 创建新的 ChannelProvider
- 实现统一的 switchChannel 函数
- 移除事件系统

### Phase 2: 简化 Navigation
- 移除内部状态管理
- 使用 Context 的 switchChannel
- 清理 useEffect 逻辑

### Phase 3: 更新 NewsContent
- 移除事件监听器
- 直接监听 URL 参数变化
- 简化初始化逻辑

### Phase 4: 清理和测试
- 移除调试代码
- 全面测试所有场景
- 性能优化
