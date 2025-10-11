# 🔌 端口映射详解

**理解 Docker 端口映射：宿主机端口 vs 容器端口**

---

## 📖 基础概念

### Docker 端口映射格式
```yaml
ports:
  - "宿主机端口:容器内部端口"
```

### 例如：`"3001:3000"`
```
外部访问 → 3001 → [Docker] → 3000 → 容器内应用
```

---

## 🎯 Sites 服务的端口详解

### 配置
```yaml
sites:
  ports:
    - "3001:3000"  # 宿主机3001 映射到 容器3000
  healthcheck:
    test: ["CMD", "wget", "http://localhost:3000/"]  # 容器内部检查
```

### 两个端口的含义

#### **3000 端口** - 容器内部端口
- **位置**: Docker 容器**内部**
- **用途**: Next.js 应用监听的端口
- **为什么是 3000**: Next.js 的标准默认端口
- **谁使用**:
  - ✅ 容器内的 Next.js 进程监听这个端口
  - ✅ 容器内的健康检查访问这个端口
  - ✅ 其他容器（如 authoring）通过 `http://sites:3000` 访问

#### **3001 端口** - 宿主机端口
- **位置**: 你的电脑（宿主机）
- **用途**: 外部访问的端口
- **为什么是 3001**: 避免与其他服务冲突，便于区分
- **谁使用**:
  - ✅ 用户浏览器访问 `http://localhost:3001`
  - ✅ 测试脚本访问 `http://localhost:3001`
  - ✅ 开发工具连接这个端口

---

## 📊 完整的端口映射表

### 开发环境

| 服务 | 宿主机端口 | 容器端口 | 说明 | 访问地址 |
|------|-----------|---------|------|---------|
| **前端** |||||
| sites | 3001 | 3000 | Next.js 前端 | http://localhost:3001 |
| **后端** |||||
| authoring | 8000 | 8000 | Django/Wagtail | http://localhost:8000 |
| **数据库** |||||
| postgres | 5438 | 5432 | PostgreSQL | localhost:5438 |
| redis | 6379 | 6379 | Redis | localhost:6379 |
| **存储/搜索** |||||
| minio | 9002 | 9000 | MinIO API | http://localhost:9002 |
| minio | 9001 | 9001 | MinIO 控制台 | http://localhost:9001 |
| opensearch | 9200 | 9200 | OpenSearch | http://localhost:9200 |
| opensearch | 9600 | 9600 | OpenSearch 性能 | - |
| **可视化/分析** |||||
| os-dashboards | 5601 | 5601 | OpenSearch 可视化 | http://localhost:5601 |
| clickhouse | 8123 | 8123 | ClickHouse HTTP | http://localhost:8123 |
| clickhouse | 9123 | 9000 | ClickHouse Native | localhost:9123 |

### 生产环境

| 服务 | 宿主机端口 | 容器端口 | 说明 | 访问地址 |
|------|-----------|---------|------|---------|
| **前端** |||||
| sites | 3001 | 3000 | Next.js 前端 | http://localhost:3001 |
| **后端** |||||
| authoring | 8000 | 8000 | Django/Wagtail | http://localhost:8000 |
| **数据库** |||||
| postgres | 5432 | 5432 | PostgreSQL | localhost:5432 |
| redis | 6379 | 6379 | Redis | localhost:6379 |
| **存储/搜索** |||||
| minio | 9000 | 9000 | MinIO API | http://localhost:9000 |
| minio | 9001 | 9001 | MinIO 控制台 | http://localhost:9001 |
| opensearch | 9200 | 9200 | OpenSearch | http://localhost:9200 |
| opensearch | 9600 | 9600 | OpenSearch 性能 | - |

---

## 🔍 端口差异说明

### 开发 vs 生产的端口差异

#### PostgreSQL
```yaml
# 开发环境
ports: ["5438:5432"]  # 外部5438，避免与本地PostgreSQL冲突

# 生产环境
ports: ["5432:5432"]  # 使用标准端口
```

**原因**: 开发环境可能已有本地 PostgreSQL 运行在 5432，所以用 5438 避免冲突

