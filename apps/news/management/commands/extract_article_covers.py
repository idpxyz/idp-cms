"""
Django 管理命令：从文章正文中提取封面图片
用于修复那些正文中有图片但缺少封面图的文章
"""

import re
from django.core.management.base import BaseCommand, CommandError
from apps.news.models import ArticlePage


class Command(BaseCommand):
    help = '从文章正文中提取封面图片，更新缺少封面的文章'

    def add_arguments(self, parser):
        parser.add_argument(
            '--slug',
            type=str,
            help='只处理指定 slug 的文章',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='限制处理的文章数量',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='试运行模式，不实际更新数据库',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='强制更新所有文章，包括已有封面的文章',
        )

    def extract_first_image_from_html(self, html_content):
        """从 HTML 内容中提取第一张图片的 URL"""
        if not html_content:
            return None
        
        # 匹配 img 标签中的 src 属性
        img_pattern = r'<img[^>]+src=["\']([^"\']+)["\']'
        matches = re.findall(img_pattern, html_content, re.IGNORECASE)
        
        if matches:
            return matches[0]
        
        return None

    def handle(self, *args, **options):
        slug = options.get('slug')
        limit = options.get('limit')
        dry_run = options.get('dry_run')
        force = options.get('force')

        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write(self.style.SUCCESS('从文章正文中提取封面图片'))
        self.stdout.write(self.style.SUCCESS('=' * 80))
        
        if dry_run:
            self.stdout.write(self.style.WARNING('模式: 试运行（不会实际更新数据库）'))
        else:
            self.stdout.write(self.style.WARNING('模式: 实际更新'))
        
        # 处理单篇文章
        if slug:
            try:
                article = ArticlePage.objects.get(slug=slug)
                self.process_single_article(article, dry_run, force)
            except ArticlePage.DoesNotExist:
                raise CommandError(f'文章 "{slug}" 不存在')
            return

        # 批量处理文章
        self.stdout.write('\n正在查找需要处理的文章...')
        
        if force:
            # 强制模式：处理所有有内容的文章
            articles = ArticlePage.objects.live().exclude(body__isnull=True)
        else:
            # 正常模式：只处理缺少封面的文章（没有hero_image或image_url）
            articles = ArticlePage.objects.live().filter(
                hero_image__isnull=True
            ).exclude(
                body__isnull=True
            )
        
        if limit:
            articles = articles[:limit]
        
        total_count = articles.count()
        self.stdout.write(f'找到 {total_count} 篇文章需要处理\n')
        
        if total_count == 0:
            self.stdout.write(self.style.SUCCESS('没有需要处理的文章'))
            return
        
        updated_count = 0
        no_image_count = 0
        skipped_count = 0
        
        for i, article in enumerate(articles, 1):
            result = self.process_single_article(
                article, 
                dry_run, 
                force, 
                show_header=False,
                index=i,
                total=total_count
            )
            
            if result == 'updated':
                updated_count += 1
            elif result == 'no_image':
                no_image_count += 1
            elif result == 'skipped':
                skipped_count += 1
        
        # 显示统计
        self.stdout.write('\n' + '=' * 80)
        self.stdout.write(self.style.SUCCESS('处理完成！'))
        self.stdout.write(f'  - 总计检查: {total_count} 篇')
        self.stdout.write(self.style.SUCCESS(f'  - 已更新: {updated_count} 篇'))
        self.stdout.write(self.style.WARNING(f'  - 无图片: {no_image_count} 篇'))
        if skipped_count > 0:
            self.stdout.write(f'  - 跳过: {skipped_count} 篇')
        
        if dry_run and updated_count > 0:
            self.stdout.write(self.style.WARNING('\n💡 提示: 使用不带 --dry-run 参数来实际执行更新'))

    def process_single_article(self, article, dry_run, force, show_header=True, index=None, total=None):
        """处理单篇文章，返回处理结果"""
        
        if show_header:
            self.stdout.write('\n' + '-' * 80)
            self.stdout.write(f'文章: {article.title}')
            self.stdout.write(f'  ID: {article.id}')
            self.stdout.write(f'  Slug: {article.slug}')
            self.stdout.write(f'  当前封面: {article.image_url or "(无)"}')
        else:
            # 批量处理时的简短输出
            prefix = f'[{index}/{total}]' if index and total else ''
            self.stdout.write(f'\n{prefix} {article.title[:60]}...')
        
        # 检查是否已有封面
        if article.image_url and not force:
            self.stdout.write(self.style.SUCCESS('  ✓ 已有封面，跳过'))
            return 'skipped'
        
        # 从正文中提取图片
        first_image_url = self.extract_first_image_from_html(article.content)
        
        if not first_image_url:
            self.stdout.write(self.style.WARNING('  ⚠ 正文中没有找到图片'))
            return 'no_image'
        
        # 如果已有相同的封面URL，跳过
        if article.image_url == first_image_url:
            self.stdout.write(self.style.SUCCESS('  ✓ 封面已是正文第一张图片'))
            return 'skipped'
        
        self.stdout.write(f'  提取到的图片: {first_image_url}')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('  [试运行] 将会更新'))
        else:
            # 实际更新
            article.image_url = first_image_url
            article.save(update_fields=['image_url'])
            self.stdout.write(self.style.SUCCESS('  ✓ 已更新'))
        
        return 'updated'

