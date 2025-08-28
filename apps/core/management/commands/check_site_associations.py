#!/usr/bin/env python3
"""
检查和修复站点关联问题的管理命令

用法：
  python manage.py check_site_associations
  python manage.py check_site_associations --fix
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from wagtail.models import Site
from apps.core.models import Channel, Region
from apps.news.models.article import ArticlePage


class Command(BaseCommand):
    help = "检查站点与频道/地区的关联关系，并可选择修复问题"

    def add_arguments(self, parser):
        parser.add_argument(
            '--fix',
            action='store_true',
            help='自动修复发现的问题',
        )

    def handle(self, *args, **options):
        self.stdout.write("🔍 检查站点关联关系...")
        
        # 检查站点配置
        self.check_sites()
        
        # 检查频道关联
        self.check_channels()
        
        # 检查地区关联
        self.check_regions()
        
        # 检查文章的频道/地区关联
        self.check_article_associations(fix=options['fix'])
        
        self.stdout.write(self.style.SUCCESS("\n✅ 检查完成"))

    def check_sites(self):
        """检查站点配置"""
        self.stdout.write("\n=== 站点配置 ===")
        
        sites = Site.objects.exclude(hostname='localhost').order_by('hostname')
        for site in sites:
            channel_count = site.channels.count()
            region_count = site.regions.count()
            self.stdout.write(
                f"📍 {site.hostname}: {channel_count}个频道, {region_count}个地区"
            )

    def check_channels(self):
        """检查频道的站点关联"""
        self.stdout.write("\n=== 频道站点关联 ===")
        
        # 专属频道
        exclusive_channels = Channel.objects.filter(
            slug__in=['beijing-local', 'shanghai-local', 'national-policy']
        )
        
        for channel in exclusive_channels:
            sites = channel.sites.all()
            site_names = [site.hostname for site in sites]
            self.stdout.write(f"🎯 专属频道 [{channel.name}]: {site_names}")
        
        # 检查是否有频道没有关联任何站点
        orphan_channels = Channel.objects.filter(sites__isnull=True)
        if orphan_channels.exists():
            self.stdout.write(f"⚠️  发现 {orphan_channels.count()} 个孤立频道:")
            for channel in orphan_channels:
                self.stdout.write(f"   - {channel.name} ({channel.slug})")

    def check_regions(self):
        """检查地区的站点关联"""
        self.stdout.write("\n=== 地区站点关联 ===")
        
        # 检查是否有地区没有关联任何站点
        orphan_regions = Region.objects.filter(sites__isnull=True)
        if orphan_regions.exists():
            self.stdout.write(f"⚠️  发现 {orphan_regions.count()} 个孤立地区:")
            for region in orphan_regions:
                self.stdout.write(f"   - {region.name} ({region.slug})")

    def check_article_associations(self, fix=False):
        """检查文章的频道/地区关联是否正确"""
        self.stdout.write("\n=== 文章关联检查 ===")
        
        issues_found = 0
        articles_checked = 0
        
        # 获取所有文章
        articles = ArticlePage.objects.live().select_related('channel', 'region')
        
        for article in articles:
            articles_checked += 1
            article_site = article.get_site()
            issues = []
            
            # 检查频道关联
            if article.channel:
                if article_site not in article.channel.sites.all():
                    issues.append(f"频道 '{article.channel.name}' 未关联到站点 '{article_site.hostname}'")
                    
            # 检查地区关联  
            if article.region:
                if article_site not in article.region.sites.all():
                    issues.append(f"地区 '{article.region.name}' 未关联到站点 '{article_site.hostname}'")
            
            # 如果发现问题
            if issues:
                issues_found += 1
                self.stdout.write(f"\n❌ 文章: {article.title}")
                self.stdout.write(f"   站点: {article_site.hostname}")
                for issue in issues:
                    self.stdout.write(f"   问题: {issue}")
                
                # 自动修复
                if fix:
                    self.fix_article_associations(article, article_site)
        
        if issues_found == 0:
            self.stdout.write("✅ 所有文章的关联关系都正确")
        else:
            self.stdout.write(f"\n📊 检查结果: {articles_checked} 篇文章中发现 {issues_found} 个关联问题")
            if not fix:
                self.stdout.write("💡 使用 --fix 参数可自动修复这些问题")

    @transaction.atomic
    def fix_article_associations(self, article, article_site):
        """修复文章的关联关系"""
        self.stdout.write(f"🔧 修复文章: {article.title}")
        
        # 修复频道关联
        if article.channel and article_site not in article.channel.sites.all():
            # 寻找该站点的相似频道
            similar_channel = article_site.channels.filter(
                name__icontains=article.channel.name.split(' ')[0]
            ).first()
            
            if similar_channel:
                article.channel = similar_channel
                self.stdout.write(f"   ✅ 频道修复为: {similar_channel.name}")
            else:
                # 如果找不到相似频道，使用该站点的第一个通用频道
                fallback_channel = article_site.channels.exclude(
                    slug__in=['beijing-local', 'shanghai-local', 'national-policy']
                ).first()
                if fallback_channel:
                    article.channel = fallback_channel
                    self.stdout.write(f"   ✅ 频道修复为: {fallback_channel.name} (兜底选择)")
        
        # 修复地区关联
        if article.region and article_site not in article.region.sites.all():
            # 寻找该站点的对应地区
            site_region = None
            if 'beijing' in article_site.hostname:
                site_region = article_site.regions.filter(slug='beijing').first()
            elif 'shanghai' in article_site.hostname:
                site_region = article_site.regions.filter(slug='shanghai').first()
            elif 'shenzhen' in article_site.hostname:
                site_region = article_site.regions.filter(slug='shenzhen').first()
            elif 'hangzhou' in article_site.hostname:
                site_region = article_site.regions.filter(slug='hangzhou').first()
            
            if site_region:
                article.region = site_region
                self.stdout.write(f"   ✅ 地区修复为: {site_region.name}")
            else:
                # 兜底选择：全国
                national_region = article_site.regions.filter(slug='national').first()
                if national_region:
                    article.region = national_region
                    self.stdout.write(f"   ✅ 地区修复为: {national_region.name} (兜底选择)")
        
        # 保存修改
        article.save(update_fields=['channel', 'region'])
