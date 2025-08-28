# 第二阶段数据模型升级 - 回滚方案

## 概述

本文档详细说明了第二阶段数据模型升级的回滚方案，包括备份策略、回滚步骤和应急处理。

## 备份策略

### 1. 自动备份

在应用迁移之前，系统会自动创建以下备份：

- **数据库完整备份**: PostgreSQL 数据库的完整 SQL 备份
- **模型配置备份**: 新增字段和索引的配置信息
- **迁移文件备份**: 所有相关迁移文件的列表

### 2. 备份位置

```
backups/
└── YYYYMMDD_HHMMSS/
    ├── database.sql          # 数据库备份
    ├── model_config.json     # 模型配置
    └── backup_info.txt       # 备份信息
```

## 回滚方案

### 方案 1: 迁移回滚（推荐）

如果问题出现在迁移过程中，使用 Django 的迁移回滚功能：

```bash
# 回滚到0002版本
docker exec local-authoring-1 python manage.py migrate news 0002

# 或者回滚到0001版本（完全回滚）
docker exec local-authoring-1 python manage.py migrate news 0001
```

### 方案 2: 数据库恢复

如果迁移回滚失败，使用数据库备份恢复：

```bash
# 恢复数据库
docker exec -i local-postgres-1 psql -U news -d news < backups/YYYYMMDD_HHMMSS/database.sql
```

### 方案 3: 手动回滚

如果自动回滚都失败，手动执行以下 SQL：

```sql
-- 删除新增的索引
DROP INDEX IF EXISTS art_pub_chan_reg_opt;
DROP INDEX IF EXISTS art_feat_weight_pub_opt;
DROP INDEX IF EXISTS art_pub_chan_reg;
DROP INDEX IF EXISTS art_feat_weight_pub;
DROP INDEX IF EXISTS art_lang_region;
DROP INDEX IF EXISTS art_video_feat;

-- 删除新增的字段
ALTER TABLE news_articlepage DROP COLUMN IF EXISTS canonical_url;
ALTER TABLE news_articlepage DROP COLUMN IF EXISTS allow_aggregate;
ALTER TABLE news_articlepage DROP COLUMN IF EXISTS is_featured;
ALTER TABLE news_articlepage DROP COLUMN IF EXISTS weight;
ALTER TABLE news_articlepage DROP COLUMN IF EXISTS source_site_id;
ALTER TABLE news_articlepage DROP COLUMN IF EXISTS publish_at;
ALTER TABLE news_articlepage DROP COLUMN IF EXISTS updated_at;

-- 恢复原有字段
ALTER TABLE news_articlepage ADD COLUMN IF NOT EXISTS introduction TEXT;
ALTER TABLE news_articlepage ADD COLUMN IF NOT EXISTS channel_slug VARCHAR(255);
ALTER TABLE news_articlepage ADD COLUMN IF NOT EXISTS region VARCHAR(255);
```

## 回滚脚本

### 使用备份和回滚脚本

```bash
# 1. 创建备份
python scripts/backup_and_rollback.py backup

# 2. 回滚迁移
python scripts/backup_and_rollback.py rollback

# 3. 恢复数据库（如果需要）
python scripts/backup_and_rollback.py restore backups/YYYYMMDD_HHMMSS/database.sql
```

## 应急处理流程

### 1. 问题识别

- 监控系统日志
- 检查 API 响应
- 验证数据库连接

### 2. 影响评估

- 评估影响范围
- 确定回滚优先级
- 通知相关团队

### 3. 执行回滚

- 停止相关服务
- 执行回滚操作
- 验证系统状态

### 4. 恢复服务

- 重启服务
- 功能测试
- 性能验证

## 风险控制

### 1. 回滚前检查

- [ ] 确认备份完整性
- [ ] 验证回滚脚本
- [ ] 准备回滚环境

### 2. 回滚中监控

- [ ] 监控数据库状态
- [ ] 检查服务健康
- [ ] 记录操作日志

### 3. 回滚后验证

- [ ] 功能完整性测试
- [ ] 性能基准测试
- [ ] 数据一致性检查

## 联系信息

### 技术支持

- **DBA 团队**: 数据库相关问题
- **开发团队**: 代码和迁移问题
- **运维团队**: 部署和回滚问题

### 紧急联系方式

- **值班电话**: [待补充]
- **紧急邮箱**: [待补充]
- **技术群**: [待补充]

## 附录

### A. 迁移文件列表

- `0002_align_article_model_with_design.py` - 主要模型升级
- `0003_add_optimization_indexes.py` - 优化索引添加

### B. 新增字段详情

- `canonical_url`: URLField, 规范链接
- `allow_aggregate`: BooleanField, 允许聚合
- `is_featured`: BooleanField, 置顶推荐
- `weight`: IntegerField, 权重排序
- `source_site`: ForeignKey, 来源站点
- `publish_at`: DateTimeField, 发布时间
- `updated_at`: DateTimeField, 更新时间

### C. 新增索引详情

- `art_pub_chan_reg`: (publish_at, channel, region)
- `art_feat_weight_pub`: (is_featured, weight, publish_at)
- `art_lang_region`: (language, region)
- `art_video_feat`: (has_video, is_featured)
- `art_pub_chan_reg_opt`: (publish_at, channel, region) - 优化版本
- `art_feat_weight_pub_opt`: (is_featured, weight, publish_at) - 优化版本
