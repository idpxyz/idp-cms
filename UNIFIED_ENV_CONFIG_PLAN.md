# 统一环境变量配置改进方案

## 🎯 **改进目标**

1. **统一配置方式**: 所有服务使用一致的配置加载方式
2. **简化文件结构**: 减少冗余文件，建立清晰的配置层次
3. **分类管理**: 按功能和重要性对配置项进行分类
4. **环境隔离**: 明确区分开发、测试、生产环境配置

## 📊 **当前问题分析**

### 配置文件混乱
```bash
/opt/idp-cms/.env                    # 35行 - 主配置
/opt/idp-cms/infra/local/.env       # 3行  - 本地特定配置
/opt/idp-cms/sites/env.local        # 26行 - 前端配置
/opt/idp-cms/.env.example           # 文档
/opt/idp-cms/env.production.example # 56行 - 生产模板
```

### 配置方式不一致
```yaml
# authoring服务 - environment方式
authoring:
  environment:
    MEDIA_BASE_URL: http://localhost:8000

# 其他服务 - env_file方式  
postgres:
  env_file: ../../.env
```

## 🏗️ **新的统一结构设计**

### 1. **配置文件结构**
```bash
# 根目录环境变量文件
.env.core                    # 核心必需配置 (~20个)
.env.features               # 功能特性配置 (~15个)  
.env.local                  # 本地覆盖配置 (git忽略)

# 环境特定配置
.env.development            # 开发环境配置
.env.production             # 生产环境配置
.env.staging                # 测试环境配置

# 前端项目配置
sites/.env.local           # Sites前端本地配置
sites/.env.production      # Sites前端生产配置

# 文档和示例
docs/env-config-guide.md  # 配置文档
.env.example               # 完整示例文件
```

### 2. **配置分类体系**

#### 🔥 **核心配置** (.env.core)
```bash
# 应用核心配置
DJANGO_SECRET_KEY=xxx
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

# 数据库配置
DATABASE_URL=postgresql://user:pass@host:port/db
REDIS_URL=redis://redis:6379/1

# 统一URL管理 (我们的新方案)
MEDIA_BASE_URL=http://localhost:8000
MEDIA_INTERNAL_URL=http://authoring:8000
DJANGO_BASE_URL=http://localhost:8000
DJANGO_INTERNAL_URL=http://authoring:8000
```

#### ⚡ **功能配置** (.env.features)
```bash
# 搜索服务
OPENSEARCH_URL=http://opensearch:9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=xxx

# 对象存储
MINIO_ENDPOINT=http://minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# 功能开关
ENABLE_MEDIA_CLEANUP=false
ENABLE_RENDITION_CLEANUP=false
ENABLE_MONITORING=true
```

#### 🔧 **环境特定配置** (.env.development/.env.production)
```bash
# 开发环境
NODE_ENV=development
LOG_LEVEL=DEBUG
DJANGO_DEBUG=1

# 生产环境
NODE_ENV=production
LOG_LEVEL=INFO
DJANGO_DEBUG=0
```

### 3. **Docker Compose统一配置方式**

#### 选择方案：**env_file + environment 混合方式**
```yaml
# 统一的配置加载方式
services:
  authoring:
    env_file:
      - .env.core
      - .env.features
      - .env.${ENVIRONMENT:-development}
    environment:
      - NODE_ENV=${NODE_ENV:-development}
      # 只在environment中放置动态或覆盖配置
  
  postgres:
    env_file:
      - .env.core
      - .env.features
    # 移除重复的environment配置
```

## 🚀 **实施步骤**

### 第1步: 创建新的配置文件结构
1. 分析现有配置，按重要性分类
2. 创建.env.core（核心必需）
3. 创建.env.features（功能特性）
4. 创建环境特定配置文件

### 第2步: 更新Docker Compose配置
1. 统一所有服务的配置加载方式
2. 移除重复的environment配置
3. 使用env_file数组加载多个配置文件

### 第3步: 清理和整合
1. 合并现有配置文件内容
2. 移除冗余文件
3. 更新.gitignore

### 第4步: 验证和测试
1. 测试所有服务的配置加载
2. 验证环境变量优先级
3. 确保功能正常

## 📋 **配置优先级设计**

### 加载顺序 (高到低)
1. **Docker Compose environment** - 动态覆盖
2. **.env.local** - 本地开发覆盖  
3. **.env.${ENVIRONMENT}** - 环境特定配置
4. **.env.features** - 功能配置
5. **.env.core** - 基础配置
6. **应用默认值** - 代码中的默认值

### 示例
```bash
# .env.core
DJANGO_DEBUG=0

# .env.development  
DJANGO_DEBUG=1

# .env.local (git忽略)
DJANGO_DEBUG=1
CUSTOM_SETTING=local-value

# 最终结果: DJANGO_DEBUG=1 (被开发环境配置覆盖)
```

## 🔍 **配置验证机制**

### 启动时验证
```python
# apps/core/config_validator.py
class ConfigValidator:
    REQUIRED_CORE = [
        'DJANGO_SECRET_KEY',
        'DATABASE_URL',
        'REDIS_URL',
        'MEDIA_BASE_URL',
        'MEDIA_INTERNAL_URL'
    ]
    
    REQUIRED_FEATURES = [
        'OPENSEARCH_URL',
        'MINIO_ENDPOINT'
    ]
    
    @classmethod
    def validate_startup_config(cls):
        missing_core = cls._check_required(cls.REQUIRED_CORE)
        missing_features = cls._check_required(cls.REQUIRED_FEATURES)
        
        if missing_core:
            raise ConfigError(f"Missing core config: {missing_core}")
        if missing_features:
            logger.warning(f"Missing feature config: {missing_features}")
```

## 📚 **配置文档化**

### 自动生成配置文档
```python
# scripts/generate_config_docs.py
def generate_config_documentation():
    """
    扫描所有环境变量文件，生成配置文档
    """
    config_docs = {
        'DJANGO_SECRET_KEY': {
            'description': 'Django应用密钥',
            'type': 'string',
            'required': True,
            'category': 'core'
        },
        'MEDIA_BASE_URL': {
            'description': '媒体文件外部访问地址',
            'type': 'url', 
            'required': True,
            'category': 'core',
            'example': 'http://localhost:8000'
        }
    }
```

## 🎉 **预期效果**

### 配置数量优化
```bash
# 当前状态
总配置项: ~114个
文件数量: 6个
管理复杂度: 高

# 改进后
核心配置: ~20个
功能配置: ~15个  
环境配置: ~10个
总计: ~45个 (减少60%)
文件数量: 7个 (结构化)
管理复杂度: 低
```

### 维护效率提升
- ✅ **配置查找**: 按分类快速定位
- ✅ **环境部署**: 只需替换环境特定文件
- ✅ **问题排查**: 清晰的配置优先级
- ✅ **团队协作**: 统一的配置规范

---

**这个方案将彻底解决当前环境变量管理混乱的问题，建立科学、统一、可维护的配置体系！**
