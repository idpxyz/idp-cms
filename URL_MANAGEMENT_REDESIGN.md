# URL管理系统重新设计方案

## 🚨 当前问题分析

### 问题1: 地址逻辑混乱
- `apps/core/storages.py`: 复杂的请求检测逻辑
- `apps/media/models.py`: 重复的URL生成逻辑  
- 多个配置项：`WAGTAILADMIN_BASE_URL`, `WAGTAIL_BASE_URL`
- 硬编码地址：`localhost:8000`, `authoring:8000`

### 问题2: 环境管理困难
- 开发环境：需要localhost地址
- 容器内通信：需要内部地址
- 生产环境：需要公网地址
- 测试环境：又是另一套地址

### 问题3: 维护成本高
- 新增环境需要修改多个文件
- 部署时容易配置错误
- 调试困难，逻辑分散

## ✅ 统一解决方案

### 核心原则
1. **环境变量驱动**：所有URL通过环境变量配置
2. **单一配置源**：统一的URL配置管理
3. **自动适配**：根据环境自动选择合适的URL
4. **简化逻辑**：移除复杂的请求检测

### 设计方案

#### 1. 统一的环境变量配置
```bash
# 基础配置
DJANGO_BASE_URL=http://localhost:8000          # Django服务的外部访问地址
DJANGO_INTERNAL_URL=http://authoring:8000      # Django服务的内部访问地址

# 媒体文件配置
MEDIA_BASE_URL=http://localhost:8000           # 媒体文件的外部访问地址
MEDIA_INTERNAL_URL=http://authoring:8000       # 媒体文件的内部访问地址

# 前端配置
FRONTEND_BASE_URL=http://localhost:3000        # 前端服务地址
```

#### 2. URL配置管理器
创建一个统一的URL配置管理器：
```python
# apps/core/url_config.py
class URLConfig:
    @classmethod
    def get_media_url(cls, for_frontend=False):
        if for_frontend:
            return os.getenv('MEDIA_INTERNAL_URL', 'http://authoring:8000')
        else:
            return os.getenv('MEDIA_BASE_URL', 'http://localhost:8000')
```

#### 3. 简化的存储类
```python
# apps/core/storages.py  
def url(self, name):
    from apps.core.url_config import URLConfig
    clean_name = name.lstrip('/')
    base_url = URLConfig.get_media_url()
    return f"{base_url}/api/media/proxy/{clean_name}"
```

#### 4. 环境特定配置
```yaml
# 开发环境
MEDIA_BASE_URL=http://localhost:8000
MEDIA_INTERNAL_URL=http://authoring:8000

# 生产环境  
MEDIA_BASE_URL=https://cdn.example.com
MEDIA_INTERNAL_URL=http://authoring:8000

# 测试环境
MEDIA_BASE_URL=http://test.example.com:8000
MEDIA_INTERNAL_URL=http://authoring:8000
```

## 🎯 实施步骤

### 步骤1: 创建URL配置管理器
- 创建统一的配置管理类
- 定义标准的环境变量

### 步骤2: 简化存储类
- 移除复杂的请求检测逻辑
- 使用统一的配置管理器

### 步骤3: 更新环境配置
- 更新docker-compose.yaml
- 更新各环境的.env文件

### 步骤4: 清理冗余代码
- 移除CustomRendition的url属性
- 清理相关的硬编码

### 步骤5: 测试验证
- 测试各种环境下的URL生成
- 验证前端和后端的兼容性

## 📋 配置对照表

| 场景 | 当前方案 | 新方案 |
|------|----------|--------|
| Admin预览 | 复杂检测逻辑 | `MEDIA_BASE_URL` |
| API调用 | 硬编码内部地址 | `MEDIA_INTERNAL_URL` |
| 生产环境 | 手动修改多处 | 环境变量配置 |
| 新环境部署 | 修改代码 | 配置环境变量 |

## 🚀 预期效果

### 开发体验
- 新环境部署只需配置环境变量
- 代码逻辑简单清晰
- 调试容易，配置集中

### 运维友好
- 环境配置标准化
- 部署流程简化
- 配置错误风险降低

### 可扩展性
- 支持CDN等复杂场景
- 支持多域名部署
- 支持负载均衡

---

**总结**: 通过统一的环境变量驱动的URL管理方案，彻底解决当前地址逻辑混乱的问题，提升系统的可维护性和部署友好性。
