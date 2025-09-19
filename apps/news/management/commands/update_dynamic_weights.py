"""
管理命令：更新文章动态权重

使用方法：
python manage.py update_dynamic_weights
python manage.py update_dynamic_weights --dry-run
python manage.py update_dynamic_weights --article-id 123
"""

import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.news.models.article import ArticlePage

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = '基于统计数据更新文章动态权重'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='预览模式，不实际更新数据库',
        )
        parser.add_argument(
            '--article-id',
            type=str,
            help='只更新指定文章的权重',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='批处理大小（默认100）',
        )

    def handle(self, *args, **options):
        self.dry_run = options['dry_run']
        article_id_filter = options['article_id']
        batch_size = options['batch_size']
        
        self.stdout.write("🔄 开始更新文章动态权重...")
        
        # 构建查询
        if article_id_filter:
            articles_query = ArticlePage.objects.filter(id=article_id_filter)
            self.stdout.write(f"📄 处理单篇文章 ID: {article_id_filter}")
        else:
            articles_query = ArticlePage.objects.all()
            self.stdout.write(f"📄 处理所有文章，批大小: {batch_size}")
        
        total_articles = articles_query.count()
        updated_count = 0
        weight_changes = []
        
        self.stdout.write(f"📊 总计文章数: {total_articles}")
        
        # 分批处理文章
        for offset in range(0, total_articles, batch_size):
            batch_articles = articles_query[offset:offset + batch_size]
            
            for article in batch_articles:
                try:
                    old_weight = article.weight
                    
                    # 计算新的动态权重
                    new_weight = article.calculate_dynamic_weight()
                    
                    # 记录变化
                    if old_weight != new_weight:
                        weight_changes.append({
                            'id': article.id,
                            'title': article.title[:50],
                            'old_weight': old_weight,
                            'new_weight': new_weight,
                            'stats': {
                                'view_count': article.view_count or 0,
                                'like_count': article.like_count or 0,
                                'favorite_count': article.favorite_count or 0,
                                'comment_count': article.comment_count or 0,
                            }
                        })
                    
                    # 实际更新（非dry-run模式）
                    if not self.dry_run:
                        if old_weight != new_weight:
                            article.weight = new_weight
                            article.save(update_fields=['weight'])
                            updated_count += 1
                    
                except Exception as e:
                    self.stderr.write(f"❌ 处理文章 {article.id} 时出错: {str(e)}")
                    continue
        
        # 输出结果
        self.stdout.write(f"\n📈 权重变化统计:")
        self.stdout.write(f"  需要更新的文章: {len(weight_changes)}")
        
        if weight_changes:
            # 显示前10个变化最大的文章
            sorted_changes = sorted(weight_changes, 
                                  key=lambda x: abs(x['new_weight'] - x['old_weight']), 
                                  reverse=True)
            
            self.stdout.write(f"\n🔝 权重变化最大的前10篇文章:")
            for i, change in enumerate(sorted_changes[:10]):
                stats = change['stats']
                self.stdout.write(
                    f"  {i+1}. [{change['id']}] {change['title']}..."
                    f"\n     权重: {change['old_weight']} → {change['new_weight']} "
                    f"(差值: {change['new_weight'] - change['old_weight']:+d})"
                    f"\n     统计: 阅读{stats['view_count']} 点赞{stats['like_count']} "
                    f"收藏{stats['favorite_count']} 评论{stats['comment_count']}"
                )
        
        if self.dry_run:
            self.stdout.write(f"\n🔍 预览模式完成 - 如需实际更新，请移除 --dry-run 参数")
        else:
            self.stdout.write(f"\n✅ 更新完成 - 实际更新了 {updated_count} 篇文章的权重")
            
        # 权重分布统计
        if not self.dry_run or article_id_filter:
            self.show_weight_distribution()
    
    def show_weight_distribution(self):
        """显示权重分布统计"""
        self.stdout.write(f"\n📊 当前权重分布:")
        
        weight_ranges = [
            (0, 10), (10, 20), (20, 30), (30, 40), (40, 50),
            (50, 60), (60, 70), (70, 80), (80, 90), (90, 100)
        ]
        
        for min_w, max_w in weight_ranges:
            count = ArticlePage.objects.filter(
                weight__gte=min_w, 
                weight__lt=max_w if max_w < 100 else 101
            ).count()
            if count > 0:
                self.stdout.write(f"  {min_w}-{max_w}: {count} 篇")
