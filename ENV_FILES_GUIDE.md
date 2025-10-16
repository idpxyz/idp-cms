# 📄 环境变量文件说明指南

## 📋 文件清单与用途

### ✅ **核心文件（必需）**

#### 1. `.env.core` ✅ **必需**
**用途**: 核心基础配置，所有环境共享  
**被引用**: 开发、生产环境都使用  
**内容**: 
- 数据库基础配置 (POSTGRES_USER, POSTGRES_DB)
- Redis 基础配置
- Django SECRET_KEY
- 基础 URL 配置

**引用位置**:
```yaml
# infra/local/docker-compose.yml
# infra/production/docker-compose-ha-node1.yml
env_file:
  - ../../.env.core
```

**状态**: ✅ 保留

---

#### 2. `.env.features` ✅ **必需**
**用途**: 功能特性开关和第三方服务配置  
**被引用**: 开发、生产环境都使用  
**内容**:
- 功能开关 (ENABLE_XXX)
- 第三方服务 API Key
- 可选功能配置

**引用位置**:
```yaml
# infra/local/docker-compose.yml
# infra/production/docker-compose-ha-node1.yml
env_file:
  - ../../.env.core
  - ../../.env.features
```

**状态**: ✅ 保留

---

#### 3. `.env.development` ✅ **开发环境使用**
**用途**: 开发环境特定配置  
**被引用**: 仅开发环境  
**内容**:
- 开发环境 Django 设置
- 开发环境 URL
- 调试配置

**引用位置**:
```yaml
# infra/local/docker-compose.yml
env_file:
  - ../../.env.core
  - ../../.env.features
  - ../../.env.development
```

**状态**: ✅ 保留

---

#### 4. `.env.node1` ✅ **生产环境使用（当前）**
**用途**: 生产环境节点1的特定配置  
**被引用**: 生产环境部署  
**内容**:
- 生产环境所有密码
- 节点1的 IP 和网络配置
- 生产环境 URL

**引用位置**:
```yaml
# infra/production/docker-compose-ha-node1.yml
env_file:
  - ../../.env.core
  - ../../.env.features
  - ../../.env.node1
```

**状态**: ✅ **当前正在使用，已更新为统一密码**

---

### ⚠️ **模板/备份文件**

#### 5. `.env.node1.production` ⚠️ **旧模板**
**用途**: 节点1的生产环境模板（旧版）  
**被引用**: 无  
**内容**: 旧的密码配置

**状态**: ⚠️ **可以删除**（已被 `.env.node1` 替代）

---

#### 6. `.env.node2.production` ⚠️ **未来使用**
**用途**: 节点2的生产环境配置模板  
**被引用**: 暂无（未来扩展到 node2 时使用）  
**内容**: 节点2的配置

**状态**: ⚠️ **保留**（未来扩展时需要）

---

#### 7. `.env.production` ⚠️ **旧版文件**
**用途**: 旧的生产环境配置（单节点模式）  
**被引用**: 无（已被 `.env.node1` 替代）  
**内容**: 旧的生产配置

**状态**: ⚠️ **可以删除**（已不使用）

---

#### 8. `.env.production.ha.example` ⚠️ **示例文件**
**用途**: 高可用模式的配置示例  
**被引用**: 无（仅作为参考）  
**内容**: 配置模板和说明

**状态**: ✅ **保留**（作为文档参考）

---

#### 9. `.env.node1.backup.20251016224548` ❌ **备份文件**
**用途**: 自动备份文件  
**被引用**: 无  
**内容**: .env.node1 的旧版本

**状态**: ❌ **可以删除**（或移到 backups/ 目录）

---

## 📊 使用关系图

```
开发环境 (infra/local/)
├── .env.core            ✅ 核心配置
├── .env.features        ✅ 功能开关
└── .env.development     ✅ 开发特定

生产环境 (infra/production/)
├── .env.core            ✅ 核心配置（共享）
├── .env.features        ✅ 功能开关（共享）
└── .env.node1           ✅ 节点1配置（当前使用）

未来扩展 (node2)
├── .env.core            ✅ 核心配置（共享）
├── .env.features        ✅ 功能开关（共享）
└── .env.node2.production ⚠️ 节点2配置（未来）
```

---

## 🗑️ 清理建议

### 可以安全删除的文件

```bash
# 1. 旧的生产环境配置（已被 .env.node1 替代）
rm .env.production

# 2. 旧的模板文件（已被 .env.node1 替代）
rm .env.node1.production

# 3. 自动备份文件（移到 backups/）
mkdir -p backups/env/
mv .env.node1.backup.* backups/env/
```

### 保留的文件

```bash
# 核心文件（必需）
.env.core            # ✅ 所有环境共享
.env.features        # ✅ 所有环境共享
.env.development     # ✅ 开发环境
.env.node1           # ✅ 生产环境节点1（当前）

# 未来使用
.env.node2.production           # ⚠️ 节点2（保留）
.env.production.ha.example      # ✅ 文档参考（保留）
```

---

## 🔒 当前生产环境配置

**实际使用的环境变量加载顺序**:

```yaml
# docker-compose-ha-node1.yml
env_file:
  - ../../.env.core         # 1️⃣ 基础配置
  - ../../.env.features     # 2️⃣ 功能开关
  - ../../.env.node1        # 3️⃣ 节点1特定配置（覆盖前两者）
```

**优先级**: `.env.node1` > `.env.features` > `.env.core`

---

## ✅ 最终建议

### 立即清理
```bash
# 删除无用文件
rm .env.production
rm .env.node1.production

# 备份文件移到专门目录
mkdir -p backups/env/
mv .env.node1.backup.* backups/env/ 2>/dev/null || true
```

### 保留文件（6个）
1. `.env.core` ✅
2. `.env.features` ✅
3. `.env.development` ✅
4. `.env.node1` ✅
5. `.env.node2.production` ⚠️ (未来使用)
6. `.env.production.ha.example` 📖 (文档)

---

**总结**: 当前项目有 9 个 .env 文件，实际使用的只有 4 个，可以安全删除 3 个。
