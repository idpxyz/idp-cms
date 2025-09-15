"""
存储监控 Celery 任务
用于在 Docker Compose 环境中定期执行存储监控
"""
import logging
from celery import shared_task
from apps.core.monitoring.storage_monitor import storage_monitor

logger = logging.getLogger(__name__)


@shared_task(bind=True, name='storage.health_check')
def storage_health_check_task(self):
    """
    存储健康检查任务
    
    定期执行存储健康检查并缓存结果
    """
    try:
        logger.info("开始执行存储健康检查任务")
        
        # 执行健康检查
        health_status = storage_monitor.check_health()
        
        # 缓存指标
        if 'metrics' in health_status:
            storage_monitor.cache_metrics(health_status['metrics'])
        
        # 如果状态不正常，发送告警
        if health_status['overall_status'] != 'healthy':
            storage_monitor.send_alert_notification(health_status)
            logger.warning(f"存储健康检查发现问题: {health_status['overall_status']}")
        else:
            logger.info("存储健康检查正常")
        
        return {
            'status': 'success',
            'overall_status': health_status['overall_status'],
            'timestamp': health_status['timestamp'],
            'alerts_count': len(health_status.get('alerts', []))
        }
        
    except Exception as e:
        logger.error(f"存储健康检查任务失败: {e}")
        # 重试任务，最多重试3次
        if self.request.retries < 3:
            logger.info(f"重试存储健康检查任务 (第 {self.request.retries + 1} 次)")
            raise self.retry(countdown=60, max_retries=3)
        
        return {
            'status': 'error',
            'error': str(e),
            'retries': self.request.retries
        }


@shared_task(bind=True, name='storage.collect_metrics')
def storage_collect_metrics_task(self):
    """
    存储指标收集任务
    
    定期收集存储指标并缓存
    """
    try:
        logger.info("开始执行存储指标收集任务")
        
        # 收集指标
        metrics = storage_monitor._collect_storage_metrics()
        
        # 缓存指标
        storage_monitor.cache_metrics(metrics)
        
        # 统计指标
        total_objects = 0
        total_size_mb = 0
        
        for bucket_metrics in metrics.values():
            if 'error' not in bucket_metrics:
                total_objects += bucket_metrics.get('objects_count', 0)
                total_size_mb += bucket_metrics.get('total_size_mb', 0)
        
        logger.info(f"指标收集完成: {total_objects} 个对象, {total_size_mb:.2f} MB")
        
        return {
            'status': 'success',
            'total_objects': total_objects,
            'total_size_mb': total_size_mb,
            'buckets_checked': len(metrics)
        }
        
    except Exception as e:
        logger.error(f"存储指标收集任务失败: {e}")
        
        # 重试任务
        if self.request.retries < 2:
            logger.info(f"重试存储指标收集任务 (第 {self.request.retries + 1} 次)")
            raise self.retry(countdown=30, max_retries=2)
        
        return {
            'status': 'error',
            'error': str(e),
            'retries': self.request.retries
        }


@shared_task(bind=True, name='storage.full_monitoring')
def storage_full_monitoring_task(self):
    """
    完整存储监控任务
    
    执行完整的监控周期，包括健康检查、指标收集和告警
    """
    try:
        logger.info("开始执行完整存储监控任务")
        
        # 运行完整监控周期
        health_status = storage_monitor.run_monitoring_cycle()
        
        # 记录监控结果
        status = health_status['overall_status']
        alerts_count = len(health_status.get('alerts', []))
        
        if status == 'healthy':
            logger.info("完整存储监控正常")
        elif status == 'warning':
            logger.warning(f"存储监控发现警告: {alerts_count} 个告警")
        else:
            logger.error(f"存储监控发现严重问题: {alerts_count} 个告警")
        
        return {
            'status': 'success',
            'overall_status': status,
            'alerts_count': alerts_count,
            'timestamp': health_status['timestamp']
        }
        
    except Exception as e:
        logger.error(f"完整存储监控任务失败: {e}")
        
        # 重试任务
        if self.request.retries < 2:
            logger.info(f"重试完整存储监控任务 (第 {self.request.retries + 1} 次)")
            raise self.retry(countdown=120, max_retries=2)
        
        return {
            'status': 'error',
            'error': str(e),
            'retries': self.request.retries
        }


@shared_task(name='storage.cleanup_old_metrics')
def storage_cleanup_old_metrics_task():
    """
    清理旧的监控数据任务
    
    清理过期的缓存数据和临时文件
    """
    try:
        logger.info("开始执行存储监控数据清理任务")
        
        # 这里可以添加清理逻辑
        # 例如：清理过期的缓存键、清理临时监控文件等
        
        # 目前只是记录日志
        logger.info("存储监控数据清理完成")
        
        return {
            'status': 'success',
            'message': '清理任务完成'
        }
        
    except Exception as e:
        logger.error(f"存储监控数据清理任务失败: {e}")
        return {
            'status': 'error',
            'error': str(e)
        }
