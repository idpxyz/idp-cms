#!/usr/bin/env python3
"""
修复Wagtail站点配置 - 解决共享根页面问题

用法：
  python manage.py fix_site_configuration --dry-run  # 预览修复计划
  python manage.py fix_site_configuration --execute  # 执行修复
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from wagtail.models import Site, Page
from wagtail.models import Locale
from apps.home.models import HomePage
from apps.news.models import ArticlePage
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "修复Wagtail站点配置，解决共享根页面问题"

    def add_arguments(self, parser):
        parser.add_argument(
            '--execute',
            action='store_true',
            help='执行修复操作（默认只是预览）',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='预览修复计划（默认模式）',
        )

    def handle(self, *args, **options):
        execute = options['execute']
        dry_run = not execute

        if dry_run:
            self.stdout.write("🔍 预览模式 - 分析站点配置问题...")
        else:
            self.stdout.write("🔧 执行模式 - 开始修复站点配置...")

        # 分析当前问题
        issues = self.analyze_site_issues()
        
        if not issues:
            self.stdout.write(self.style.SUCCESS("✅ 未发现站点配置问题！"))
            return

        # 显示修复计划
        self.show_fix_plan(issues)

        if execute:
            # 执行修复
            self.execute_fixes(issues)
        else:
            self.stdout.write("\n💡 要执行修复，请运行:")
            self.stdout.write("   python manage.py fix_site_configuration --execute")

    def analyze_site_issues(self):
        """分析站点配置问题"""
        self.stdout.write("\n=== 分析站点配置 ===")
        
        issues = []
        sites = Site.objects.all()
        root_pages = {}

        for site in sites:
            root_id = site.root_page_id
            article_count = ArticlePage.objects.live().descendant_of(site.root_page).count()
            
            self.stdout.write(f"📍 站点: {site.hostname} (ID: {site.id})")
            self.stdout.write(f"   根页面ID: {root_id}, 文章数: {article_count}")

            if root_id in root_pages:
                # 发现共享根页面问题
                issue = {
                    'type': 'shared_root_page',
                    'root_page_id': root_id,
                    'sites': [root_pages[root_id], site],
                    'article_count': article_count
                }
                issues.append(issue)
                self.stdout.write(self.style.ERROR(f"   ❌ 与 {root_pages[root_id].hostname} 共享根页面！"))
            else:
                root_pages[root_id] = site
                self.stdout.write("   ✅ 根页面配置正常")

        return issues

    def show_fix_plan(self, issues):
        """显示修复计划"""
        self.stdout.write(f"\n{'='*60}")
        self.stdout.write("📋 修复计划")
        self.stdout.write("="*60)

        for i, issue in enumerate(issues, 1):
            if issue['type'] == 'shared_root_page':
                self.stdout.write(f"\n🔧 问题 {i}: 共享根页面")
                self.stdout.write(f"   根页面ID: {issue['root_page_id']}")
                
                # 确定哪个站点保留原根页面，哪个需要新根页面
                sites = issue['sites']
                primary_site = sites[0]  # 第一个发现的站点保留原根页面
                secondary_site = sites[1]  # 第二个站点需要新根页面

                self.stdout.write(f"   保留原根页面: {primary_site.hostname}")
                self.stdout.write(f"   创建新根页面: {secondary_site.hostname}")
                
                self.stdout.write(f"\n   修复步骤:")
                self.stdout.write(f"   1. 为 {secondary_site.hostname} 创建新的根页面")
                self.stdout.write(f"   2. 将 {secondary_site.hostname} 的站点配置指向新根页面")
                self.stdout.write(f"   3. 验证修复结果")

    def execute_fixes(self, issues):
        """执行修复操作"""
        self.stdout.write(f"\n{'='*60}")
        self.stdout.write("🔧 开始执行修复")
        self.stdout.write("="*60)

        for i, issue in enumerate(issues, 1):
            if issue['type'] == 'shared_root_page':
                self.stdout.write(f"\n🔧 修复问题 {i}: 共享根页面")
                self.fix_shared_root_page(issue)

        # 验证修复结果
        self.stdout.write("\n🔍 验证修复结果...")
        verification_issues = self.analyze_site_issues()
        
        if not verification_issues:
            self.stdout.write(self.style.SUCCESS("\n🎉 所有站点配置问题已修复！"))
        else:
            self.stdout.write(self.style.ERROR(f"\n⚠️  仍有 {len(verification_issues)} 个问题未解决"))

    def fix_shared_root_page(self, issue):
        """修复共享根页面问题"""
        sites = issue['sites']
        primary_site = sites[0]  # 保留原根页面
        secondary_site = sites[1]  # 需要新根页面

        self.stdout.write(f"   为 {secondary_site.hostname} 创建新根页面...")

        try:
            with transaction.atomic():
                # 获取默认语言
                default_locale = Locale.get_default()
                
                # 获取根页面作为父页面
                root_page = Page.get_first_root_node()
                
                # 创建新的主页
                new_home_page = HomePage(
                    title=f"{secondary_site.hostname} 主页",
                    slug=f"{secondary_site.hostname.replace('.', '-')}-home",
                    locale=default_locale,
                )
                
                # 添加到根页面下
                root_page.add_child(instance=new_home_page)
                
                # 更新站点配置
                secondary_site.root_page = new_home_page
                secondary_site.save()
                
                self.stdout.write(self.style.SUCCESS(f"   ✅ 成功为 {secondary_site.hostname} 创建新根页面 (ID: {new_home_page.id})"))
                
                # 记录详细信息
                self.stdout.write(f"      新根页面标题: {new_home_page.title}")
                self.stdout.write(f"      新根页面ID: {new_home_page.id}")
                self.stdout.write(f"      站点ID: {secondary_site.id}")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"   ❌ 修复失败: {str(e)}"))
            logger.error(f"修复站点 {secondary_site.hostname} 失败: {e}")

    def create_news_section_for_site(self, site, parent_page):
        """为站点创建新闻板块（可选）"""
        try:
            # 这里可以创建新闻列表页面等
            # 目前暂时跳过，保持简单
            pass
        except Exception as e:
            logger.error(f"为站点 {site.hostname} 创建新闻板块失败: {e}")
