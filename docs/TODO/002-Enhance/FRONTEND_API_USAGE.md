# 前端环境与 API 使用说明

## 环境变量
- NEXT_PUBLIC_API_URL: 浏览器端访问 CMS 的外部地址（本地示例：`http://localhost:8000`）
- CMS_ORIGIN: SSR/容器内访问 CMS 的内部地址（本地 Docker：`http://authoring:8000`）

## 端点构建
- 统一使用 `endpoints.getCmsEndpoint(path)` 与 `endpoints.buildUrl(base, params)`
- 示例：
```ts
const url = endpoints.buildUrl(
  endpoints.getCmsEndpoint('/api/articles/'),
  { site: getMainSite().hostname, page: 1, size: 20 }
);
```

## Fetch 配置
- 统一使用 `endpoints.createFetchConfig({ timeout, headers, next })`
- 必须传入整对象，以确保 AbortController 超时与 signal 生效：
```ts
const res = await fetch(url, endpoints.createFetchConfig({ timeout: 8000 }));
```

## 重试策略
- 使用 `retryService.executeWithRetry(() => fetch(...), { maxAttempts, baseDelay })`

## 常见问题
- CORS：生产需允许 `x-request-id` 头；开发已默认放行。本地报错时检查：
  - 后端 `CORS_ALLOWED_ORIGINS` 包含 `http://localhost:3001`
  - `CORS_ALLOW_HEADERS` 含 `x-request-id`
- 网络：容器内访问请用 CMS_ORIGIN（如 `http://authoring:8000`），浏览器端用 NEXT_PUBLIC_API_URL。
- 超时：不要只取 `createFetchConfig().headers`，要传完整配置，否则信号/超时不生效。

## 示例服务
- 文章列表：`ArticleService.getArticles(options)` 支持 `channel/categories/topics/tags` 与 `include` 扩展。
- 分类与专题：`CategoryService`、`TopicService`。
- 标签：`tagService.list()`、`tagService.detail(slug)`。
