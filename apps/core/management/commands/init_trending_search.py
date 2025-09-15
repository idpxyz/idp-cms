import logging
import random
from datetime import datetime, timedelta
from collections import Counter
from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils import timezone
from clickhouse_driver import Client
from wagtail.models import Site
from apps.news.models import ArticlePage
import re
import jieba
import jieba.analyse

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = '基于现有文章数据生成初始化热搜榜'

    def add_arguments(self, parser):
        parser.add_argument(
            '--site',
            type=str,
            default='localhost',
            help='站点标识 (默认: localhost)'
        )
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='分析最近N天的文章 (默认: 30)'
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=50,
            help='生成的热搜词数量 (默认: 50)'
        )
        parser.add_argument(
            '--min-length',
            type=int,
            default=2,
            help='关键词最小长度 (默认: 2)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='只显示结果，不写入ClickHouse'
        )

    def get_clickhouse_client(self):
        """获取ClickHouse客户端"""
        try:
            # 使用和track API相同的连接方式
            return Client.from_url(settings.CLICKHOUSE_URL)
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'ClickHouse连接失败: {e}')
            )
            return None

    def extract_keywords_from_text(self, text, topK=10):
        """从文本中提取关键词"""
        if not text:
            return []
        
        # 使用jieba的TF-IDF算法提取关键词
        keywords = jieba.analyse.extract_tags(
            text, 
            topK=topK * 2,  # 提取更多关键词用于筛选
            withWeight=True,
            allowPOS=('n', 'nz', 'v', 'vd', 'vn', 'l', 'a', 'd')
        )
        
        # 过滤并给长词加权
        filtered_keywords = []
        for word, weight in keywords:
            if len(word) >= self.min_length:
                # 给长词更高的权重
                length_boost = 1.0 + (len(word) - 2) * 0.3  # 每增加一个字符，权重增加30%
                boosted_weight = weight * length_boost
                filtered_keywords.append((word, boosted_weight))
        
        # 按权重排序并返回前topK个
        filtered_keywords.sort(key=lambda x: x[1], reverse=True)
        return filtered_keywords[:topK]

    def clean_keyword(self, keyword):
        """清理关键词"""
        # 移除特殊字符和数字
        keyword = re.sub(r'[^\u4e00-\u9fa5a-zA-Z]', '', keyword)
        # 过滤掉常见停用词和通用词汇
        stop_words = {
            # 新闻类通用词（保留一些可能有意义的词）
            '新闻', '资讯', '报道', '消息', '通知', '公告', 
            '访谈', '专访', '实录', '直击', '观察', '分析', '解析',
            '专题', '独家', '追踪', '要闻', '看点', '报告',
            # 时间词
            '今日', '昨日', '今天', '昨天', '最新', '热门',
            '本周', '本月', '今年', '去年', '近日', '日前', '目前',
            # 通用动词
            '相关', '有关', '关于', '进行', '开展', '实施',
            '发生', '出现', '显示', '表示', '认为', '指出', '提到',
            '迎来', '面临', '遇到', '达到', '实现', '完成', '开始',
            # 代词和量词
            '一个', '一些', '这个', '那个', '我们', '他们', '自己',
            '多个', '几个', '所有', '全部', '部分', '大量', '少量',
            # 过于通用的词
            '问题', '情况', '方面', '内容', '结果', '效果', '影响',
            '作用', '意义', '价值', '水平', '能力', '条件', '环境'
        }
        return keyword if keyword not in stop_words and len(keyword) >= self.min_length else None

    def get_site_articles(self, site_hostname, days):
        """获取指定站点的文章"""
        try:
            # 获取站点
            if site_hostname == 'localhost':
                site = Site.objects.get(is_default_site=True)
            else:
                site = Site.objects.get(hostname=site_hostname)
            
            # 计算时间范围
            since_date = timezone.now() - timedelta(days=days)
            
            # 查询文章
            articles = ArticlePage.objects.live().filter(
                first_published_at__gte=since_date
            ).filter(
                # 通过页面树关系获取站点下的文章
                depth__gte=3  # 通常文章在站点根页面的子页面中
            ).order_by('-first_published_at')[:1000]  # 限制查询数量
            
            self.stdout.write(f'找到 {articles.count()} 篇文章')
            return articles
            
        except Site.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'站点 {site_hostname} 不存在')
            )
            return ArticlePage.objects.none()

    def analyze_articles(self, articles):
        """分析文章提取关键词"""
        keyword_weights = Counter()
        keyword_articles = {}  # 记录关键词出现的文章数
        
        total_articles = len(articles)
        self.stdout.write(f'开始分析 {total_articles} 篇文章...')
        
        for i, article in enumerate(articles):
            if i % 100 == 0:
                self.stdout.write(f'处理进度: {i}/{total_articles}')
            
            # 合并标题和摘要进行分析
            text_content = []
            if hasattr(article, 'title') and article.title:
                text_content.append(article.title)
            if hasattr(article, 'search_description') and article.search_description:
                text_content.append(article.search_description)
            if hasattr(article, 'introduction') and article.introduction:
                text_content.append(article.introduction)
            
            combined_text = ' '.join(text_content)
            
            # 提取关键词
            keywords = self.extract_keywords_from_text(combined_text, topK=15)
            
            for keyword, weight in keywords:
                cleaned_keyword = self.clean_keyword(keyword)
                if cleaned_keyword:
                    # 标题中的关键词权重更高
                    title_boost = 2.0 if hasattr(article, 'title') and cleaned_keyword in article.title else 1.0
                    
                    # 最近文章权重更高
                    if hasattr(article, 'first_published_at') and article.first_published_at:
                        days_ago = (timezone.now() - article.first_published_at).days
                        time_boost = max(0.5, 1.0 - (days_ago / 30.0))  # 30天内线性衰减
                    else:
                        time_boost = 0.5
                    
                    final_weight = weight * title_boost * time_boost
                    keyword_weights[cleaned_keyword] += final_weight
                    
                    # 记录文章数
                    if cleaned_keyword not in keyword_articles:
                        keyword_articles[cleaned_keyword] = set()
                    keyword_articles[cleaned_keyword].add(article.id)
        
        return keyword_weights, keyword_articles

    def generate_trending_data(self, keyword_weights, keyword_articles, limit):
        """生成热搜榜数据"""
        # 按权重排序
        top_keywords = keyword_weights.most_common(limit)
        
        trending_data = []
        for rank, (keyword, weight) in enumerate(top_keywords, 1):
            # 计算搜索次数（基于权重和文章数）
            article_count = len(keyword_articles.get(keyword, set()))
            search_count = max(10, int(weight * article_count * random.uniform(0.8, 1.2)))
            
            # 随机生成趋势变化
            changes = ['hot', 'up', 'stable', 'down', 'new']
            weights = [0.1, 0.3, 0.4, 0.15, 0.05]  # 权重分布
            change = random.choices(changes, weights=weights)[0]
            
            trending_data.append({
                'text': keyword,
                'rank': rank,
                'change': change,
                'score': int(weight * 100),
                'count': search_count,
                'article_count': article_count
            })
        
        return trending_data

    def insert_to_clickhouse(self, trending_data, site):
        """将热搜数据插入ClickHouse作为搜索事件"""
        client = self.get_clickhouse_client()
        if not client:
            return False
        
        try:
            # 生成搜索事件数据
            events = []
            base_time = timezone.now()
            
            for item in trending_data:
                # 为每个热搜词生成多个搜索事件
                search_count = item['count']
                keyword = item['text']
                
                # 在过去几天内分布搜索事件
                for i in range(min(search_count, 200)):  # 限制单个词的事件数量
                    # 随机分布在过去7天内
                    random_hours = random.randint(0, 168)  # 7天 * 24小时
                    event_time = base_time - timedelta(hours=random_hours)
                    
                    events.append((
                        event_time,
                        f'user_{random.randint(1000, 9999)}',  # 随机用户ID
                        f'device_{random.randint(1000, 9999)}',  # 随机设备ID
                        f'session_{random.randint(1000, 9999)}',  # 随机会话ID
                        'search',
                        f'article_{random.randint(1, 1000)}',  # 随机文章ID
                        'recommend',
                        site,
                        0,  # dwell_ms
                        keyword  # search_query
                    ))
            
            # 批量插入
            if events:
                client.execute(
                    """
                    INSERT INTO events (ts,user_id,device_id,session_id,event,article_id,channel,site,dwell_ms,search_query)
                    VALUES
                    """,
                    events
                )
                
                self.stdout.write(
                    self.style.SUCCESS(f'成功插入 {len(events)} 条搜索事件')
                )
                return True
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'插入ClickHouse失败: {e}')
            )
            return False
        
        return False

    def handle(self, *args, **options):
        self.min_length = options['min_length']
        site = options['site']
        days = options['days']
        limit = options['limit']
        dry_run = options['dry_run']
        
        self.stdout.write(
            self.style.SUCCESS(f'开始生成热搜榜数据...')
        )
        self.stdout.write(f'站点: {site}')
        self.stdout.write(f'分析天数: {days}')
        self.stdout.write(f'生成数量: {limit}')
        self.stdout.write(f'最小长度: {self.min_length}')
        
        # 1. 获取文章
        articles = self.get_site_articles(site, days)
        if not articles:
            self.stdout.write(
                self.style.ERROR('没有找到文章数据')
            )
            return
        
        # 2. 分析关键词
        keyword_weights, keyword_articles = self.analyze_articles(articles)
        
        if not keyword_weights:
            self.stdout.write(
                self.style.ERROR('没有提取到有效关键词')
            )
            return
        
        # 3. 生成热搜数据
        trending_data = self.generate_trending_data(keyword_weights, keyword_articles, limit)
        
        # 4. 显示结果
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('生成的热搜榜数据:'))
        self.stdout.write('='*60)
        
        for item in trending_data[:20]:  # 只显示前20个
            self.stdout.write(
                f"{item['rank']:2d}. {item['text']:10s} "
                f"(分数: {item['score']:4d}, 搜索: {item['count']:3d}, "
                f"文章: {item['article_count']:2d}, 趋势: {item['change']})"
            )
        
        if len(trending_data) > 20:
            self.stdout.write(f'... 还有 {len(trending_data) - 20} 个热搜词')
        
        # 5. 写入ClickHouse
        if not dry_run:
            self.stdout.write('\n开始写入ClickHouse...')
            success = self.insert_to_clickhouse(trending_data, site)
            if success:
                self.stdout.write(
                    self.style.SUCCESS('✅ 热搜榜初始化完成！')
                )
            else:
                self.stdout.write(
                    self.style.ERROR('❌ 写入ClickHouse失败')
                )
        else:
            self.stdout.write(
                self.style.WARNING('\n🔍 这是预览模式，没有写入数据库')
            )
            self.stdout.write('如需写入，请移除 --dry-run 参数')
