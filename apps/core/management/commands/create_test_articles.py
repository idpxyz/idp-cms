#!/usr/bin/env python3
"""
创建测试文章 - 为网站添加丰富的内容

用法：
  python manage.py create_test_articles --count=50  # 创建50篇文章
  python manage.py create_test_articles --channels=tech,finance  # 指定频道
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from wagtail.models import Site
from apps.news.models import ArticlePage
from apps.core.models import Channel, Region
from datetime import datetime, timedelta
import random
import json

class Command(BaseCommand):
    help = "创建测试文章，让网站内容更丰富"

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=30,
            help='创建文章数量（默认30篇）',
        )
        parser.add_argument(
            '--site',
            type=str,
            default='aivoya.com',
            help='目标站点（默认aivoya.com）',
        )
        parser.add_argument(
            '--channels',
            type=str,
            help='指定频道（逗号分隔，如：tech,finance）',
        )
        parser.add_argument(
            '--nowish',
            action='store_true',
            help='使用当前时间±随机分钟作为发布时间（更接近实时）',
        )

    def handle(self, *args, **options):
        count = options['count']
        site_hostname = options['site']
        channels_arg = options.get('channels')
        nowish = options.get('nowish', False)

        self.stdout.write(f"🚀 开始创建 {count} 篇测试文章...")

        # 获取站点
        try:
            site = Site.objects.get(hostname=site_hostname)
            self.stdout.write(f"📍 目标站点: {site.hostname} (ID: {site.id})")
        except Site.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"❌ 站点 {site_hostname} 不存在"))
            return

        # 获取根页面
        root_page = site.root_page
        self.stdout.write(f"📄 根页面: {root_page.title} (ID: {root_page.id})")

        # 获取可用频道
        if channels_arg:
            channel_slugs = [c.strip() for c in channels_arg.split(',')]
            channels = Channel.objects.filter(slug__in=channel_slugs)
        else:
            channels = Channel.objects.all()[:10]  # 取前10个频道

        if not channels.exists():
            self.stdout.write(self.style.ERROR("❌ 没有找到可用频道"))
            return

        self.stdout.write(f"📺 使用频道: {[c.name for c in channels]}")

        # 暂时不使用地区，避免验证问题
        regions = []

        # 文章模板
        article_templates = self.get_article_templates()

        created_count = 0
        for i in range(count):
            try:
                article = self.create_article(
                    root_page, channels, regions, article_templates, i, nowish=nowish
                )
                created_count += 1
                
                if (i + 1) % 10 == 0:
                    self.stdout.write(f"✅ 已创建 {i + 1} 篇文章...")
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ 创建第 {i+1} 篇文章失败: {e}"))

        self.stdout.write(self.style.SUCCESS(f"🎉 成功创建 {created_count} 篇文章！"))
        
        # 建议重新索引
        self.stdout.write("\n💡 建议运行以下命令重新索引：")
        self.stdout.write(f"   python manage.py reindex_all_articles --site={site_hostname}")

    def create_article(self, parent, channels, regions, templates, index, nowish=False):
        """创建单篇文章"""
        template = random.choice(templates)
        channel = random.choice(channels)
        region = None  # 暂时不使用地区
        
        # 生成发布时间
        if nowish:
            # 使用当前时间±随机分钟（仅向过去偏移，避免未来未发布）
            base = timezone.now()
            minutes_offset = random.randint(-120, 0)
            publish_time = base + timedelta(minutes=minutes_offset)
        else:
            # 固定为某日内的随机时间（历史数据）
            today = datetime(2025, 9, 6)
            hours_ago = random.randint(0, 23)
            minutes_ago = random.randint(0, 59)
            publish_time = today.replace(
                hour=hours_ago,
                minute=minutes_ago,
                second=0,
                microsecond=0
            )

        # 创建文章
        article = ArticlePage(
            title=template['title'].format(
                num=index + 1,
                channel=channel.name,
                date=publish_time.strftime('%m月%d日')
            ),
            excerpt=template['excerpt'],
            body=json.dumps([{
                "type": "paragraph",
                "value": template['content']
            }]),
            channel=channel,
            region=region,
            author_name=random.choice([
                '张记者', '李编辑', '王通讯员', '赵专员', '钱分析师',
                '孙观察家', '周评论员', '吴记者', '郑编辑', '刘通讯员'
            ]),
            is_featured=random.choice([True, False, False, False]),  # 25%精选
            weight=random.randint(0, 100),
            publish_at=publish_time,
            has_video=random.choice([True, False, False]),  # 33%有视频
            source_type='internal',
            allow_aggregate=True,
        )

        # 添加到父页面
        parent.add_child(instance=article)
        
        # 发布文章
        article.save_revision().publish()
        
        return article

    def get_article_templates(self):
        """获取文章模板"""
        return [
            {
                'title': '重大突破！{channel}领域迎来新发展 - {date}要闻第{num}期',
                'excerpt': '据最新消息，相关部门在{channel}领域取得重大突破，这一消息引起了广泛关注。',
                'content': '今日，相关部门宣布在重要领域取得突破性进展。据了解，这一成果将对行业发展产生重要影响。专家表示，这标志着我国在该领域的技术水平达到了新高度。相关负责人在接受采访时表示，将继续加大投入，推动技术创新和应用。'
            },
            {
                'title': '深度分析：{channel}行业发展趋势报告 - {date}第{num}篇',
                'excerpt': '最新发布的行业报告显示，{channel}领域正呈现出新的发展趋势和机遇。',
                'content': '根据最新发布的行业分析报告，当前市场环境下出现了诸多新的发展机遇。报告指出，技术创新正在推动行业向更高质量发展。业内专家认为，未来几年将是关键的发展窗口期，需要抓住机遇，迎接挑战。'
            },
            {
                'title': '聚焦热点：{channel}领域最新动态追踪 - {date}观察{num}',
                'excerpt': '本期为您带来{channel}领域的最新动态和深度解读，把握发展脉搏。',
                'content': '近期，相关领域出现了一系列值得关注的新动态。从政策层面看，相关部门正在加强顶层设计和统筹规划。从市场层面看，各方主体积极响应，推出了一系列创新举措。这些变化将对未来发展产生深远影响。'
            },
            {
                'title': '独家解读：{channel}政策解析与影响评估 - {date}专题{num}',
                'excerpt': '权威专家深度解读最新政策，分析对{channel}行业的具体影响。',
                'content': '针对最新出台的相关政策，权威专家进行了深度解读。专家认为，新政策体现了高层对该领域的高度重视，为行业发展指明了方向。政策的出台将有效促进资源优化配置，推动高质量发展。'
            },
            {
                'title': '现场直击：{channel}重要会议召开 - {date}会议报道{num}',
                'excerpt': '重要会议在京召开，与会代表就{channel}发展进行深入交流。',
                'content': '今日，重要会议在北京隆重召开。会议邀请了相关领域的专家学者和业界代表，共同探讨发展大计。与会代表一致认为，当前面临着重要的历史机遇，需要凝聚共识，形成合力，推动事业向前发展。'
            },
            {
                'title': '数据看点：{channel}最新统计数据发布 - {date}数据{num}',
                'excerpt': '官方发布最新统计数据，{channel}各项指标表现亮眼。',
                'content': '据官方最新发布的统计数据显示，相关指标继续保持良好发展态势。数据反映出发展质量稳步提升，结构不断优化。分析人士指出，这些积极变化得益于各项政策措施的有效实施和各方面的共同努力。'
            },
            {
                'title': '专访实录：{channel}领域专家访谈 - {date}访谈{num}',
                'excerpt': '知名专家接受专访，畅谈{channel}发展前景和挑战。',
                'content': '在接受记者专访时，知名专家就当前形势和未来发展进行了深入分析。专家表示，虽然面临一些挑战，但总体发展前景依然乐观。关键是要坚持创新驱动，加强协调配合，不断提升发展质量和效益。'
            },
            {
                'title': '市场观察：{channel}投资机会分析 - {date}投资{num}',
                'excerpt': '市场分析师深度解析{channel}领域的投资价值和风险。',
                'content': '资深市场分析师认为，当前市场环境为投资者提供了新的机遇。从基本面看，相关领域具备良好的发展基础和增长潜力。但同时也要注意防范各种风险，做好风险管理和资产配置。'
            }
        ]
