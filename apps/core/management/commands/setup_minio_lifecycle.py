"""
设置MinIO生命周期管理规则
"""
import json
import os
from django.core.management.base import BaseCommand
from django.conf import settings
import boto3
from botocore.exceptions import ClientError


class Command(BaseCommand):
    help = '设置MinIO桶的生命周期管理规则'

    def add_arguments(self, parser):
        parser.add_argument(
            '--bucket',
            type=str,
            choices=['public', 'private', 'all'],
            default='all',
            help='指定要配置的桶 (public, private, all)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='显示将要执行的操作但不实际执行',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        target_bucket = options.get('bucket', 'all')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('🔍 DRY RUN 模式 - 仅显示操作，不会实际执行'))
        
        self.stdout.write(self.style.SUCCESS('=== MinIO 生命周期规则配置开始 ==='))
        
        # 桶配置
        bucket_configs = {}
        
        if target_bucket in ['public', 'all']:
            bucket_configs['idp-media-prod-public'] = {
                'config_file': 'infra/minio/lifecycle-public.json',
                'description': '公共桶生命周期规则'
            }
        
        if target_bucket in ['private', 'all']:
            bucket_configs['idp-media-prod-private'] = {
                'config_file': 'infra/minio/lifecycle-private.json', 
                'description': '私有桶生命周期规则'
            }
        
        # 创建S3客户端
        try:
            s3_client = self._get_s3_client()
            self.stdout.write('✅ S3客户端连接成功')
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ S3客户端连接失败: {e}')
            )
            return
        
        # 处理每个桶
        for bucket_name, config in bucket_configs.items():
            self.stdout.write(f'\n🔄 处理桶: {bucket_name}')
            
            # 检查桶是否存在
            if not self._bucket_exists(s3_client, bucket_name):
                self.stdout.write(
                    self.style.WARNING(f'⚠️  桶不存在: {bucket_name}')
                )
                continue
            
            # 读取生命周期配置
            try:
                lifecycle_config = self._load_lifecycle_config(config['config_file'])
                self.stdout.write(f'📋 加载配置文件: {config["config_file"]}')
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'❌ 加载配置文件失败: {e}')
                )
                continue
            
            if dry_run:
                self.stdout.write(f'📋 将应用生命周期规则:')
                for rule in lifecycle_config.get('Rules', []):
                    self.stdout.write(f'   - {rule["ID"]}: {rule.get("Expiration", {}).get("Days", "N/A")} 天')
            else:
                # 应用生命周期规则
                try:
                    self._apply_lifecycle_config(s3_client, bucket_name, lifecycle_config)
                    self.stdout.write(f'✅ 生命周期规则应用成功')
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'❌ 应用生命周期规则失败: {e}')
                    )
                    continue
        
        if not dry_run:
            self.stdout.write(f'\n🎉 生命周期规则配置完成!')
        else:
            self.stdout.write(f'\n💡 使用 --dry-run=false 执行实际操作')
    
    def _get_s3_client(self):
        """获取S3客户端"""
        return boto3.client(
            's3',
            endpoint_url=os.getenv('MINIO_ENDPOINT', 'http://minio:9000'),
            aws_access_key_id=os.getenv('MINIO_ACCESS_KEY', 'minioadmin'),
            aws_secret_access_key=os.getenv('MINIO_SECRET_KEY', 'minioadmin'),
            region_name='us-east-1'
        )
    
    def _bucket_exists(self, s3_client, bucket_name):
        """检查桶是否存在"""
        try:
            s3_client.head_bucket(Bucket=bucket_name)
            return True
        except ClientError:
            return False
    
    def _load_lifecycle_config(self, config_file):
        """加载生命周期配置文件"""
        config_path = os.path.join(settings.BASE_DIR, config_file)
        
        if not os.path.exists(config_path):
            raise FileNotFoundError(f'配置文件不存在: {config_path}')
        
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _apply_lifecycle_config(self, s3_client, bucket_name, lifecycle_config):
        """应用生命周期配置"""
        try:
            s3_client.put_bucket_lifecycle_configuration(
                Bucket=bucket_name,
                LifecycleConfiguration=lifecycle_config
            )
        except ClientError as e:
            if 'NotImplemented' in str(e):
                self.stdout.write(
                    self.style.WARNING(
                        f'⚠️  MinIO可能不支持所有生命周期功能，但配置已尝试应用'
                    )
                )
            else:
                raise
