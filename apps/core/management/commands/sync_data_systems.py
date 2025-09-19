"""
数据系统同步管理命令

用法：
python manage.py sync_data_systems --check-consistency
python manage.py sync_data_systems --sync-articles --limit 100
python manage.py sync_data_systems --sync-weights
python manage.py sync_data_systems --full-sync --site aivoya.com
"""

import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.core.services.data_sync_service import data_sync_service

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = '管理PostgreSQL、OpenSearch、ClickHouse之间的数据同步'

    def add_arguments(self, parser):
        parser.add_argument(
            '--check-consistency',
            action='store_true',
            help='检查数据一致性',
        )
        parser.add_argument(
            '--sync-articles',
            action='store_true',
            help='同步文章到OpenSearch',
        )
        parser.add_argument(
            '--sync-weights',
            action='store_true',
            help='同步文章权重',
        )
        parser.add_argument(
            '--full-sync',
            action='store_true',
            help='全量同步（包括文章内容和权重）',
        )
        parser.add_argument(
            '--site',
            type=str,
            help='指定站点',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=100,
            help='批量处理限制（默认100）',
        )
        parser.add_argument(
            '--article-ids',
            type=str,
            help='指定文章ID列表，逗号分隔',
        )

    def handle(self, *args, **options):
        site = options.get('site')
        limit = options.get('limit', 100)
        article_ids = None
        
        if options.get('article_ids'):
            try:
                article_ids = [int(x.strip()) for x in options['article_ids'].split(',')]
            except ValueError:
                self.stderr.write('❌ 文章ID格式错误')
                return
        
        self.stdout.write(f"\n🔄 数据同步服务启动")
        self.stdout.write(f"时间: {timezone.now()}")
        if site:
            self.stdout.write(f"站点: {site}")
        
        # 检查数据一致性
        if options.get('check_consistency'):
            self.check_consistency(site)
        
        # 同步文章
        if options.get('sync_articles'):
            self.sync_articles(article_ids, limit)
        
        # 同步权重
        if options.get('sync_weights'):
            self.sync_weights(article_ids, limit)
        
        # 全量同步
        if options.get('full_sync'):
            self.full_sync(article_ids, limit, site)
    
    def check_consistency(self, site=None):
        """检查数据一致性"""
        self.stdout.write("\n📊 检查数据一致性...")
        
        result = data_sync_service.check_data_consistency(site)
        
        # PostgreSQL统计
        pg_stats = result.get('postgresql', {})
        self.stdout.write(f"\n🐘 PostgreSQL:")
        self.stdout.write(f"  总文章数: {pg_stats.get('total_articles', 0)}")
        self.stdout.write(f"  精选文章: {pg_stats.get('featured_articles', 0)}")
        self.stdout.write(f"  有权重文章: {pg_stats.get('articles_with_weight', 0)}")
        self.stdout.write(f"  有统计数据: {pg_stats.get('articles_with_stats', 0)}")
        
        # OpenSearch统计
        os_stats = result.get('opensearch', {})
        self.stdout.write(f"\n🔍 OpenSearch:")
        if 'error' in os_stats:
            self.stdout.write(self.style.ERROR(f"  错误: {os_stats['error']}"))
        else:
            self.stdout.write(f"  索引文章数: {os_stats.get('total_articles', 0)}")
            self.stdout.write(f"  索引名称: {os_stats.get('index_name', 'N/A')}")
        
        # ClickHouse统计
        ch_stats = result.get('clickhouse', {})
        self.stdout.write(f"\n📈 ClickHouse:")
        if 'error' in ch_stats:
            self.stdout.write(self.style.ERROR(f"  错误: {ch_stats['error']}"))
        else:
            self.stdout.write(f"  总事件数: {ch_stats.get('total_events', 0)}")
            self.stdout.write(f"  24小时事件: {ch_stats.get('recent_24h_events', 0)}")
        
        # 一致性分析
        consistency = result.get('consistency', {})
        self.stdout.write(f"\n⚖️ 一致性分析:")
        if consistency:
            ratio = consistency.get('pg_os_ratio', 0)
            is_consistent = consistency.get('is_consistent', False)
            status = "✅ 一致" if is_consistent else "❌ 不一致"
            self.stdout.write(f"  PG-OS一致性: {ratio:.2%} {status}")
        
        # 建议
        recommendations = result.get('recommendations', [])
        if recommendations:
            self.stdout.write(f"\n💡 建议:")
            for i, rec in enumerate(recommendations, 1):
                self.stdout.write(f"  {i}. {rec}")
    
    def sync_articles(self, article_ids=None, limit=100):
        """同步文章到OpenSearch"""
        self.stdout.write(f"\n🔄 同步文章到OpenSearch (限制: {limit})...")
        
        stats = data_sync_service.batch_sync_articles(article_ids, limit)
        
        self.stdout.write(f"\n📊 同步结果:")
        self.stdout.write(f"  总处理数: {stats['total']}")
        self.stdout.write(f"  OpenSearch成功: {stats['opensearch_success']}")
        self.stdout.write(f"  OpenSearch失败: {stats['opensearch_failed']}")
        
        if stats['opensearch_failed'] > 0:
            self.stdout.write(self.style.WARNING(f"⚠️ 有 {stats['opensearch_failed']} 篇文章同步失败"))
        else:
            self.stdout.write(self.style.SUCCESS("✅ 所有文章同步成功"))
    
    def sync_weights(self, article_ids=None, limit=100):
        """同步文章权重"""
        self.stdout.write(f"\n⚖️ 同步文章权重 (限制: {limit})...")
        
        from apps.news.models.article import ArticlePage
        
        # 构建查询
        if article_ids:
            articles = ArticlePage.objects.filter(id__in=article_ids[:limit])
        else:
            articles = ArticlePage.objects.all()[:limit]
        
        total = articles.count()
        updated = 0
        failed = 0
        
        for article in articles:
            if data_sync_service.sync_article_weight(article):
                updated += 1
            else:
                failed += 1
        
        self.stdout.write(f"\n📊 权重同步结果:")
        self.stdout.write(f"  总处理数: {total}")
        self.stdout.write(f"  成功更新: {updated}")
        self.stdout.write(f"  更新失败: {failed}")
        
        if failed > 0:
            self.stdout.write(self.style.WARNING(f"⚠️ 有 {failed} 篇文章权重同步失败"))
        else:
            self.stdout.write(self.style.SUCCESS("✅ 所有文章权重同步成功"))
    
    def full_sync(self, article_ids=None, limit=100, site=None):
        """全量同步"""
        self.stdout.write(f"\n🚀 开始全量同步...")
        
        # 1. 检查一致性
        self.check_consistency(site)
        
        # 2. 同步文章
        self.sync_articles(article_ids, limit)
        
        # 3. 同步权重
        self.sync_weights(article_ids, limit)
        
        # 4. 再次检查一致性
        self.stdout.write(f"\n🔍 同步后一致性检查...")
        self.check_consistency(site)
        
        self.stdout.write(self.style.SUCCESS("\n✅ 全量同步完成！"))
