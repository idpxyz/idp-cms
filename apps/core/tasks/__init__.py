# Core tasks module

# 导入数据同步和行为分析任务
from .data_sync import (
    batch_sync_article_weights,
    sync_articles_to_opensearch_batch,
    update_trending_articles_cache,
    comprehensive_data_consistency_check,
    cleanup_old_behavior_data,
    generate_user_behavior_insights,
)

# 导入存储监控任务
from .storage_monitoring import (
    storage_health_check_task,
    storage_collect_metrics_task,
    storage_full_monitoring_task,
    storage_cleanup_old_metrics_task,
)

# 导入媒体处理任务
from .media_tasks import (
    generate_remaining_renditions,
    batch_generate_missing_renditions,
    cleanup_orphaned_renditions,
    generate_specific_renditions_for_images,
    migrate_image_files_on_collection_change,
    batch_migrate_collection_files,
)

__all__ = [
    'batch_sync_article_weights',
    'sync_articles_to_opensearch_batch', 
    'update_trending_articles_cache',
    'comprehensive_data_consistency_check',
    'cleanup_old_behavior_data',
    'generate_user_behavior_insights',
    'storage_health_check_task',
    'storage_collect_metrics_task',
    'storage_full_monitoring_task',
    'storage_cleanup_old_metrics_task',
    'generate_remaining_renditions',
    'batch_generate_missing_renditions',
    'cleanup_orphaned_renditions',
    'generate_specific_renditions_for_images',
    'migrate_image_files_on_collection_change',
    'batch_migrate_collection_files',
]
