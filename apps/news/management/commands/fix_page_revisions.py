from django.core.management.base import BaseCommand
from wagtail.models import Revision
from apps.news.models import ArticlePage


class Command(BaseCommand):
    help = '修复页面的修订引用问题'

    def handle(self, *args, **options):
        self.stdout.write('开始修复页面的修订引用问题...')
        
        # 获取所有文章页面
        articles = ArticlePage.objects.all()
        fixed_count = 0
        
        for article in articles:
            self.stdout.write(f'处理文章: {article.title} (ID: {article.id})')
            
            # 检查页面的修订引用
            if article.latest_revision_id and not Revision.objects.filter(id=article.latest_revision_id).exists():
                self.stdout.write(f'  修复latest_revision_id: {article.latest_revision_id}')
                article.latest_revision_id = None
                fixed_count += 1
            
            if article.live_revision_id and not Revision.objects.filter(id=article.live_revision_id).exists():
                self.stdout.write(f'  修复live_revision_id: {article.live_revision_id}')
                article.live_revision_id = None
                fixed_count += 1
            
            # 保存修复后的页面
            if fixed_count > 0:
                article.save(update_fields=['latest_revision_id', 'live_revision_id'])
        
        self.stdout.write(
            self.style.SUCCESS(
                f'修复完成！共修复了 {fixed_count} 个页面的修订引用问题'
            )
        )
