"""
媒体路径配置管理命令
用于配置和测试媒体路径的租户设置
"""
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from apps.core.media_paths import build_media_path
from wagtail.models import Site
from wagtail.models import Collection


class Command(BaseCommand):
    help = '配置和测试媒体路径的租户设置'

    def add_arguments(self, parser):
        parser.add_argument(
            '--action',
            type=str,
            choices=['show', 'test', 'demo'],
            default='show',
            help='操作: show(显示当前配置), test(测试路径生成), demo(演示不同配置)'
        )
        parser.add_argument(
            '--use-tenant',
            type=str,
            choices=['true', 'false'],
            help='是否使用租户标识 (true/false)'
        )
        parser.add_argument(
            '--tenant-name',
            type=str,
            help='租户名称'
        )

    def handle(self, *args, **options):
        action = options['action']
        
        if action == 'show':
            self.show_current_config()
        elif action == 'test':
            self.test_path_generation()
        elif action == 'demo':
            self.demo_configurations()

    def show_current_config(self):
        """显示当前配置"""
        self.stdout.write(self.style.SUCCESS('📋 当前媒体路径配置:'))
        
        use_tenant = getattr(settings, 'MEDIA_USE_TENANT', True)
        tenant_name = getattr(settings, 'MEDIA_TENANT_NAME', 'aivoya')
        
        self.stdout.write(f'  🏢 使用租户标识: {use_tenant}')
        self.stdout.write(f'  🏷️  租户名称: {tenant_name}')
        
        # 显示路径示例
        if use_tenant:
            example_path = f"{tenant_name}/portal/default/2025/09/originals/hash.png"
        else:
            example_path = "portal/default/2025/09/originals/hash.png"
        
        self.stdout.write(f'  📁 路径示例: {example_path}')
        
        self.stdout.write('\n💡 修改配置:')
        self.stdout.write('  在 config/settings/base.py 中修改:')
        self.stdout.write(f'  MEDIA_USE_TENANT = {use_tenant}')
        self.stdout.write(f'  MEDIA_TENANT_NAME = "{tenant_name}"')

    def test_path_generation(self):
        """测试路径生成"""
        self.stdout.write(self.style.SUCCESS('🧪 测试路径生成:'))
        
        # 创建测试实例
        class TestInstance:
            def __init__(self):
                self.collection = None
                self.site = None
                self.file_category = 'other'
        
        test_instance = TestInstance()
        
        # 获取第一个站点和集合
        site = Site.objects.first()
        collection = Collection.objects.first()
        
        if site:
            test_instance.site = site
            self.stdout.write(f'  🏢 测试站点: {site.hostname} ({getattr(site, "slug", "unknown")})')
        
        if collection:
            test_instance.collection = collection
            self.stdout.write(f'  📁 测试集合: {collection.name}')
        
        # 生成路径
        test_filename = "test_image.png"
        generated_path = build_media_path(test_instance, test_filename)
        
        self.stdout.write(f'\n📄 生成的路径: {generated_path}')
        
        # 分析路径结构
        parts = generated_path.split('/')
        self.stdout.write(f'\n🔍 路径结构分析 ({len(parts)} 层):')
        
        if len(parts) >= 6:
            if getattr(settings, 'MEDIA_USE_TENANT', True):
                self.stdout.write(f'  1️⃣  租户: {parts[0]}')
                self.stdout.write(f'  2️⃣  站点: {parts[1]}')
                self.stdout.write(f'  3️⃣  集合: {parts[2]}')
                self.stdout.write(f'  4️⃣  年份: {parts[3]}')
                self.stdout.write(f'  5️⃣  月份: {parts[4]}')
                self.stdout.write(f'  6️⃣  类别: {parts[5]}')
                if len(parts) > 6:
                    self.stdout.write(f'  7️⃣  文件: {parts[6]}')
            else:
                self.stdout.write(f'  1️⃣  站点: {parts[0]}')
                self.stdout.write(f'  2️⃣  集合: {parts[1]}')
                self.stdout.write(f'  3️⃣  年份: {parts[2]}')
                self.stdout.write(f'  4️⃣  月份: {parts[3]}')
                self.stdout.write(f'  5️⃣  类别: {parts[4]}')
                if len(parts) > 5:
                    self.stdout.write(f'  6️⃣  文件: {parts[5]}')

    def demo_configurations(self):
        """演示不同配置的效果"""
        self.stdout.write(self.style.SUCCESS('🎭 配置效果演示:'))
        
        # 创建测试实例
        class TestInstance:
            def __init__(self):
                self.collection = None
                self.site = None
                self.file_category = 'originals'
        
        test_instance = TestInstance()
        test_filename = "demo_image.jpg"
        
        # 获取站点
        site = Site.objects.first()
        if site:
            test_instance.site = site
        
        # 获取集合
        collection = Collection.objects.first()
        if collection:
            test_instance.collection = collection
        
        self.stdout.write('\n📁 不同配置下的路径对比:')
        
        # 保存原始配置
        original_use_tenant = getattr(settings, 'MEDIA_USE_TENANT', True)
        original_tenant_name = getattr(settings, 'MEDIA_TENANT_NAME', 'aivoya')
        
        # 演示1: 使用租户 (当前配置)
        settings.MEDIA_USE_TENANT = True
        settings.MEDIA_TENANT_NAME = 'aivoya'
        path1 = build_media_path(test_instance, test_filename)
        self.stdout.write(f'  ✅ 使用租户 "aivoya": {path1}')
        
        # 演示2: 不使用租户
        settings.MEDIA_USE_TENANT = False
        path2 = build_media_path(test_instance, test_filename)
        self.stdout.write(f'  ❌ 不使用租户: {path2}')
        
        # 演示3: 使用不同租户名
        settings.MEDIA_USE_TENANT = True
        settings.MEDIA_TENANT_NAME = 'mycompany'
        path3 = build_media_path(test_instance, test_filename)
        self.stdout.write(f'  🏢 使用租户 "mycompany": {path3}')
        
        # 恢复原始配置
        settings.MEDIA_USE_TENANT = original_use_tenant
        settings.MEDIA_TENANT_NAME = original_tenant_name
        
        self.stdout.write('\n💡 配置建议:')
        self.stdout.write('  🏢 多租户环境: MEDIA_USE_TENANT = True')
        self.stdout.write('  🏠 单租户环境: MEDIA_USE_TENANT = False')
        self.stdout.write('  📁 路径简化: 可以移除租户层级减少路径深度')
        self.stdout.write('  🔧 修改配置后需要重启应用生效')
