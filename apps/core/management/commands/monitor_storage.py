"""
存储监控管理命令
用于在 Docker Compose 环境中运行存储监控和健康检查
"""
import json
from django.core.management.base import BaseCommand, CommandError
from apps.core.monitoring.storage_monitor import storage_monitor


class Command(BaseCommand):
    help = '存储监控和健康检查命令'

    def add_arguments(self, parser):
        parser.add_argument(
            '--mode',
            type=str,
            choices=['health-check', 'metrics', 'monitor', 'test-alerts'],
            default='health-check',
            help='监控模式: health-check(健康检查), metrics(指标收集), monitor(完整监控), test-alerts(测试告警)'
        )
        parser.add_argument(
            '--output-format',
            type=str,
            choices=['json', 'text'],
            default='text',
            help='输出格式: json 或 text'
        )
        parser.add_argument(
            '--send-alerts',
            action='store_true',
            help='发送告警通知'
        )
        parser.add_argument(
            '--cache-metrics',
            action='store_true',
            help='缓存指标数据'
        )

    def handle(self, *args, **options):
        mode = options['mode']
        output_format = options['output_format']
        send_alerts = options['send_alerts']
        cache_metrics = options['cache_metrics']

        self.stdout.write(
            self.style.SUCCESS(f'🚀 开始存储监控 - 模式: {mode}')
        )

        try:
            if mode == 'health-check':
                self.run_health_check(output_format, send_alerts, cache_metrics)
            elif mode == 'metrics':
                self.collect_metrics(output_format, cache_metrics)
            elif mode == 'monitor':
                self.run_full_monitoring(output_format)
            elif mode == 'test-alerts':
                self.test_alert_system()
            
            self.stdout.write(
                self.style.SUCCESS('✅ 存储监控完成')
            )
        except Exception as e:
            raise CommandError(f'监控执行失败: {str(e)}')

    def run_health_check(self, output_format, send_alerts, cache_metrics):
        """运行健康检查"""
        self.stdout.write('🏥 执行存储健康检查...')
        
        health_status = storage_monitor.check_health()
        
        if cache_metrics and 'metrics' in health_status:
            storage_monitor.cache_metrics(health_status['metrics'])
            self.stdout.write('💾 指标已缓存')
        
        if send_alerts and health_status['overall_status'] != 'healthy':
            success = storage_monitor.send_alert_notification(health_status)
            if success:
                self.stdout.write('📧 告警通知已发送')
            else:
                self.stdout.write(self.style.WARNING('⚠️  告警通知发送失败'))
        
        self.output_health_status(health_status, output_format)

    def collect_metrics(self, output_format, cache_metrics):
        """收集存储指标"""
        self.stdout.write('📊 收集存储指标...')
        
        metrics = storage_monitor._collect_storage_metrics()
        
        if cache_metrics:
            storage_monitor.cache_metrics(metrics)
            self.stdout.write('💾 指标已缓存')
        
        if output_format == 'json':
            self.stdout.write(json.dumps(metrics, indent=2, ensure_ascii=False))
        else:
            self.output_metrics_text(metrics)

    def run_full_monitoring(self, output_format):
        """运行完整监控周期"""
        self.stdout.write('🔄 运行完整监控周期...')
        
        health_status = storage_monitor.run_monitoring_cycle()
        self.output_health_status(health_status, output_format)

    def test_alert_system(self):
        """测试告警系统"""
        self.stdout.write('🧪 测试告警系统...')
        
        # 创建测试告警
        test_health_status = {
            'timestamp': '2024-01-01T12:00:00Z',
            'overall_status': 'warning',
            'checks': {
                'test': {
                    'status': 'passed',
                    'message': '这是一个测试检查'
                }
            },
            'metrics': {},
            'alerts': [{
                'level': 'warning',
                'bucket': 'test-bucket',
                'type': 'test_alert',
                'message': '这是一个测试告警',
                'timestamp': '2024-01-01T12:00:00Z'
            }]
        }
        
        success = storage_monitor.send_alert_notification(test_health_status)
        if success:
            self.stdout.write('✅ 测试告警发送成功')
        else:
            self.stdout.write(self.style.ERROR('❌ 测试告警发送失败'))

    def output_health_status(self, health_status, output_format):
        """输出健康状态"""
        if output_format == 'json':
            self.stdout.write(json.dumps(health_status, indent=2, ensure_ascii=False))
        else:
            self.output_health_status_text(health_status)

    def output_health_status_text(self, health_status):
        """以文本格式输出健康状态"""
        status = health_status['overall_status']
        timestamp = health_status['timestamp']
        
        # 状态图标
        status_icons = {
            'healthy': '✅',
            'warning': '⚠️',
            'critical': '❌'
        }
        
        icon = status_icons.get(status, '❓')
        
        self.stdout.write(f'\n{icon} 总体状态: {status.upper()}')
        self.stdout.write(f'🕐 检查时间: {timestamp}')
        
        # 输出检查结果
        if 'checks' in health_status:
            self.stdout.write('\n📋 检查结果:')
            for check_name, check_result in health_status['checks'].items():
                if isinstance(check_result, dict):
                    if 'status' in check_result:
                        check_icon = '✅' if check_result['status'] == 'passed' else '❌'
                        message = check_result.get('message', '')
                        self.stdout.write(f'  {check_icon} {check_name}: {message}')
                        
                        # 显示响应时间
                        if 'response_time_ms' in check_result:
                            self.stdout.write(f'    🕐 响应时间: {check_result["response_time_ms"]}ms')
                    else:
                        # 嵌套检查结果（如 buckets）
                        self.stdout.write(f'  📁 {check_name}:')
                        for sub_name, sub_result in check_result.items():
                            if isinstance(sub_result, dict) and 'status' in sub_result:
                                sub_icon = '✅' if sub_result['status'] == 'passed' else '❌'
                                sub_message = sub_result.get('message', '')
                                self.stdout.write(f'    {sub_icon} {sub_name}: {sub_message}')
                                if 'response_time_ms' in sub_result:
                                    self.stdout.write(f'      🕐 响应时间: {sub_result["response_time_ms"]}ms')
        
        # 输出指标
        if 'metrics' in health_status:
            self.stdout.write('\n📊 存储指标:')
            self.output_metrics_text(health_status['metrics'])
        
        # 输出告警
        if 'alerts' in health_status and health_status['alerts']:
            self.stdout.write('\n🚨 告警信息:')
            for alert in health_status['alerts']:
                level_icons = {'warning': '⚠️', 'critical': '❌'}
                alert_icon = level_icons.get(alert.get('level'), '📢')
                bucket = alert.get('bucket', '')
                message = alert.get('message', '')
                self.stdout.write(f'  {alert_icon} [{alert.get("level", "unknown")}] {bucket}: {message}')

    def output_metrics_text(self, metrics):
        """以文本格式输出指标"""
        for bucket_name, bucket_metrics in metrics.items():
            if 'error' in bucket_metrics:
                self.stdout.write(f'  ❌ {bucket_name}: {bucket_metrics["error"]}')
            else:
                self.stdout.write(f'  📦 {bucket_name}:')
                self.stdout.write(f'    📄 对象数量: {bucket_metrics.get("objects_count", 0):,}')
                self.stdout.write(f'    💾 总大小: {bucket_metrics.get("total_size_mb", 0):,.2f} MB')
                self.stdout.write(f'    📈 使用率: {bucket_metrics.get("usage_percent", 0):.2f}%')
                self.stdout.write(f'    🕐 更新时间: {bucket_metrics.get("last_updated", "未知")}')
