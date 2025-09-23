# URL配置指南

## 🎯 新的统一URL管理方案

### 核心原则
- **环境变量驱动**：所有URL通过环境变量配置
- **单一配置源**：统一的URL配置管理器
- **简化逻辑**：移除复杂的请求检测
- **部署友好**：不同环境只需配置环境变量

## 📋 环境变量配置

### 基础配置
```bash
# 媒体文件URL配置
MEDIA_BASE_URL=http://localhost:8000          # 媒体文件的外部访问地址（浏览器访问）
MEDIA_INTERNAL_URL=http://authoring:8000       # 媒体文件的内部访问地址（服务间通信）

# Django服务URL配置  
DJANGO_BASE_URL=http://localhost:8000          # Django服务的外部访问地址
DJANGO_INTERNAL_URL=http://authoring:8000      # Django服务的内部访问地址

# 前端服务URL配置
FRONTEND_BASE_URL=http://localhost:3000        # 前端服务地址
```

### 不同环境配置示例

#### 开发环境
```bash
MEDIA_BASE_URL=http://localhost:8000
MEDIA_INTERNAL_URL=http://authoring:8000
DJANGO_BASE_URL=http://localhost:8000
DJANGO_INTERNAL_URL=http://authoring:8000
FRONTEND_BASE_URL=http://localhost:3000
```

#### 生产环境
```bash
MEDIA_BASE_URL=https://cdn.example.com
MEDIA_INTERNAL_URL=http://authoring:8000
DJANGO_BASE_URL=https://api.example.com
DJANGO_INTERNAL_URL=http://authoring:8000
FRONTEND_BASE_URL=https://www.example.com
```

#### 测试环境
```bash
MEDIA_BASE_URL=http://test.example.com:8000
MEDIA_INTERNAL_URL=http://authoring:8000
DJANGO_BASE_URL=http://test.example.com:8000
DJANGO_INTERNAL_URL=http://authoring:8000
FRONTEND_BASE_URL=http://test.example.com:3000
```

## 🔧 使用方法

### 在Python代码中
```python
from apps.core.url_config import URLConfig

# 获取媒体文件URL（用于浏览器访问）
media_url = URLConfig.get_media_base_url()

# 获取媒体文件URL（用于服务间通信）
internal_url = URLConfig.get_media_internal_url()

# 构建完整的媒体代理URL
proxy_url = URLConfig.build_media_proxy_url('path/to/image.jpg')
```

### 在模板中
媒体文件的URL会自动使用正确的配置，无需特殊处理：
```django
{% load wagtailimages_tags %}
{% image page.cover fill-1200x600 as hero_image %}
<img src="{{ hero_image.url }}" alt="Hero Image">
```

## 📊 配置优先级

### MEDIA_BASE_URL 优先级
1. `MEDIA_BASE_URL` 环境变量
2. `DJANGO_BASE_URL` 环境变量  
3. 默认值 `http://localhost:8000`

### MEDIA_INTERNAL_URL 优先级
1. `MEDIA_INTERNAL_URL` 环境变量
2. `DJANGO_INTERNAL_URL` 环境变量
3. 默认值 `http://authoring:8000`

## 🚀 迁移指南

### 从旧配置迁移
如果你之前使用了 `WAGTAIL_BASE_URL` 或类似配置，需要：

1. **更新环境变量**：
   ```bash
   # 旧配置
   WAGTAIL_BASE_URL=http://authoring:8000
   
   # 新配置
   MEDIA_BASE_URL=http://localhost:8000
   MEDIA_INTERNAL_URL=http://authoring:8000
   ```

2. **更新Docker Compose**：
   已在 `infra/local/docker-compose.yaml` 中更新

3. **重启服务**：
   ```bash
   docker compose -f infra/local/docker-compose.yaml restart authoring
   ```

## 🔍 调试工具

### 查看当前配置
```python
from apps.core.url_config import URLConfig

# 获取配置摘要
config = URLConfig.get_config_summary()
print(config)
```

### 测试URL生成
```python
from apps.core.url_config import URLConfig

# 测试媒体URL生成
test_path = "portal/c2-portal-media/2025/09/originals/test.jpg"
browser_url = URLConfig.build_media_proxy_url(test_path, for_internal=False)
internal_url = URLConfig.build_media_proxy_url(test_path, for_internal=True)

print(f"浏览器访问URL: {browser_url}")
print(f"内部通信URL: {internal_url}")
```

## ✅ 优势对比

| 方面 | 旧方案 | 新方案 |
|------|--------|--------|
| 配置复杂度 | 多处硬编码，逻辑复杂 | 统一环境变量，逻辑简单 |
| 部署难度 | 需要修改代码 | 只需配置环境变量 |
| 可维护性 | 分散管理，难以维护 | 集中管理，易于维护 |
| 调试难度 | 逻辑复杂，难以调试 | 逻辑清晰，易于调试 |
| 扩展性 | 硬编码限制扩展 | 环境变量支持任意配置 |

## 🎉 总结

新的统一URL管理方案彻底解决了地址逻辑混乱的问题：

- ✅ **简化了代码逻辑**：移除复杂的请求检测
- ✅ **统一了配置管理**：所有URL配置集中管理
- ✅ **提升了部署效率**：不同环境只需配置环境变量
- ✅ **增强了可维护性**：代码逻辑清晰，易于理解和修改

这个方案为未来的扩展和部署提供了坚实的基础。
