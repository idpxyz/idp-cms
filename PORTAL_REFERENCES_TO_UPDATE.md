# 🔍 Portal 遗留引用清理清单

**生成时间**: 2025-10-11  
**状态**: Portal 目录和 Docker 配置已清理，但代码中仍有引用需要更新

---

## 📊 概述

虽然 portal 目录和 Docker Compose 配置已成功清理，但在代码库中发现了 **17+ 处**对 `localhost:3000` 的引用。这些引用需要根据实际用途决定是否更新。

---

## 🔴 高优先级 - 需要更新

### 1. 启动脚本

#### `/opt/idp-cms/start-production.sh`
```bash
# 第 70 行
echo "   - Portal: http://localhost:3000/"  # ❌ 应改为 Sites: http://localhost:3001/
```

**建议修改**:
```bash
echo "   - Sites Frontend: http://localhost:3001/"
```

#### `/opt/idp-cms/infra/local/start_sites.sh`
```bash
echo "   - Portal: http://localhost:3000"  # ❌ 应改为 Sites: http://localhost:3001
```

---

### 2. 测试和工具脚本

#### `/opt/idp-cms/test-article-performance.sh`
```bash
BASE_URL="${1:-http://localhost:3000}"  # ❌ 应改为 3001
```

**建议修改**:
```bash
BASE_URL="${1:-http://localhost:3001}"
```

#### `/opt/idp-cms/generate_test_data.py`
```python
print("🌐 请访问 http://localhost:3000/feed 查看智能推荐效果")  # ❌
```

**建议修改**:
```python
print("🌐 请访问 http://localhost:3001/feed 查看智能推荐效果")
```

#### `/opt/idp-cms/show_device_fingerprints.py`
```python
print(f'curl http://localhost:3000/api/channels/personalized?site=aivoya.com \\')  # ❌
```

**建议修改**:
```python
print(f'curl http://localhost:3001/api/channels/personalized?site=aivoya.com \\')
```

---

## 🟡 中优先级 - 可能需要更新

### 3. 环境配置

#### `/opt/idp-cms/.env.core`
```bash
FRONTEND_BASE_URL=http://localhost:3000  # 🤔 可能需要改为 3001
```

**分析**: 
- 如果这个变量被后端用来生成前端 URL，应该更新为 3001
- 检查代码中如何使用这个变量

**建议**: 先检查使用情况，再决定是否修改

---

### 4. Docker Compose 环境变量

#### `/opt/idp-cms/infra/local/docker-compose.yml`
```yaml
# 多处出现
FRONTEND_ORIGIN: http://localhost:3000  # 🤔 可能需要改为 3001

# sites 服务的健康检查
test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/ready"]
# 这个是 sites 容器内部的端口，应该保持 3000（容器内部监听 3000，映射到宿主机 3001）
```

**分析**:
- **容器内部健康检查**: 保持 `localhost:3000` ✅（容器内部端口）
- **外部环境变量 FRONTEND_ORIGIN**: 可能需要改为 `3001`（取决于用途）

---

### 5. 后端配置和中间件

#### `/opt/idp-cms/config/settings/base.py`
```python
CORS_ALLOWED_ORIGINS = EnvValidator.get_list(
    "CORS_ALLOWED_ORIGINS", 
    ["http://localhost:3000", "http://localhost:3001"]  # 保留两个以兼容 ✅
)
```

**建议**: 保持不变，包含 3001 即可，3000 可以保留以兼容

#### `/opt/idp-cms/apps/api/middleware/cors.py`
```python
'http://localhost:3000',  # Next.js开发服务器  # 🤔 可以改为 3001
```

**建议**: 更新为 3001，或同时保留两个端口

---

### 6. 应用代码中的引用

#### `/opt/idp-cms/apps/core/url_config.py`
```python
'http://localhost:3000'  # 🤔 检查用途
```

#### `/opt/idp-cms/apps/core/site_utils.py`
```python
'localhost:3000': 'localhost',  # 🤔 可能需要添加 3001 映射
'domains': ['localhost', '127.0.0.1', 'localhost:3000', 'localhost:8000'],  # 🤔 添加 3001
```

**建议**: 
- 添加 `'localhost:3001': 'localhost'` 映射
- 在 domains 列表中添加 `'localhost:3001'`

---

### 7. 测试数据初始化

#### `/opt/idp-cms/apps/news/management/commands/init_topic_data.py`
```python
self.stdout.write('   ✅ 创建了默认Wagtail站点: localhost:3000')  # ❌
```

**建议修改**:
```python
self.stdout.write('   ✅ 创建了默认Wagtail站点: localhost:3001')
```

---

### 8. Sites 前端测试脚本

#### `/opt/idp-cms/sites/scripts/lighthouse-ci.js`
```javascript
'http://localhost:3000',                    // 主页  # ❌
'http://localhost:3000/portal',             // 门户首页  # ❌
```

**建议修改**:
```javascript
'http://localhost:3001',                    // 主页
'http://localhost:3001/portal',             // 门户首页
```

---

## 🟢 低优先级 - 可以保留

### 9. 测试代码

