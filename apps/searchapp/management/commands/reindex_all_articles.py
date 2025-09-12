from django.core.management.base import BaseCommand
from django.conf import settings
from apps.news.models import ArticlePage
from apps.searchapp.client import get_client
from apps.searchapp.alias import write_alias, ensure_versioned_index
from apps.searchapp.indexer import ArticleIndexer

class Command(BaseCommand):
    help = "重新索引所有文章到OpenSearch"

    def add_arguments(self, parser):
        parser.add_argument("--site", default=None, help="指定站点，默认使用SITE_HOSTNAME")
        parser.add_argument("--clear", action="store_true", help="清空现有索引后重新索引")
        parser.add_argument("--dry-run", action="store_true", help="预演模式，不实际执行索引")

    def handle(self, *args, **options):
        site = options["site"] or settings.SITE_HOSTNAME
        clear = options["clear"]
        dry_run = options["dry_run"]
        
        self.stdout.write(f"🔄 开始重新索引站点: {site}")
        
        # 确保索引存在
        ensure_versioned_index(site)
        
        client = get_client()
        index = write_alias(site)
        indexer = ArticleIndexer(target_site=site)
        
        # 如果需要清空索引
        if clear and not dry_run:
            self.stdout.write("🗑️  清空现有索引...")
            try:
                client.delete_by_query(index=index, body={"query": {"match_all": {}}})
                self.stdout.write(self.style.SUCCESS("✅ 索引已清空"))
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"⚠️  清空索引失败: {e}"))
        
        # 获取所有需要索引的页面
        all_pages = []
        
        # 文章页面
        try:
            article_pages = ArticlePage.objects.live().public()
            all_pages.extend(article_pages)
            self.stdout.write(f"📰 找到 {article_pages.count()} 个文章页面")
        except Exception as e:
            self.stdout.write(f"⚠️  获取文章页面失败: {e}")
            return
        
        self.stdout.write(f"📊 总共需要索引 {len(all_pages)} 个页面")
        
        if dry_run:
            self.stdout.write(self.style.WARNING("🔍 预演模式，不会实际执行索引"))
            for i, page in enumerate(all_pages[:5], 1):
                doc = indexer.to_doc(page)
                self.stdout.write(f"  {i}. ID:{page.id} -> article_id:{doc['article_id']} | {page.title[:50]}...")
            if len(all_pages) > 5:
                self.stdout.write(f"  ... 还有 {len(all_pages)-5} 个页面")
            return
        
        # 开始索引
        success_count = 0
        error_count = 0
        
        for i, page in enumerate(all_pages, 1):
            try:
                doc = indexer.to_doc(page)
                client.index(index=index, id=str(page.id), body=doc)
                success_count += 1
                
                if i % 10 == 0:
                    self.stdout.write(f"📈 已处理 {i}/{len(all_pages)} 个页面")
                    
            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(f"❌ 索引页面 {page.id} 失败: {e}")
                )
        
        # 刷新索引
        try:
            client.indices.refresh(index=index)
            self.stdout.write("🔄 索引已刷新")
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"⚠️  刷新索引失败: {e}"))
        
        # 输出结果
        self.stdout.write(self.style.SUCCESS(
            f"✅ 重新索引完成! 成功: {success_count}, 失败: {error_count}"
        ))
        
        # 验证结果
        try:
            result = client.count(index=index)
            count = result.get("count", 0)
            self.stdout.write(f"📊 索引中当前有 {count} 个文档")
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"⚠️  验证索引失败: {e}"))
