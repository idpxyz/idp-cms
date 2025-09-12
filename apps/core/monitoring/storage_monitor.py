"""
存储监控和告警系统 - Docker Compose 环境

提供 MinIO 存储监控、健康检查和告警功能
适配容器化环境，支持多种告警方式
"""
import os
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail
import boto3
from botocore.exceptions import ClientError, BotoCoreError


logger = logging.getLogger(__name__)


class StorageMonitor:
    """存储监控器 - Docker Compose 环境优化版"""
    
    def __init__(self):
        """初始化监控器"""
        self.s3_client = self._get_s3_client()
        self.public_bucket = getattr(settings, 'PUBLIC_MEDIA_BUCKET', 'idp-media-prod-public')
        self.private_bucket = getattr(settings, 'PRIVATE_MEDIA_BUCKET', 'idp-media-prod-private')
        
        # 监控配置
        self.thresholds = {
            'storage_usage_percent': 80,  # 存储使用率告警阈值
            'object_count_max': 100000,   # 对象数量告警阈值
            'error_rate_percent': 5,      # 错误率告警阈值
            'response_time_ms': 1000,     # 响应时间告警阈值
        }
        
        # 缓存键前缀
        self.cache_prefix = 'storage_monitor'
        self.cache_timeout = 300  # 5分钟缓存
    
    def _get_s3_client(self):
        """获取 S3 客户端"""
        try:
            return boto3.client(
                's3',
                endpoint_url=getattr(settings, 'AWS_S3_ENDPOINT_URL', 'http://minio:9000'),
                aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', 'minioadmin'),
                aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', 'minioadmin'),
                region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1'),
            )
        except Exception as e:
            logger.error(f"无法创建 S3 客户端: {e}")
            return None
    
    def check_health(self) -> Dict[str, Any]:
        """
        存储健康检查
        
        Returns:
            dict: 健康检查结果
        """
        health_status = {
            'timestamp': datetime.utcnow().isoformat(),
            'overall_status': 'healthy',
            'checks': {},
            'metrics': {},
            'alerts': []
        }
        
        if not self.s3_client:
            health_status['overall_status'] = 'critical'
            health_status['checks']['s3_connection'] = {
                'status': 'failed',
                'message': 'S3 客户端连接失败'
            }
            return health_status
        
        try:
            # 检查存储连接
            health_status['checks']['s3_connection'] = self._check_s3_connection()
            
            # 检查桶状态
            health_status['checks']['buckets'] = self._check_buckets_status()
            
            # 收集存储指标
            health_status['metrics'] = self._collect_storage_metrics()
            
            # 生成告警
            health_status['alerts'] = self._generate_alerts(health_status['metrics'])
            
            # 确定总体状态
            health_status['overall_status'] = self._determine_overall_status(
                health_status['checks'], health_status['alerts']
            )
            
        except Exception as e:
            logger.error(f"健康检查过程出错: {e}")
            health_status['overall_status'] = 'critical'
            health_status['checks']['health_check'] = {
                'status': 'failed',
                'message': f'健康检查执行失败: {str(e)}'
            }
        
        return health_status
    
    def _check_s3_connection(self) -> Dict[str, Any]:
        """检查 S3 连接状态"""
        try:
            start_time = time.time()
            self.s3_client.list_buckets()
            response_time = (time.time() - start_time) * 1000  # 转换为毫秒
            
            return {
                'status': 'passed',
                'response_time_ms': round(response_time, 2),
                'message': 'S3 连接正常'
            }
        except Exception as e:
            return {
                'status': 'failed',
                'message': f'S3 连接失败: {str(e)}'
            }
    
    def _check_buckets_status(self) -> Dict[str, Any]:
        """检查桶状态"""
        buckets_status = {}
        
        for bucket_name in [self.public_bucket, self.private_bucket]:
            try:
                start_time = time.time()
                
                # 检查桶是否存在
                self.s3_client.head_bucket(Bucket=bucket_name)
                
                # 测试读写权限
                test_key = f'health-check/{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.txt'
                test_content = b'health check test'
                
                # 上传测试文件
                self.s3_client.put_object(
                    Bucket=bucket_name,
                    Key=test_key,
                    Body=test_content
                )
                
                # 下载测试文件
                response = self.s3_client.get_object(Bucket=bucket_name, Key=test_key)
                downloaded_content = response['Body'].read()
                
                # 删除测试文件
                self.s3_client.delete_object(Bucket=bucket_name, Key=test_key)
                
                response_time = (time.time() - start_time) * 1000
                
                if downloaded_content == test_content:
                    buckets_status[bucket_name] = {
                        'status': 'passed',
                        'response_time_ms': round(response_time, 2),
                        'message': '桶读写正常'
                    }
                else:
                    buckets_status[bucket_name] = {
                        'status': 'failed',
                        'message': '桶读写测试失败'
                    }
                
            except ClientError as e:
                error_code = e.response['Error']['Code']
                buckets_status[bucket_name] = {
                    'status': 'failed',
                    'message': f'桶操作失败: {error_code}'
                }
            except Exception as e:
                buckets_status[bucket_name] = {
                    'status': 'failed',
                    'message': f'桶检查失败: {str(e)}'
                }
        
        return buckets_status
    
    def _collect_storage_metrics(self) -> Dict[str, Any]:
        """收集存储指标"""
        metrics = {}
        
        for bucket_name in [self.public_bucket, self.private_bucket]:
            try:
                # 获取对象数量和大小
                objects_count = 0
                total_size = 0
                
                paginator = self.s3_client.get_paginator('list_objects_v2')
                for page in paginator.paginate(Bucket=bucket_name):
                    if 'Contents' in page:
                        objects_count += len(page['Contents'])
                        total_size += sum(obj['Size'] for obj in page['Contents'])
                
                # 计算存储使用率（假设最大容量）
                max_capacity = 10 * 1024 * 1024 * 1024 * 1024  # 10TB 假设容量
                usage_percent = (total_size / max_capacity) * 100 if max_capacity > 0 else 0
                
                metrics[bucket_name] = {
                    'objects_count': objects_count,
                    'total_size_bytes': total_size,
                    'total_size_mb': round(total_size / (1024 * 1024), 2),
                    'usage_percent': round(usage_percent, 2),
                    'last_updated': datetime.utcnow().isoformat()
                }
                
            except Exception as e:
                logger.error(f"收集桶 {bucket_name} 指标失败: {e}")
                metrics[bucket_name] = {
                    'error': str(e),
                    'last_updated': datetime.utcnow().isoformat()
                }
        
        return metrics
    
    def _generate_alerts(self, metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
        """根据指标生成告警"""
        alerts = []
        
        for bucket_name, bucket_metrics in metrics.items():
            if 'error' in bucket_metrics:
                alerts.append({
                    'level': 'critical',
                    'bucket': bucket_name,
                    'type': 'metrics_collection_failed',
                    'message': f'桶 {bucket_name} 指标收集失败: {bucket_metrics["error"]}',
                    'timestamp': datetime.utcnow().isoformat()
                })
                continue
            
            # 检查存储使用率
            usage_percent = bucket_metrics.get('usage_percent', 0)
            if usage_percent > self.thresholds['storage_usage_percent']:
                alerts.append({
                    'level': 'warning',
                    'bucket': bucket_name,
                    'type': 'high_storage_usage',
                    'message': f'桶 {bucket_name} 存储使用率过高: {usage_percent:.2f}%',
                    'current_value': usage_percent,
                    'threshold': self.thresholds['storage_usage_percent'],
                    'timestamp': datetime.utcnow().isoformat()
                })
            
            # 检查对象数量
            objects_count = bucket_metrics.get('objects_count', 0)
            if objects_count > self.thresholds['object_count_max']:
                alerts.append({
                    'level': 'warning',
                    'bucket': bucket_name,
                    'type': 'high_object_count',
                    'message': f'桶 {bucket_name} 对象数量过多: {objects_count}',
                    'current_value': objects_count,
                    'threshold': self.thresholds['object_count_max'],
                    'timestamp': datetime.utcnow().isoformat()
                })
        
        return alerts
    
    def _determine_overall_status(self, checks: Dict[str, Any], alerts: List[Dict[str, Any]]) -> str:
        """确定总体状态"""
        # 检查是否有失败的检查
        for check_result in checks.values():
            if isinstance(check_result, dict) and check_result.get('status') == 'failed':
                return 'critical'
            elif isinstance(check_result, dict):
                for sub_check in check_result.values():
                    if isinstance(sub_check, dict) and sub_check.get('status') == 'failed':
                        return 'critical'
        
        # 检查是否有严重告警
        critical_alerts = [alert for alert in alerts if alert.get('level') == 'critical']
        if critical_alerts:
            return 'critical'
        
        # 检查是否有警告告警
        warning_alerts = [alert for alert in alerts if alert.get('level') == 'warning']
        if warning_alerts:
            return 'warning'
        
        return 'healthy'
    
    def send_alert_notification(self, health_status: Dict[str, Any]) -> bool:
        """发送告警通知"""
        if health_status['overall_status'] == 'healthy':
            return True
        
        try:
            # 构建告警邮件内容
            subject = f"[存储告警] {health_status['overall_status'].upper()} - IDP CMS 存储系统"
            
            message_lines = [
                f"存储系统状态: {health_status['overall_status']}",
                f"检查时间: {health_status['timestamp']}",
                "",
                "=== 告警详情 ===",
            ]
            
            for alert in health_status['alerts']:
                message_lines.append(f"- [{alert['level']}] {alert['message']}")
            
            message_lines.extend([
                "",
                "=== 检查结果 ===",
            ])
            
            for check_name, check_result in health_status['checks'].items():
                if isinstance(check_result, dict):
                    status = check_result.get('status', 'unknown')
                    message = check_result.get('message', '')
                    message_lines.append(f"- {check_name}: {status} - {message}")
            
            message = '\n'.join(message_lines)
            
            # 发送邮件（如果配置了邮件）
            recipient_list = getattr(settings, 'STORAGE_ALERT_EMAILS', [])
            if recipient_list:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@aivoya.com'),
                    recipient_list=recipient_list,
                    fail_silently=False,
                )
                logger.info(f"告警邮件已发送到: {recipient_list}")
            
            # 记录到日志
            logger.warning(f"存储告警: {subject}\n{message}")
            
            return True
            
        except Exception as e:
            logger.error(f"发送告警通知失败: {e}")
            return False
    
    def get_cached_metrics(self) -> Optional[Dict[str, Any]]:
        """获取缓存的指标数据"""
        cache_key = f"{self.cache_prefix}:metrics"
        return cache.get(cache_key)
    
    def cache_metrics(self, metrics: Dict[str, Any]) -> None:
        """缓存指标数据"""
        cache_key = f"{self.cache_prefix}:metrics"
        cache.set(cache_key, metrics, self.cache_timeout)
    
    def run_monitoring_cycle(self) -> Dict[str, Any]:
        """运行一个完整的监控周期"""
        logger.info("开始存储监控周期")
        
        try:
            # 执行健康检查
            health_status = self.check_health()
            
            # 缓存指标
            if 'metrics' in health_status:
                self.cache_metrics(health_status['metrics'])
            
            # 发送告警通知
            if health_status['overall_status'] != 'healthy':
                self.send_alert_notification(health_status)
            
            logger.info(f"监控周期完成，状态: {health_status['overall_status']}")
            return health_status
            
        except Exception as e:
            logger.error(f"监控周期执行失败: {e}")
            return {
                'timestamp': datetime.utcnow().isoformat(),
                'overall_status': 'critical',
                'error': str(e)
            }


# 全局监控器实例
storage_monitor = StorageMonitor()
