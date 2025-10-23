"""
删除重复文章的管理命令

策略：对于每组重复的文章（相同标题），保留最早发布的一篇，删除其他的。
"""
from django.core.management.base import BaseCommand
from django.db.models import Count, Min
from apps.news.models import ArticlePage
from apps.searchapp.client import get_client
from apps.searchapp.simple_index import get_index_name


class Command(BaseCommand):
    help = "删除数据库中重复的文章（保留每组中最早发布的）"

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='预演模式，不实际删除'
        )
        parser.add_argument(
            '--site',
            default='localhost',
            help='站点名称，用于清理OpenSearch索引'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        site = options['site']
        
        self.stdout.write(self.style.WARNING(
            f"{'[预演模式] ' if dry_run else ''}开始查找重复文章..."
        ))
        
        # 1. 找出所有重复标题的文章组
        duplicates = ArticlePage.objects.values('title').annotate(
            count=Count('id'),
            min_id=Min('id')
        ).filter(count__gt=1).order_by('-count')
        
        total_groups = duplicates.count()
        self.stdout.write(f"\n📊 发现 {total_groups} 组重复文章\n")
        
        deleted_count = 0
        deleted_ids = []
        
        # 2. 对每组重复文章进行处理
        for i, dup in enumerate(duplicates, 1):
            title = dup['title']
            count = dup['count']
            min_id = dup['min_id']
            
            # 获取这组文章的所有实例
            articles = ArticlePage.objects.filter(title=title).order_by('id')
            
            self.stdout.write(
                f"[{i}/{total_groups}] {title[:60]}... ({count}篇)"
            )
            
            # 保留ID最小的（最早的），删除其他的
            for article in articles:
                if article.id == min_id:
                    self.stdout.write(
                        f"  ✅ 保留: ID={article.id}, slug={article.slug}"
                    )
                else:
                    self.stdout.write(
                        f"  ❌ 删除: ID={article.id}, slug={article.slug}"
                    )
                    deleted_ids.append(str(article.id))
                    
                    if not dry_run:
                        try:
                            # 先unpublish，避免信号处理器问题
                            if article.live:
                                article.unpublish()
                            # 使用低级删除，跳过Wagtail的复杂信号处理
                            ArticlePage.objects.filter(id=article.id).delete()
                        except Exception as e:
                            self.stdout.write(
                                self.style.WARNING(f"    ⚠️ 删除失败: {e}")
                            )
                            continue
                    
                    deleted_count += 1
        
        # 3. 从OpenSearch索引中删除
        if not dry_run and deleted_ids:
            try:
                client = get_client()
                index = get_index_name(site)
                
                self.stdout.write(f"\n🔍 从OpenSearch索引删除 {len(deleted_ids)} 篇文章...")
                
                # 批量删除 - 使用正确的bulk API格式
                for i in range(0, len(deleted_ids), 100):
                    batch = deleted_ids[i:i+100]
                    body = ""
                    for article_id in batch:
                        # bulk API格式：每个操作占两行（元数据行 + 空行/数据行）
                        body += f'{{"delete": {{"_index": "{index}", "_id": "article_{article_id}"}}}}\n'
                    
                    if body:
                        client.bulk(body=body)
                
                self.stdout.write(self.style.SUCCESS(
                    f"✅ OpenSearch索引清理完成"
                ))
            except Exception as e:
                self.stdout.write(self.style.WARNING(
                    f"⚠️ OpenSearch清理失败: {e}"
                ))
        
        # 4. 总结
        self.stdout.write("\n" + "="*60)
        if dry_run:
            self.stdout.write(self.style.WARNING(
                f"[预演模式] 将删除 {deleted_count} 篇重复文章"
            ))
            self.stdout.write(
                "提示：去掉 --dry-run 参数执行实际删除"
            )
        else:
            self.stdout.write(self.style.SUCCESS(
                f"✅ 成功删除 {deleted_count} 篇重复文章！"
            ))
        self.stdout.write("="*60 + "\n")

