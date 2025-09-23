# 媒体清理任务修复报告

## 🚨 问题描述

用户反映网站图片无法正常显示，后台图片和缩略图被误删，导致网站功能异常。

## 🔍 问题根源

经过排查发现，系统中配置了多个定时清理任务在自动删除媒体文件：

### 有问题的定时任务
1. **`cleanup-orphan-files`** - 每小时执行，清理"孤儿文件"
2. **`cleanup-temp-files`** - 每天执行，清理临时文件  
3. **`cleanup-old-renditions`** - 每天执行，清理90天前的缩略图

### 问题分析
虽然这些任务有一些安全措施，但在以下情况下可能误删正在使用的文件：
- 数据库与存储同步延迟
- 文件路径匹配逻辑存在缺陷
- 缩略图生成时机与清理时机冲突
- 新上传的图片可能被认为是"孤儿文件"

## ✅ 修复方案

### 1. 禁用有问题的定时任务

**文件**: `config/settings/base.py`

```python
# 修改前
CELERY_BEAT_SCHEDULE = {
    'cleanup-orphan-files': {
        'task': 'apps.media.tasks.cleanup_orphan_files',
        'schedule': 3600.0,  # 每小时执行一次
    },
    # ... 其他清理任务
}

# 修改后 - 注释掉有问题的任务
CELERY_BEAT_SCHEDULE = {
    # 媒体文件清理任务 - 暂时禁用以防止误删图片
    # 'cleanup-orphan-files': {
    #     'task': 'apps.media.tasks.cleanup_orphan_files',
    #     'schedule': 3600.0,  # 每小时执行一次
    # },
    # ... 其他任务也被注释
}
```

### 2. 设置环境变量双重保险

**文件**: `infra/local/.env`

```bash
# 禁用媒体清理任务防止误删图片
ENABLE_MEDIA_CLEANUP=false
ENABLE_RENDITION_CLEANUP=false
```

这些环境变量在 `apps/media/tasks.py` 中被检查：
```python
if os.getenv('ENABLE_MEDIA_CLEANUP', '1').lower() not in ('1', 'true', 'yes'):
    logger.info("媒体清理任务已通过环境变量禁用")
    return { 'success': True, 'message': 'cleanup disabled by env' }
```

## 🔧 应用修复

### 重启服务
```bash
docker compose -f infra/local/docker-compose.yaml restart authoring
```

### 验证修复
```bash
# 检查环境变量
docker compose -f infra/local/docker-compose.yaml exec authoring python manage.py shell -c "
import os
print('ENABLE_MEDIA_CLEANUP:', os.getenv('ENABLE_MEDIA_CLEANUP'))
print('ENABLE_RENDITION_CLEANUP:', os.getenv('ENABLE_RENDITION_CLEANUP'))
"

# 检查定时任务
docker compose -f infra/local/docker-compose.yaml exec authoring python manage.py shell -c "
from django.conf import settings
cleanup_tasks = [k for k in settings.CELERY_BEAT_SCHEDULE.keys() if 'cleanup' in k]
print('剩余清理任务:', cleanup_tasks)
"
```

## 📊 修复结果

### ✅ 成功禁用的任务
- ❌ `cleanup-orphan-files` - 已禁用
- ❌ `cleanup-temp-files` - 已禁用  
- ❌ `cleanup-old-renditions` - 已禁用

### ✅ 保留的安全任务
- ✅ `storage-cleanup-metrics` - 仅清理监控数据，不涉及媒体文件
- ✅ `cleanup-behavior-data` - 仅清理行为分析数据，不涉及媒体文件
- ✅ `generate-storage-stats` - 仅生成统计报告，不删除文件

### ✅ 环境变量保护
- `ENABLE_MEDIA_CLEANUP=false` - 双重保险
- `ENABLE_RENDITION_CLEANUP=false` - 双重保险

## 🎯 后续建议

### 1. 监控图片状态
定期检查网站图片显示是否正常，确保修复生效。

### 2. 重新设计清理策略
如果需要清理功能，建议：
- 增加更严格的安全检查
- 添加白名单机制
- 实现手动确认流程
- 增加详细的日志记录

### 3. 备份策略
- 定期备份MinIO存储桶
- 实现图片版本控制
- 建立恢复机制

## ⚠️ 注意事项

1. **生产环境同步**: 如果生产环境也有类似问题，需要同样的修复
2. **存储空间**: 禁用清理后，存储使用量可能增长，需要监控
3. **手动清理**: 如有需要，可以手动执行清理命令（谨慎操作）

## 📝 修复时间

- **发现问题**: 2025-09-22
- **定位根源**: 2025-09-22  
- **应用修复**: 2025-09-22
- **验证成功**: 2025-09-22

---

**修复状态**: ✅ 已完成  
**影响范围**: 所有媒体文件保护  
**风险等级**: 🟢 低风险（仅禁用清理功能）