#### `/opt/idp-cms/test_api_call.py`
```python
request.META['HTTP_HOST'] = 'localhost:3000'  # 测试代码，可以保留
```

**建议**: 如果这是测试代码，可以保留或添加 3001 的测试用例

---

## 🛠️ 批量更新命令

### 方法 1: 使用 sed 批量替换（谨慎使用）

```bash
# 备份所有要修改的文件
find /opt/idp-cms -type f \( -name "*.py" -o -name "*.sh" -o -name "*.js" \) \
  -exec grep -l "localhost:3000" {} \; | \
  while read file; do cp "$file" "$file.backup"; done

# 批量替换（除了 docker-compose.yml 中的健康检查）
find /opt/idp-cms -type f \( -name "*.py" -o -name "*.sh" \) \
  ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/backup/*" \
  -exec sed -i 's|localhost:3000|localhost:3001|g' {} \;
```

### 方法 2: 手动逐个检查和更新（推荐）

```bash
# 列出所有包含 localhost:3000 的文件
grep -r "localhost:3000" /opt/idp-cms \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=backup \
  --exclude="*.md" \
  -l

# 逐个检查并手动编辑
```

---

## 📋 更新检查清单

### 高优先级（必须更新）
- [ ] `start-production.sh` - 更新输出信息
- [ ] `infra/local/start_sites.sh` - 更新输出信息
- [ ] `test-article-performance.sh` - 更新默认 URL
- [ ] `generate_test_data.py` - 更新提示信息
- [ ] `show_device_fingerprints.py` - 更新示例命令
- [ ] `sites/scripts/lighthouse-ci.js` - 更新测试 URL

### 中优先级（建议更新）
- [ ] `.env.core` - 检查并可能更新 FRONTEND_BASE_URL
- [ ] `config/settings/base.py` - 验证 CORS 配置（已包含 3001）
- [ ] `apps/api/middleware/cors.py` - 更新 CORS 允许列表
- [ ] `apps/core/url_config.py` - 更新 URL 配置
- [ ] `apps/core/site_utils.py` - 添加 3001 域名映射
- [ ] `apps/news/management/commands/init_topic_data.py` - 更新输出

### 低优先级（可选更新）
- [ ] `test_api_call.py` - 测试代码，可保留
- [ ] Docker Compose 健康检查 - **保持不变**（容器内部端口）

---

## 🚀 推荐的更新顺序

1. **立即更新**: 启动脚本和测试脚本（用户界面相关）
2. **验证测试**: 运行系统确保一切正常
3. **更新配置**: 环境变量和应用配置
4. **验证功能**: 测试所有功能确保正常工作
5. **清理备份**: 确认无误后删除 .backup 文件

---

## ⚠️ 特别注意

### Docker 容器端口 vs 宿主机端口

**重要区分**:
- **容器内部**: sites 服务监听 `3000` 端口
- **宿主机映射**: 映射到 `3001` 端口
- **健康检查**: 在容器内部执行，使用 `localhost:3000` ✅ 正确

```yaml
# 这是正确的配置
sites:
  ports:
    - "3001:3000"  # 宿主机3001 -> 容器3000
  healthcheck:
    test: ["CMD", "wget", "http://localhost:3000/api/ready"]  # 容器内部，使用3000 ✅
```

**不要修改**:
- Docker Compose 中的健康检查 URL
- 容器内部使用的端口引用

**应该修改**:
- 宿主机访问的 URL（用户文档、测试脚本等）
- 浏览器访问的 URL
- CORS 配置中的外部访问 URL

---

## 📞 快速修复脚本

创建一个快速修复关键文件的脚本：

```bash
#!/bin/bash
# quick-fix-port-references.sh

echo "🔧 更新关键文件中的端口引用..."

# 1. start-production.sh
sed -i 's|Portal: http://localhost:3000|Sites Frontend: http://localhost:3001|g' start-production.sh

# 2. test-article-performance.sh
sed -i 's|BASE_URL="${1:-http://localhost:3000}"|BASE_URL="${1:-http://localhost:3001}"|g' test-article-performance.sh

# 3. generate_test_data.py
sed -i 's|http://localhost:3000/feed|http://localhost:3001/feed|g' generate_test_data.py

# 4. show_device_fingerprints.py
sed -i 's|http://localhost:3000/api|http://localhost:3001/api|g' show_device_fingerprints.py

# 5. init_topic_data.py
sed -i 's|localhost:3000|localhost:3001|g' apps/news/management/commands/init_topic_data.py

# 6. lighthouse-ci.js
sed -i 's|http://localhost:3000|http://localhost:3001|g' sites/scripts/lighthouse-ci.js

echo "✅ 关键文件已更新！"
```

---

## ✅ 总结

Portal 目录和 Docker 配置清理已完成，但代码中还有 **17+ 处引用**需要更新：

- **必须更新**: 6 个文件（脚本和测试）
- **建议更新**: 6 个文件（配置和应用代码）
- **可选更新**: 1 个文件（测试代码）
- **不要修改**: Docker 健康检查（容器内部端口）

建议使用上面的快速修复脚本更新关键文件，然后逐个检查其他引用。

---

**下一步**: 运行 `./start.sh` 启动服务并验证 sites 前端（3001端口）正常工作。

