from django.core.management.base import BaseCommand
from wagtail.models import Revision
from apps.news.models import ArticlePage
import json


class Command(BaseCommand):
    help = '清理包含旧language字段的修订记录'

    def handle(self, *args, **options):
        self.stdout.write('开始清理旧的修订记录...')
        
        # 获取所有文章页面
        articles = ArticlePage.objects.all()
        cleaned_count = 0
        
        for article in articles:
            self.stdout.write(f'处理文章: {article.title} (ID: {article.id})')
            
            # 获取该页面的所有修订
            revisions = Revision.objects.filter(
                object_id=str(article.id),
                content_type=article.content_type
            ).order_by('-created_at')
            
            if not revisions.exists():
                self.stdout.write('  没有修订记录')
                continue
            
            # 检查修订内容
            valid_revisions = []
            for revision in revisions:
                try:
                    content = revision.content
                    
                    # 检查是否包含旧的language字段（字符串类型）
                    if 'language' in content and isinstance(content['language'], str):
                        self.stdout.write(f'  删除包含旧language字段的修订: {revision.id}')
                        revision.delete()
                        cleaned_count += 1
                    else:
                        # 保留有效的修订
                        valid_revisions.append(revision)
                        
                except (KeyError, AttributeError) as e:
                    self.stdout.write(f'  删除损坏的修订: {revision.id} (错误: {e})')
                    revision.delete()
                    cleaned_count += 1
            
            # 如果没有有效的修订，创建一个新的
            if not valid_revisions:
                self.stdout.write('  创建新的修订记录')
                # 保存当前页面状态，这会创建一个新的修订
                article.save_revision()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'清理完成！共删除了 {cleaned_count} 个旧的修订记录'
            )
        )
