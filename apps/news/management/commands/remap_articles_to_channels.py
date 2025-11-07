"""
根据关键词重新映射文章到正确频道的管理命令
"""
from django.core.management.base import BaseCommand
from apps.news.models import ArticlePage
from apps.core.models import Channel
from django.db.models import Q


class Command(BaseCommand):
    help = "根据关键词重新映射文章到经济产业和社会民生频道"

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='预演模式，不实际修改'
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=0,
            help='限制处理的文章数量（0表示全部）'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        limit = options['limit']
        
        self.stdout.write(self.style.WARNING(
            f"{'[预演模式] ' if dry_run else ''}开始重新映射文章到频道..."
        ))
        
        # 获取目标频道
        try:
            economy_channel = Channel.objects.get(slug='economy')
            society_channel = Channel.objects.get(slug='society')
        except Channel.DoesNotExist as e:
            self.stdout.write(self.style.ERROR(f"频道不存在: {e}"))
            return
        
        # 定义关键词
        # 经济产业关键词（优先级：标题权重高）
        economy_keywords = {
            'title_high': ['经济发展', '产业发展', '招商引资', '项目签约', '企业', 'GDP', '经济增长'],
            'title_medium': ['投资', '金融', '银行', '股市', '基金', '产业', '制造业', '工业'],
            'title_low': ['市场', '商业', '贸易', '出口', '进口'],
            'content': ['经济', '产业链', '供应链', '营商环境']
        }
        
        # 社会民生关键词
        society_keywords = {
            'title_high': ['民生', '就业', '养老', '社保', '医保', '住房保障', '困难群众'],
            'title_medium': ['社区服务', '便民', '惠民', '居民', '群众', '百姓'],
            'title_low': ['生活', '服务', '福利'],
            'content': ['社会', '民生工程', '公共服务']
        }
        
        # 排除关键词（即使包含关键词也不应该分到这些频道）
        exclude_keywords = {
            'economy': ['文化产业', '旅游产业', '教育产业', '体育产业'],
            'society': ['社会主义', '党建', '廉政']
        }
        
        economy_moved = 0
        society_moved = 0
        
        # 1. 处理经济产业频道
        self.stdout.write("\n" + "="*60)
        self.stdout.write("🔍 查找应该属于【经济产业】频道的文章...")
        self.stdout.write("="*60)
        
        # 构建查询条件
        economy_q = Q()
        for kw in economy_keywords['title_high']:
            economy_q |= Q(title__icontains=kw)
        
        # 排除已经在经济产业频道的文章
        economy_articles = ArticlePage.objects.filter(economy_q).exclude(
            channel=economy_channel
        )
        
        # 进一步过滤：检查排除关键词
        filtered_economy = []
        for article in economy_articles[:limit] if limit else economy_articles:
            # 检查是否包含排除关键词
            should_exclude = False
            for exclude_kw in exclude_keywords['economy']:
                if exclude_kw in article.title:
                    should_exclude = True
                    break
            
            if not should_exclude:
                filtered_economy.append(article)
        
        self.stdout.write(f"\n找到 {len(filtered_economy)} 篇文章需要移动到【经济产业】频道\n")
        
        for i, article in enumerate(filtered_economy[:20], 1):  # 显示前20个示例
            old_channel = article.channel.name if article.channel else "无"
            self.stdout.write(
                f"  [{i}] {article.title[:60]}...\n"
                f"      {old_channel} → 经济产业"
            )
        
        if len(filtered_economy) > 20:
            self.stdout.write(f"  ... 还有 {len(filtered_economy) - 20} 篇\n")
        
        # 执行移动（使用批量更新）
        if not dry_run and filtered_economy:
            article_ids = [article.id for article in filtered_economy]
            updated_count = ArticlePage.objects.filter(id__in=article_ids).update(
                channel=economy_channel
            )
            economy_moved = updated_count
            self.stdout.write(self.style.SUCCESS(
                f"✅ 已批量移动 {economy_moved} 篇文章到【经济产业】频道"
            ))
        
        # 2. 处理社会民生频道
        self.stdout.write("\n" + "="*60)
        self.stdout.write("🔍 查找应该属于【社会民生】频道的文章...")
        self.stdout.write("="*60)
        
        society_q = Q()
        for kw in society_keywords['title_high']:
            society_q |= Q(title__icontains=kw)
        for kw in society_keywords['title_medium']:
            society_q |= Q(title__icontains=kw)
        
        # 排除已经在社会民生频道的文章
        society_articles = ArticlePage.objects.filter(society_q).exclude(
            channel=society_channel
        )
        
        # 进一步过滤
        filtered_society = []
        for article in society_articles[:limit] if limit else society_articles:
            should_exclude = False
            for exclude_kw in exclude_keywords['society']:
                if exclude_kw in article.title:
                    should_exclude = True
                    break
            
            if not should_exclude:
                filtered_society.append(article)
        
        self.stdout.write(f"\n找到 {len(filtered_society)} 篇文章需要移动到【社会民生】频道\n")
        
        for i, article in enumerate(filtered_society[:20], 1):
            old_channel = article.channel.name if article.channel else "无"
            self.stdout.write(
                f"  [{i}] {article.title[:60]}...\n"
                f"      {old_channel} → 社会民生"
            )
        
        if len(filtered_society) > 20:
            self.stdout.write(f"  ... 还有 {len(filtered_society) - 20} 篇\n")
        
        # 执行移动（使用批量更新）
        if not dry_run and filtered_society:
            article_ids = [article.id for article in filtered_society]
            updated_count = ArticlePage.objects.filter(id__in=article_ids).update(
                channel=society_channel
            )
            society_moved = updated_count
            self.stdout.write(self.style.SUCCESS(
                f"✅ 已批量移动 {society_moved} 篇文章到【社会民生】频道"
            ))
        
        # 3. 总结
        self.stdout.write("\n" + "="*60)
        if dry_run:
            self.stdout.write(self.style.WARNING(
                f"[预演模式] 将移动：\n"
                f"  - 经济产业：{len(filtered_economy)} 篇\n"
                f"  - 社会民生：{len(filtered_society)} 篇"
            ))
            self.stdout.write("\n提示：去掉 --dry-run 参数执行实际移动")
        else:
            self.stdout.write(self.style.SUCCESS(
                f"✅ 重新映射完成！\n"
                f"  - 经济产业：{economy_moved} 篇\n"
                f"  - 社会民生：{society_moved} 篇"
            ))
            self.stdout.write("\n💡 提示：运行 reindex_all_articles 更新搜索索引")
        self.stdout.write("="*60 + "\n")