#### MinIO
```yaml
# 开发环境
ports: ["9002:9000", "9001:9001"]  # API 端口 9002

# 生产环境
ports: ["9000:9000", "9001:9001"]  # API 端口 9000
```

**原因**: 开发环境可能有其他服务使用 9000，所以用 9002

#### Sites (一致)
```yaml
# 两个环境都是
ports: ["3001:3000"]
```

**原因**: 
- 保持一致性
- 3001 不常见，不会冲突
- 容器内统一用 3000（Next.js 标准）

---

## 🌐 服务间通信示例

### 容器内部通信（使用容器端口）
```yaml
# authoring 容器访问 sites
FRONTEND_ORIGIN: http://sites:3000  # ← 使用容器端口 3000

# sites 容器访问 authoring
CMS_ORIGIN: http://authoring:8000   # ← 使用容器端口 8000
```

### 浏览器访问（使用宿主机端口）
```bash
# 用户访问前端
http://localhost:3001  # ← 使用宿主机端口 3001

# 前端调用后端 API
http://localhost:8000/api/  # ← 使用宿主机端口 8000
```

### 健康检查（容器内部）
```yaml
sites:
  healthcheck:
    test: ["CMD", "wget", "http://localhost:3000/"]  # ← 容器内用 3000
```

---

## 💡 为什么 Sites 不直接用 3000:3000？

### 历史原因
```
时间线：
1. Portal 前端使用 3000:3000
2. Sites 前端出现，为避免冲突用 3001:3000
3. Portal 被删除，但 Sites 保留 3001
```

### 保留 3001 的好处

#### ✅ 优点
1. **避免冲突**: 如果本地运行其他 Next.js 项目（默认 3000）
2. **清晰标识**: 3001 明确表示这是项目前端，不是随意的 3000
3. **配置稳定**: 不需要改动已有的环境变量和文档
4. **扩展性**: 如果需要多个前端，3001、3002、3003...

#### 🤔 可以改吗？
**可以改为 3000:3000**，但需要同步修改：
- 所有环境变量中的 `3001`
- 文档和脚本中的引用
- 测试脚本的 URL

**建议**: 保持 3001，除非有特定理由改变

---

## 🔧 如何修改端口映射

### 如果想改为 3000:3000

#### 1. 修改 docker-compose.yml
```yaml
sites:
  ports:
    - "3000:3000"  # 改为 3000:3000
```

#### 2. 修改环境变量
```bash
# .env.core
FRONTEND_PUBLIC_URL=http://localhost:3000  # 改为 3000

# docker-compose.yml 中的环境变量
FRONTEND_PUBLIC_URL=http://localhost:3000
```

#### 3. 修改脚本和文档
```bash
# 批量替换
find . -type f \( -name "*.sh" -o -name "*.py" -o -name "*.md" \) \
  -exec sed -i 's|localhost:3001|localhost:3000|g' {} \;
```

#### 4. 重启服务
```bash
docker compose -f infra/local/docker-compose.yml down
docker compose -f infra/local/docker-compose.yml up -d
```

---

## 📚 相关概念

### 容器网络
```
Docker 创建了一个虚拟网络：
- 容器内: 各服务通过服务名通信（sites, authoring, postgres）
- 容器外: 通过 localhost:端口 访问
```

### 端口绑定
```yaml
# 仅容器内可访问（不映射到宿主机）
expose:
  - "3000"

# 映射到宿主机所有网络接口
ports:
  - "3001:3000"

# 仅映射到本地回环
ports:
  - "127.0.0.1:3001:3000"
```

---

## ✅ 总结

### 关键要点
1. **3000** = 容器内部端口（Next.js 监听）
2. **3001** = 宿主机端口（外部访问）
3. **容器间通信** 使用服务名和容器端口（`http://sites:3000`）
4. **浏览器访问** 使用 localhost 和宿主机端口（`http://localhost:3001`）
5. **健康检查** 在容器内执行，使用容器端口（3000）

### 记忆口诀
```
3000 在容器里，Next.js 听它的
3001 在外面，浏览器用它访
容器内说话用服务名
浏览器访问找localhost
```

---

**理解了端口映射，Docker 网络就清楚了！** 🎯

