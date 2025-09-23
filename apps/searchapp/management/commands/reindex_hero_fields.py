from django.core.management.base import BaseCommand
from apps.news.models.article import ArticlePage
from apps.searchapp.indexer import ArticleIndexer
from apps.searchapp.client import get_client
from apps.searchapp.alias import write_alias
from wagtail.models import Site
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = '重新索引文章以包含Hero字段和其他新字段'

    def add_arguments(self, parser):
        parser.add_argument(
            '--site',
            type=str,
            default='localhost',
            help='指定站点 (默认: localhost)'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='批处理大小 (默认: 100)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='只显示要处理的文章数量，不实际索引'
        )

    def handle(self, *args, **options):
        site_hostname = options['site']
        batch_size = options['batch_size']
        dry_run = options['dry_run']
        
        try:
            site = Site.objects.get(hostname=site_hostname)
            articles = ArticlePage.objects.live().descendant_of(site.root_page)
        except Site.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'站点 {site_hostname} 不存在，使用所有文章')
            )
            articles = ArticlePage.objects.live()
        
        total_count = articles.count()
        self.stdout.write(f'找到 {total_count} 篇文章需要重新索引')
        
        if dry_run:
            hero_count = articles.filter(is_hero=True).count()
            featured_count = articles.filter(is_featured=True).count()
            self.stdout.write(f'其中 Hero 文章: {hero_count} 篇')
            self.stdout.write(f'其中精选文章: {featured_count} 篇')
            return
        
        client = get_client()
        index = write_alias(site_hostname)
        indexer = ArticleIndexer(target_site=site_hostname)
        
        processed = 0
        errors = 0
        
        # 分批处理
        for i in range(0, total_count, batch_size):
            batch = articles[i:i + batch_size]
            
            for article in batch:
                try:
                    doc = indexer.to_doc(article)
                    client.index(index=index, id=str(article.id), body=doc)
                    processed += 1
                    
                    if processed % 50 == 0:
                        self.stdout.write(f'已处理 {processed}/{total_count} 篇文章')
                        
                except Exception as e:
                    errors += 1
                    logger.error(f'索引文章 {article.id} 失败: {e}')
                    
        self.stdout.write(
            self.style.SUCCESS(
                f'重新索引完成！成功: {processed}, 失败: {errors}'
            )
        )
        
        if errors > 0:
            self.stdout.write(
                self.style.WARNING(
                    f'有 {errors} 篇文章索引失败，请检查日志'
                )
            )
