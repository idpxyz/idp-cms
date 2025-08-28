# 文章编辑时的索引更新功能

## 概述

本项目实现了完整的文章索引更新机制，确保在Wagtail后台编辑文章时，OpenSearch索引能够及时更新，保持搜索结果的实时性。

## 功能特性

### 1. 自动索引更新
- **发布时更新**: 文章发布时自动创建/更新索引
- **取消发布时删除**: 文章取消发布时自动从索引中删除
- **编辑时更新**: 已发布文章编辑后自动更新索引
- **草稿状态保护**: 草稿状态的文章不会触发索引更新

### 2. 信号处理机制
使用Django和Wagtail的信号系统，确保在各种情况下都能正确触发索引更新：

```python
# 文章发布信号
@receiver(page_published)
def on_publish(sender, **kwargs):
    # 发布时更新索引

# 文章取消发布信号  
@receiver(page_unpublished)
def on_unpublish(sender, **kwargs):
    # 取消发布时删除索引

# 文章保存信号
@receiver(page_saved)
def on_save(sender, **kwargs):
    # 保存时更新索引（仅限已发布文章）

# Django post_save信号（备用方案）
@receiver(post_save, sender=ArticlePage)
def on_article_save(sender, instance, created, **kwargs):
    # 确保在文章保存后触发索引更新
```

### 3. 异步处理
所有索引操作都通过Celery异步处理，避免阻塞用户界面：

```python
@shared_task(autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def upsert_article_doc(page_id: int):
    # 异步更新文章索引，支持重试机制
```

## 技术实现

### 信号处理器位置
- 文件: `apps/news/signals.py`
- 自动加载: 通过Django的`INSTALLED_APPS`自动发现

### 索引任务
- 文件: `apps/searchapp/tasks.py`
- 功能: 文章索引的创建、更新、删除

### 索引器
- 文件: `apps/searchapp/indexer.py`
- 功能: 将Wagtail页面转换为OpenSearch文档

## 使用方法

### 1. 启动服务
```bash
# 启动所有服务
docker compose -f infra/local/docker-compose.yaml up -d

# 启动Celery工作进程
docker compose -f infra/local/docker-compose.yaml exec authoring python authoring/manage.py run_celery_worker

# 启动Celery定时任务
docker compose -f infra/local/docker-compose.yaml exec authoring python authoring/manage.py run_celery_beat
```

### 2. 初始化索引
```bash
# 为指定站点创建索引和别名
docker compose -f infra/local/docker-compose.yaml exec authoring \
  python authoring/manage.py os_alias_bootstrap --site site-a.local --ver 1
```

### 3. 测试功能
```bash
# 运行测试脚本
python scripts/test_indexing.py
```

## 工作流程

### 文章编辑流程
1. 用户在Wagtail后台编辑文章
2. 保存文章时触发`page_saved`信号
3. 信号处理器检查文章状态（是否已发布）
4. 如果文章已发布，触发异步索引更新任务
5. Celery工作进程执行索引更新
6. OpenSearch索引得到更新

### 索引更新流程
1. 获取文章数据
2. 转换为OpenSearch文档格式
3. 更新OpenSearch索引
4. 支持重试机制（最多3次）

## 配置选项

### Celery配置
```python
CELERY_BROKER_URL = "redis://redis:6379/1"
CELERY_RESULT_BACKEND = "redis://redis:6379/1"
```

### OpenSearch配置
```python
OPENSEARCH = {
    "URL": "http://opensearch:9200",
    "USERNAME": "admin",
    "PASSWORD": "OpenSearch2024!@#$%",
}
```

### 定时任务
```python
CELERY_BEAT_SCHEDULE = {
    "update-ctr-features-every-minute": {
        "task": "apps.searchapp.metrics.update_ctr_features",
        "schedule": timedelta(minutes=1),
    }
}
```

## 监控和调试

### 1. 查看Celery任务状态
```bash
# 查看Celery工作进程
docker compose -f infra/local/docker-compose.yaml exec authoring celery -A authoring inspect active

# 查看任务队列
docker compose -f infra/local/docker-compose.yaml exec authoring celery -A authoring inspect stats
```

### 2. 查看OpenSearch索引
```bash
# 访问OpenSearch Dashboard
http://localhost:5601

# 或者直接查询API
curl -u admin:OpenSearch2024!@#$% "http://localhost:9200/_cat/indices?v"
```

### 3. 查看日志
```bash
# 查看作者服务日志
docker compose -f infra/local/docker-compose.yaml logs authoring

# 查看Celery日志
docker compose -f infra/local/docker-compose.yaml logs celery
```

## 故障排除

### 常见问题

1. **索引更新失败**
   - 检查Celery工作进程是否运行
   - 检查OpenSearch连接是否正常
   - 查看Celery任务日志

2. **信号不触发**
   - 确认`apps/news/signals.py`已正确导入
   - 检查Django应用是否正确注册
   - 重启Django服务

3. **OpenSearch连接问题**
   - 检查OpenSearch服务状态
   - 验证认证信息
   - 检查网络连接

### 调试技巧

1. **启用Django调试模式**
   ```python
   DEBUG = True
   LOGGING = {
       'version': 1,
       'disable_existing_loggers': False,
       'handlers': {
           'console': {
               'class': 'logging.StreamHandler',
           },
       },
       'loggers': {
           'apps.news.signals': {
               'handlers': ['console'],
               'level': 'DEBUG',
           },
       },
   }
   ```

2. **手动触发索引更新**
   ```bash
   # 手动更新指定文章的索引
   docker compose -f infra/local/docker-compose.yaml exec authoring \
     python authoring/manage.py shell
   
   # 在Django shell中执行
   from apps.searchapp.tasks import upsert_article_doc
   upsert_article_doc.delay(article_id)
   ```

## 性能优化建议

1. **批量更新**: 对于大量文章更新，考虑使用批量索引操作
2. **索引分片**: 根据数据量调整OpenSearch索引分片数量
3. **缓存策略**: 使用Redis缓存减少重复的索引操作
4. **异步处理**: 确保所有索引操作都是异步的，不阻塞用户界面

## 总结

通过实现文章编辑时的自动索引更新，我们确保了：

- ✅ 搜索结果的实时性
- ✅ 用户体验的流畅性  
- ✅ 系统架构的健壮性
- ✅ 运维监控的便利性

这个功能为整个推荐系统提供了坚实的数据基础，确保用户能够搜索到最新、最准确的内容。 