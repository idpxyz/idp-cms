"""
清理数据库中的多余页面

删除测试页面、旧的AI相关页面等，只保留必要的页面结构
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from wagtail.models import Page
from apps.home.models import HomePage


class Command(BaseCommand):
    help = '清理数据库中的多余页面，只保留必要的页面结构'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='只显示将要删除的页面，不实际删除',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='强制删除，不询问确认',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']
        
        self.stdout.write('=== 页面清理开始 ===')
        
        # 获取根页面
        root_page = Page.objects.get(depth=1)
        self.stdout.write(f'根页面: {root_page.title} (ID: {root_page.id})')
        
        # 获取主首页
        try:
            main_homepage = HomePage.objects.filter(depth=2).first()
            if main_homepage:
                self.stdout.write(f'主首页: {main_homepage.title} (ID: {main_homepage.id})')
            else:
                self.stdout.write('⚠️  未找到主首页')
                return
        except Exception as e:
            self.stdout.write(f'❌ 获取主首页失败: {e}')
            return
        
        # 需要删除的页面
        pages_to_delete = []
        
        # 1. 删除所有深度为3的页面（除了必要的）
        depth3_pages = Page.objects.filter(depth=3)
        self.stdout.write(f'\n深度3页面总数: {depth3_pages.count()}')
        
        for page in depth3_pages:
            # 检查是否是旧的AI相关页面
            if hasattr(page, 'content_type') and page.content_type:
                model_name = page.content_type.model
                if model_name in ['ainewspage', 'aitoolpage', 'aitutorialpage']:
                    pages_to_delete.append(page)
                    self.stdout.write(f'  标记删除: {page.title} (ID: {page.id}, 类型: {model_name})')
                elif model_name == 'homepage' and page.id != main_homepage.id:
                    # 删除多余的首页
                    pages_to_delete.append(page)
                    self.stdout.write(f'  标记删除: {page.title} (ID: {page.id}, 类型: {model_name})')
        
        # 2. 删除深度为2的多余页面
        depth2_pages = Page.objects.filter(depth=2)
        self.stdout.write(f'\n深度2页面总数: {depth2_pages.count()}')
        
        for page in depth2_pages:
            if page.id != main_homepage.id:
                pages_to_delete.append(page)
                self.stdout.write(f'  标记删除: {page.title} (ID: {page.id}, 类型: {page.content_type.model if page.content_type else "unknown"})')
        
        # 3. 删除深度大于3的页面
        deep_pages = Page.objects.filter(depth__gt=3)
        if deep_pages.exists():
            self.stdout.write(f'\n深度>3页面总数: {deep_pages.count()}')
            for page in deep_pages:
                pages_to_delete.append(page)
                self.stdout.write(f'  标记删除: {page.title} (ID: {page.id}, 深度: {page.depth})')
        
        # 显示删除统计
        self.stdout.write(f'\n=== 删除统计 ===')
        self.stdout.write(f'总页面数: {Page.objects.count()}')
        self.stdout.write(f'将删除页面数: {len(pages_to_delete)}')
        self.stdout.write(f'删除后剩余页面数: {Page.objects.count() - len(pages_to_delete)}')
        
        if not pages_to_delete:
            self.stdout.write(self.style.SUCCESS('\n✅ 没有需要删除的页面'))
            return
        
        # 确认删除
        if not force and not dry_run:
            confirm = input('\n确认删除这些页面吗？(yes/no): ')
            if confirm.lower() not in ['yes', 'y']:
                self.stdout.write('❌ 操作已取消')
                return
        
        if dry_run:
            self.stdout.write('\n🔍 这是预览模式，不会实际删除页面')
            return
        
        # 执行删除
        try:
            with transaction.atomic():
                deleted_count = 0
                for page in pages_to_delete:
                    try:
                        page_title = page.title
                        page_id = page.id
                        page.delete()
                        deleted_count += 1
                        self.stdout.write(f'  已删除: {page_title} (ID: {page_id})')
                    except Exception as e:
                        self.stdout.write(f'  ❌ 删除失败: {page.title} (ID: {page.id}): {e}')
                
                self.stdout.write(f'\n=== 删除完成 ===')
                self.stdout.write(f'成功删除: {deleted_count} 个页面')
                self.stdout.write(f'当前页面总数: {Page.objects.count()}')
                
                # 显示剩余页面结构
                self.stdout.write(f'\n=== 剩余页面结构 ===')
                root = Page.objects.get(depth=1)
                self.stdout.write(f'根页面: {root.title}')
                
                remaining_pages = Page.objects.filter(depth=2)
                for page in remaining_pages:
                    self.stdout.write(f'  - {page.title} (ID: {page.id})')
                
        except Exception as e:
            self.stdout.write(f'❌ 删除过程中出错: {e}')
            return
        
        self.stdout.write(self.style.SUCCESS('\n🎉 页面清理完成！'))
