"""
创建测试数据的管理命令

用于创建频道、地区等测试数据，方便在管理界面中查看
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from wagtail.models import Site
from apps.core.models import Channel, Region, SiteSettings


class Command(BaseCommand):
    help = '创建频道、地区等测试数据'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='清除现有数据',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('清除现有数据...')
            Channel.objects.all().delete()
            Region.objects.all().delete()
            SiteSettings.objects.all().delete()

        self.stdout.write('创建测试数据...')
        
        # 获取默认站点
        default_site = Site.objects.get(is_default_site=True)
        
        with transaction.atomic():
            # 创建频道
            channels_data = [
                {'name': '推荐', 'slug': 'recommend', 'order': 1},
                {'name': '科技', 'slug': 'tech', 'order': 2},
                {'name': '财经', 'slug': 'finance', 'order': 3},
                {'name': '体育', 'slug': 'sports', 'order': 4},
                {'name': '娱乐', 'slug': 'entertainment', 'order': 5},
                {'name': '国际', 'slug': 'international', 'order': 6},
            ]
            
            for channel_data in channels_data:
                channel, created = Channel.objects.get_or_create(
                    slug=channel_data['slug'],
                    defaults={
                        'name': channel_data['name'],
                        'order': channel_data['order'],
                        'description': f'{channel_data["name"]}频道相关内容',
                        'is_active': True,
                    }
                )
                channel.sites.add(default_site)
                if created:
                    self.stdout.write(f'  创建频道: {channel.name}')
                else:
                    self.stdout.write(f'  频道已存在: {channel.name}')
            
            # 创建地区
            regions_data = [
                {'name': '全球', 'slug': 'global', 'order': 1, 'parent': None},
                {'name': '中国', 'slug': 'china', 'order': 2, 'parent': None},
                {'name': '美国', 'slug': 'usa', 'order': 3, 'parent': None},
                {'name': '欧洲', 'slug': 'europe', 'order': 4, 'parent': None},
                {'name': '北京', 'slug': 'beijing', 'order': 21, 'parent': 'china'},
                {'name': '上海', 'slug': 'shanghai', 'order': 22, 'parent': 'china'},
                {'name': '深圳', 'slug': 'shenzhen', 'order': 23, 'parent': 'china'},
            ]
            
            created_regions = {}
            for region_data in regions_data:
                parent = None
                if region_data['parent']:
                    parent = created_regions.get(region_data['parent'])
                
                region, created = Region.objects.get_or_create(
                    slug=region_data['slug'],
                    defaults={
                        'name': region_data['name'],
                        'order': region_data['order'],
                        'parent': parent,
                        'description': f'{region_data["name"]}地区相关内容',
                        'is_active': True,
                    }
                )
                region.sites.add(default_site)
                created_regions[region_data['slug']] = region
                
                if created:
                    self.stdout.write(f'  创建地区: {region.name}')
                else:
                    self.stdout.write(f'  地区已存在: {region.name}')
            
            # 创建站点设置
            site_settings, created = SiteSettings.objects.get_or_create(
                site=default_site,
                defaults={
                    'brand_name': 'AI Voya 新闻',
                    'default_title': 'AI Voya - 人工智能与科技新闻',
                    'default_description': '专注于人工智能、科技创新的新闻资讯平台',
                    'cache_timeout': 300,
                }
            )
            
            if created:
                self.stdout.write(f'  创建站点设置: {site_settings.brand_name}')
            else:
                self.stdout.write(f'  站点设置已存在: {site_settings.brand_name}')

        self.stdout.write(self.style.SUCCESS('✅ 测试数据创建完成！'))
        self.stdout.write(self.style.SUCCESS('现在可以在Django Admin中查看：'))
        self.stdout.write('  - http://localhost:8000/admin/core/channel/')
        self.stdout.write('  - http://localhost:8000/admin/core/region/')
        self.stdout.write('  - http://localhost:8000/admin/core/sitesettings/')
