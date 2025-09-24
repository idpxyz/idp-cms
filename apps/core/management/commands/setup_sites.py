"""
设置和管理多站点配置的管理命令
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from wagtail.models import Site, Page
from apps.core.site_utils import get_available_sites
from apps.searchapp.simple_index import ensure_index  # 🎯 使用简化索引
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = '设置和管理多站点配置'

    def add_arguments(self, parser):
        parser.add_argument(
            '--create-sites',
            action='store_true',
            help='创建Wagtail站点配置',
        )
        parser.add_argument(
            '--create-indices',
            action='store_true',
            help='创建OpenSearch索引',
        )
        parser.add_argument(
            '--site',
            type=str,
            help='指定特定站点操作',
        )
        parser.add_argument(
            '--list',
            action='store_true',
            help='列出所有可用站点',
        )

    def handle(self, *args, **options):
        if options['list']:
            self.list_sites()
            return

        if options['create_sites']:
            self.create_wagtail_sites(options.get('site'))

        if options['create_indices']:
            self.create_opensearch_indices(options.get('site'))

    def list_sites(self):
        """列出所有可用站点"""
        self.stdout.write(self.style.SUCCESS('=== 可用站点配置 ==='))
        
        sites = get_available_sites()
        for site_id, config in sites.items():
            status = "✅ 默认" if config.get('is_default') else "🔸 普通"
            self.stdout.write(f"\n{status} {site_id}")
            self.stdout.write(f"  名称: {config['name']}")
            self.stdout.write(f"  描述: {config['description']}")
            self.stdout.write(f"  域名: {', '.join(config['domains'])}")

        # 检查Wagtail站点状态
        self.stdout.write(self.style.SUCCESS('\n=== Wagtail站点状态 ==='))
        wagtail_sites = Site.objects.all()
        if wagtail_sites:
            for site in wagtail_sites:
                default_flag = " (默认)" if site.is_default_site else ""
                self.stdout.write(f"✅ {site.hostname}:{site.port}{default_flag}")
        else:
            self.stdout.write(self.style.WARNING("⚠️  未找到Wagtail站点配置"))

    def create_wagtail_sites(self, specific_site=None):
        """创建Wagtail站点配置"""
        self.stdout.write(self.style.SUCCESS('=== 创建Wagtail站点 ==='))
        
        sites_config = get_available_sites()
        
        # 确保有根页面
        root_page = Page.objects.filter(depth=1).first()
        if not root_page:
            self.stdout.write(self.style.ERROR("❌ 未找到根页面，请先运行Django迁移"))
            return

        created_count = 0
        
        for site_id, config in sites_config.items():
            if specific_site and site_id != specific_site:
                continue

            for domain in config['domains']:
                hostname, port = self._parse_domain(domain)
                
                # 检查是否已存在
                existing = Site.objects.filter(hostname=hostname, port=port).first()
                if existing:
                    self.stdout.write(f"⏭️  站点已存在: {domain}")
                    continue

                try:
                    with transaction.atomic():
                        site = Site.objects.create(
                            hostname=hostname,
                            port=port,
                            site_name=config['name'],
                            root_page=root_page,
                            is_default_site=config.get('is_default', False)
                        )
                        self.stdout.write(f"✅ 创建站点: {domain} -> {site.site_name}")
                        created_count += 1
                        
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"❌ 创建站点失败 {domain}: {e}"))

        self.stdout.write(self.style.SUCCESS(f"\n🎉 成功创建 {created_count} 个站点"))

    def create_opensearch_indices(self, specific_site=None):
        """创建OpenSearch索引"""
        self.stdout.write(self.style.SUCCESS('=== 创建OpenSearch索引 ==='))
        
        sites_config = get_available_sites()
        created_count = 0
        
        for site_id, config in sites_config.items():
            if specific_site and site_id != specific_site:
                continue

            try:
                # 为每个站点创建索引
                ensure_index(site_id)  # 🎯 使用简化索引
                self.stdout.write(f"✅ 创建索引: {site_id}")
                created_count += 1
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ 创建索引失败 {site_id}: {e}"))

        self.stdout.write(self.style.SUCCESS(f"\n🎉 成功创建 {created_count} 个索引"))

    def _parse_domain(self, domain):
        """解析域名和端口"""
        if ':' in domain:
            hostname, port_str = domain.split(':', 1)
            try:
                port = int(port_str)
            except ValueError:
                port = 80
        else:
            hostname = domain
            port = 80
        
        return hostname, port
