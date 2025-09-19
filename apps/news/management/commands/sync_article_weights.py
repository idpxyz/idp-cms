"""
同步文章权重管理命令

这个命令用于：
1. 修复权重数据不一致问题
2. 批量更新所有文章的动态权重
3. 确保Hero API获取到正确的权重数据
"""

import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.news.models.article import ArticlePage

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = '同步和修复文章权重数据，确保Hero API获取正确权重'

    def add_arguments(self, parser):
        parser.add_argument(
            '--fix-inconsistency',
            action='store_true',
            help='修复权重不一致问题',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=50,
            help='批处理大小（默认50）',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='预览模式，不实际更新',
        )

    def handle(self, *args, **options):
        fix_inconsistency = options['fix_inconsistency']
        batch_size = options['batch_size']
        dry_run = options['dry_run']
        
        self.stdout.write("🔧 开始同步文章权重数据...")
        
        if fix_inconsistency:
            self.fix_weight_inconsistency(batch_size, dry_run)
        else:
            self.sync_all_weights(batch_size, dry_run)
    
    def fix_weight_inconsistency(self, batch_size, dry_run):
        """修复权重不一致问题"""
        self.stdout.write("🔍 检查权重不一致的文章...")
        
        inconsistent_articles = []
        total_checked = 0
        
        # 批量检查文章
        for offset in range(0, ArticlePage.objects.count(), batch_size):
            articles = ArticlePage.objects.all()[offset:offset + batch_size]
            
            for article in articles:
                total_checked += 1
                stored_weight = article.weight
                calculated_weight = article.calculate_dynamic_weight()
                
                if stored_weight != calculated_weight:
                    inconsistent_articles.append({
                        'id': article.id,
                        'title': article.title[:50],
                        'stored': stored_weight,
                        'calculated': calculated_weight,
                        'diff': abs(stored_weight - calculated_weight),
                        'article': article
                    })
                
                if total_checked % 100 == 0:
                    self.stdout.write(f"已检查 {total_checked} 篇文章...")
        
        self.stdout.write(f"\n📊 检查完成:")
        self.stdout.write(f"  总文章数: {total_checked}")
        self.stdout.write(f"  不一致数: {len(inconsistent_articles)}")
        self.stdout.write(f"  一致性率: {((total_checked - len(inconsistent_articles)) / total_checked * 100):.1f}%")
        
        if inconsistent_articles:
            # 按差异排序，显示差异最大的
            inconsistent_articles.sort(key=lambda x: x['diff'], reverse=True)
            
            self.stdout.write(f"\n🔝 差异最大的前10篇文章:")
            for i, item in enumerate(inconsistent_articles[:10]):
                self.stdout.write(
                    f"  {i+1}. [{item['id']}] {item['title']}..."
                    f"\n     权重: {item['stored']} → {item['calculated']} "
                    f"(差值: {item['calculated'] - item['stored']:+d})"
                )
            
            if not dry_run:
                self.stdout.write(f"\n🔄 开始修复权重不一致...")
                updated_count = 0
                
                for item in inconsistent_articles:
                    try:
                        with transaction.atomic():
                            article = item['article']
                            article.weight = item['calculated']
                            article.save(update_fields=['weight'])
                            updated_count += 1
                    except Exception as e:
                        self.stderr.write(f"❌ 更新文章 {item['id']} 失败: {e}")
                
                self.stdout.write(f"✅ 修复完成，更新了 {updated_count} 篇文章的权重")
            else:
                self.stdout.write(f"\n🔍 预览模式 - 如需实际修复，请移除 --dry-run 参数")
        else:
            self.stdout.write(f"\n✅ 所有文章权重都是一致的！")
    
    def sync_all_weights(self, batch_size, dry_run):
        """同步所有文章权重"""
        self.stdout.write("🔄 同步所有文章权重...")
        
        total_articles = ArticlePage.objects.count()
        updated_count = 0
        
        for offset in range(0, total_articles, batch_size):
            articles = ArticlePage.objects.all()[offset:offset + batch_size]
            
            for article in articles:
                try:
                    old_weight = article.weight
                    new_weight = article.calculate_dynamic_weight()
                    
                    if not dry_run and old_weight != new_weight:
                        article.weight = new_weight
                        article.save(update_fields=['weight'])
                        updated_count += 1
                        
                except Exception as e:
                    self.stderr.write(f"❌ 处理文章 {article.id} 失败: {e}")
            
            processed = min(offset + batch_size, total_articles)
            self.stdout.write(f"已处理 {processed}/{total_articles} 篇文章...")
        
        if not dry_run:
            self.stdout.write(f"✅ 同步完成，更新了 {updated_count} 篇文章的权重")
        else:
            self.stdout.write(f"🔍 预览模式完成")
