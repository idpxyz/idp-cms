# 媒体URL配置说明

## 问题描述

在生产环境中，浏览器访问媒体文件时出现 `ERR_NAME_NOT_RESOLVED` 错误：

```
GET http://authoring:8000/api/media/proxy/portal/c1-root/2025/10/originals/xxx.jpg net::ERR_NAME_NOT_RESOLVED
```

## 问题原因

1. **`authoring` 是 Docker 内部服务名**：只能在 Docker 容器之间访问
2. **浏览器无法解析内部DNS**：浏览器运行在用户本地机器，不在 Docker 网络内
3. **缺少环境变量配置**：Django 后端生成 URL 时，由于缺少 `MEDIA_BASE_URL` 配置，使用了默认的内部地址

## 解决方案

### 1. 配置环境变量

在 Docker Compose 配置中添加以下环境变量：

```yaml
environment:
  # 媒体URL配置（浏览器可访问的地址）
  MEDIA_BASE_URL: ${MEDIA_BASE_URL:-http://192.168.8.195:8000}
  DJANGO_BASE_URL: ${DJANGO_BASE_URL:-http://192.168.8.195:8000}
```

### 2. 在 `.env` 文件中设置

创建或编辑 `.env` 文件（或 `.env.core`、`.env.node1` 等）：

```bash
# 浏览器可访问的Django基础URL
MEDIA_BASE_URL=http://192.168.8.195:8000
DJANGO_BASE_URL=http://192.168.8.195:8000
```

**重要提示**：将 `192.168.8.195` 替换为您的实际服务器IP或域名。

### 3. 不同部署场景的配置示例

#### 本地开发环境
```bash
MEDIA_BASE_URL=http://localhost:8000
DJANGO_BASE_URL=http://localhost:8000
```

#### 内网部署
```bash
MEDIA_BASE_URL=http://192.168.8.195:8000
DJANGO_BASE_URL=http://192.168.8.195:8000
```

#### 公网部署（使用域名）
```bash
MEDIA_BASE_URL=https://api.yourdomain.com
DJANGO_BASE_URL=https://api.yourdomain.com
```

#### 使用CDN/负载均衡器
```bash
MEDIA_BASE_URL=https://cdn.yourdomain.com
DJANGO_BASE_URL=https://api.yourdomain.com
MINIO_PUBLIC_DOMAIN=cdn.yourdomain.com:9002
```

## 技术细节

### URL 生成流程

1. **Django 存储后端** (`apps/core/storages.py`)
   - `PublicMediaStorage.url()` 方法生成媒体文件URL
   - 调用 `URLConfig.build_media_proxy_url()`

2. **URL 配置管理器** (`apps/core/url_config.py`)
   - `get_media_base_url()` - 获取浏览器可访问的URL
   - `get_media_internal_url()` - 获取容器间通信的URL
   - 优先级：`MEDIA_BASE_URL` > `DJANGO_BASE_URL` > 默认值

3. **默认值**
   - 外部访问：`http://localhost:8000`
   - 内部访问：`http://authoring:8000`

### 为什么需要两种URL？

- **浏览器访问**：需要使用公网IP/域名（如 `http://192.168.8.195:8000`）
- **容器间通信**：可以使用内部服务名（如 `http://authoring:8000`），速度更快

### 智能URL选择

代码会自动检测请求类型：
- **浏览器请求** → 使用外部URL（`MEDIA_BASE_URL`）
- **Admin访问** → 使用外部URL
- **默认情况** → 使用外部URL（确保浏览器可访问）

参见 `apps/core/storages.py` 的 `_should_use_internal_url()` 方法。

## 验证配置

### 1. 检查环境变量

进入容器查看环境变量：

```bash
docker exec -it node1-authoring env | grep -E "MEDIA_BASE_URL|DJANGO_BASE_URL"
```

应该输出：
```
MEDIA_BASE_URL=http://192.168.8.195:8000
DJANGO_BASE_URL=http://192.168.8.195:8000
```

### 2. 测试媒体文件访问

在浏览器中访问：
```
http://192.168.8.195:8000/api/media/proxy/portal/c1-root/2025/10/originals/xxx.jpg
```

应该能正常显示图片。

### 3. 检查API响应

调用文章API，检查返回的图片URL：

```bash
curl http://192.168.8.195:8000/api/v1/articles/1/ | jq '.cover'
```

URL应该是：
```json
{
  "url": "http://192.168.8.195:8000/api/media/proxy/...",
  ...
}
```

而不是：
```json
{
  "url": "http://authoring:8000/api/media/proxy/...",  // ❌ 错误
  ...
}
```

## 常见问题

### Q: 为什么不直接访问 MinIO？

A: 有几个原因：
1. **网络隔离**：MinIO 可能没有暴露到公网
2. **统一认证**：通过Django代理可以添加访问控制
3. **缓存优化**：代理层可以添加CDN缓存
4. **路径转换**：自动处理路径兼容性问题

### Q: 是否需要重启容器？

A: 是的，修改环境变量后需要重启：

```bash
./deploy-node1-remote.sh --rebuild-backend
```

或者：

```bash
docker-compose -f infra/production/docker-compose-ha-node1.yml restart authoring
```

### Q: 如何调试URL生成问题？

A: 查看Django日志：

```bash
docker logs -f node1-authoring | grep "媒体代理请求"
```

或者在代码中添加日志：

```python
from apps.core.url_config import URLConfig
print(URLConfig.get_config_summary())
```

## 修改历史

- **2025-10-23**：添加 `MEDIA_BASE_URL` 和 `DJANGO_BASE_URL` 配置支持
- **问题修复**：解决浏览器无法访问媒体文件的 DNS 解析错误

## 相关文件

- `/opt/idp-cms/apps/core/url_config.py` - URL配置管理器
- `/opt/idp-cms/apps/core/storages.py` - 存储后端实现
- `/opt/idp-cms/infra/production/docker-compose-ha-node1.yml` - 生产环境配置
- `/opt/idp-cms/env.production.example` - 环境变量模板

