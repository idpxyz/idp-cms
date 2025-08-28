#!/usr/bin/env python3
"""
测试站点过滤功能的管理命令
"""

from django.core.management.base import BaseCommand
from wagtail.models import Site
from apps.news.models.article import ArticlePage
from apps.core.models import Channel


class Command(BaseCommand):
    help = "测试站点过滤功能"

    def handle(self, *args, **options):
        self.stdout.write("🧪 测试站点过滤功能...")
        
        # 获取站点
        shanghai_site = Site.objects.get(hostname='shanghai.aivoya.com')
        beijing_site = Site.objects.get(hostname='beijing.aivoya.com')
        
        # 获取站点的主页
        shanghai_homepage = shanghai_site.root_page
        beijing_homepage = beijing_site.root_page
        
        self.stdout.write(f"\n📍 测试站点信息:")
        self.stdout.write(f"上海站点: {shanghai_site.hostname} -> 主页: {shanghai_homepage.title}")
        self.stdout.write(f"北京站点: {beijing_site.hostname} -> 主页: {beijing_homepage.title}")
        
        # 创建测试ArticlePage实例来模拟表单
        self.test_site_filtering(shanghai_site, shanghai_homepage, "上海")
        self.test_site_filtering(beijing_site, beijing_homepage, "北京")
        
        self.stdout.write(self.style.SUCCESS("\n✅ 测试完成"))

    def test_site_filtering(self, site, homepage, site_name):
        """测试指定站点的过滤功能"""
        self.stdout.write(f"\n=== 测试 {site_name} 站点过滤 ===")
        
        # 模拟在该站点下创建文章页面
        article = ArticlePage(title=f"测试文章-{site_name}")
        
        # 模拟设置父页面（这样get_site()会返回正确的站点）
        article.path = homepage.path + '0001'
        article.depth = homepage.depth + 1
        
        try:
            # 获取该页面的站点
            page_site = article.get_site()
            self.stdout.write(f"页面所属站点: {page_site.hostname}")
            
            # 获取该站点的可用频道
            available_channels = page_site.channels.filter(is_active=True)
            self.stdout.write(f"可用频道数量: {available_channels.count()}")
            
            # 检查专属频道
            local_channels = available_channels.filter(slug__contains='local')
            if local_channels.exists():
                for ch in local_channels:
                    self.stdout.write(f"专属频道: {ch.name} ({ch.slug})")
            else:
                self.stdout.write("无专属频道")
            
            # 检查是否有不应该出现的专属频道
            if site_name == "上海":
                beijing_local = available_channels.filter(slug='beijing-local')
                if beijing_local.exists():
                    self.stdout.write(self.style.ERROR("❌ 错误: 上海站点显示了北京本地频道"))
                else:
                    self.stdout.write(self.style.SUCCESS("✅ 正确: 上海站点没有显示北京本地频道"))
            
            elif site_name == "北京":
                shanghai_local = available_channels.filter(slug='shanghai-local')
                if shanghai_local.exists():
                    self.stdout.write(self.style.ERROR("❌ 错误: 北京站点显示了上海本地频道"))
                else:
                    self.stdout.write(self.style.SUCCESS("✅ 正确: 北京站点没有显示上海本地频道"))
                    
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"测试出错: {e}"))
