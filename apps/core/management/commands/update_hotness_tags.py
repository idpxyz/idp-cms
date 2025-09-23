"""
手动更新文章热度标记的管理命令

用于：
1. 手动触发热度计算和标记
2. 测试热度算法
3. 批量重建热度索引
4. 调试热度分类问题
"""

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from apps.core.tasks.hotness_tagging import (
    update_article_hotness_tags, 
    refresh_hot_trending_articles,
    daily_hotness_cleanup
)
from apps.core.services.hotness_calculator import HotnessCalculator, get_hotness_score
from apps.news.models.article import ArticlePage


class Command(BaseCommand):
    help = '更新文章热度标记和虚拟频道标签'

    def add_arguments(self, parser):
        parser.add_argument(
            '--site',
            type=str,
            default=getattr(settings, 'SITE_HOSTNAME', 'localhost'),
            help='站点标识符'
        )
        
        parser.add_argument(
            '--hours',
            type=int,
            default=24,
            help='处理最近N小时内的文章'
        )
        
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='批处理大小'
        )
        
        parser.add_argument(
            '--mode',
            choices=['full', 'fast', 'cleanup', 'test', 'single'],
            default='full',
            help='运行模式: full(全量更新), fast(快速刷新), cleanup(清理), test(测试), single(单篇测试)'
        )
        
        parser.add_argument(
            '--article-id',
            type=int,
            help='单篇文章测试时的文章ID'
        )
        
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='只计算不更新，用于测试'
        )
        
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='显示详细日志'
        )

    def handle(self, *args, **options):
        site = options['site']
        mode = options['mode']
        verbose = options['verbose']
        
        if verbose:
            import logging
            logging.getLogger('apps.core.services.hotness_calculator').setLevel(logging.DEBUG)
            logging.getLogger('apps.core.tasks.hotness_tagging').setLevel(logging.DEBUG)
        
        self.stdout.write(f'🔥 开始执行热度标记任务: {mode} 模式')
        
        try:
            if mode == 'single':
                self._test_single_article(options)
            elif mode == 'test':
                self._test_hotness_algorithm(site, options)
            elif mode == 'fast':
                self._run_fast_refresh(site)
            elif mode == 'cleanup':
                self._run_cleanup(site)
            elif mode == 'full':
                self._run_full_update(site, options)
            else:
                raise CommandError(f'未知模式: {mode}')
                
        except Exception as e:
            raise CommandError(f'任务执行失败: {e}')

    def _test_single_article(self, options):
        """测试单篇文章的热度计算"""
        article_id = options.get('article_id')
        if not article_id:
            raise CommandError('single模式需要指定 --article-id')
        
        site = options['site']
        
        try:
            article = ArticlePage.objects.get(id=article_id)
            self.stdout.write(f'📰 测试文章: {article.title} (ID: {article_id})')
            
            # 计算热度
            hotness_score, category = get_hotness_score(str(article_id), site)
            
            self.stdout.write(f'🔥 热度评分: {hotness_score:.2f}')
            self.stdout.write(f'🏷️  分类结果: {category}')
            
            # 详细指标
            calculator = HotnessCalculator()
            metrics_dict = calculator.fetch_article_metrics([str(article_id)], site)
            metrics = metrics_dict.get(str(article_id))
            
            if metrics:
                self.stdout.write(f'📊 详细指标:')
                self.stdout.write(f'   - CTR 1h: {metrics.ctr_1h:.4f}')
                self.stdout.write(f'   - CTR 24h: {metrics.ctr_24h:.4f}')
                self.stdout.write(f'   - Pop 1h: {metrics.pop_1h}')
                self.stdout.write(f'   - 浏览量: {metrics.view_count}')
                self.stdout.write(f'   - 分享数: {metrics.share_count}')
                self.stdout.write(f'   - 评论数: {metrics.comment_count}')
                self.stdout.write(f'   - 时效性: {metrics.recency_score:.4f}')
            
        except ArticlePage.DoesNotExist:
            raise CommandError(f'文章不存在: {article_id}')

    def _test_hotness_algorithm(self, site, options):
        """测试热度算法"""
        self.stdout.write('🧪 测试热度算法...')
        
        # 获取最近的一些文章进行测试
        articles = ArticlePage.objects.live().order_by('-first_published_at')[:10]
        
        if not articles:
            self.stdout.write('❌ 没有找到文章进行测试')
            return
        
        calculator = HotnessCalculator()
        article_data = []
        
        for article in articles:
            article_data.append({
                'id': article.id,
                'title': article.title,
                'publish_time': article.first_published_at,
                'quality_score': getattr(article, 'quality_score', 1.0),
            })
        
        # 批量计算
        classified = calculator.batch_classify_articles(article_data, site)
        
        # 显示结果
        self.stdout.write('📊 测试结果:')
        for item in classified:
            self.stdout.write(
                f'  {item["id"]:>4} | {item["hotness_category"]:>8} | '
                f'{item["hotness_score"]:>6.1f} | {item["title"][:50]}'
            )
        
        # 统计
        categories = {}
        for item in classified:
            cat = item['hotness_category']
            categories[cat] = categories.get(cat, 0) + 1
        
        self.stdout.write(f'📈 分类统计: {categories}')

    def _run_fast_refresh(self, site):
        """快速刷新"""
        self.stdout.write('⚡ 执行快速刷新（最近1小时文章）...')
        result = refresh_hot_trending_articles(site=site)
        self._display_result(result)

    def _run_cleanup(self, site):
        """清理过期标记"""
        self.stdout.write('🧹 执行清理过期热度标记...')
        result = daily_hotness_cleanup(site=site)
        self._display_result(result)

    def _run_full_update(self, site, options):
        """全量更新"""
        hours = options['hours']
        batch_size = options['batch_size']
        
        self.stdout.write(f'🔄 执行全量更新（最近{hours}小时，批大小{batch_size}）...')
        result = update_article_hotness_tags(
            site=site, 
            hours_back=hours, 
            batch_size=batch_size
        )
        self._display_result(result)

    def _display_result(self, result):
        """显示执行结果"""
        if isinstance(result, dict):
            for key, value in result.items():
                self.stdout.write(f'  {key}: {value}')
        else:
            self.stdout.write(f'  结果: {result}')
        
        self.stdout.write(self.style.SUCCESS('✅ 任务执行完成'))
