"""
创建2025年国庆节专题相关文章的管理命令
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from datetime import datetime, timedelta

from apps.news.models import ArticlePage, Topic
from apps.core.models import Channel, Category
from wagtail.models import Site, Page


class Command(BaseCommand):
    help = '创建2025年国庆节专题相关文章'

    def handle(self, *args, **options):
        try:
            with transaction.atomic():
                self._create_national_day_articles()
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'创建文章失败: {str(e)}')
            )

    def _create_national_day_articles(self):
        """创建国庆节相关文章"""
        self.stdout.write('🎊 开始创建2025年国庆节专题相关文章...')
        
        # 获取专题
        try:
            topic = Topic.objects.get(slug='prc-76th-anniversary-2025')
            self.stdout.write(f'✅ 找到专题: {topic.title}')
        except Topic.DoesNotExist:
            self.stdout.write(self.style.ERROR('❌ 未找到国庆节专题'))
            return

        # 获取或创建频道和分类
        politics_channel, created = Channel.objects.get_or_create(
            slug='politics',
            defaults={
                'name': '政治',
                'description': '政治新闻和时事报道'
            }
        )
        if created:
            self.stdout.write('✅ 创建政治频道')

        celebration_category, created = Category.objects.get_or_create(
            slug='celebration', 
            defaults={
                'name': '庆典活动',
                'description': '国家庆典和重大活动'
            }
        )
        if created:
            self.stdout.write('✅ 创建庆典活动分类')

        # 获取门户页面和站点
        try:
            # 查找门户页面
            parent_page = None
            
            # 方法1: 查找标题包含"门户"的页面
            portal_pages = Page.objects.filter(title__icontains='门户', live=True)
            if portal_pages.exists():
                parent_page = portal_pages.first()
                self.stdout.write(f'✅ 找到门户页面: {parent_page.title}')
            
            # 方法2: 查找slug包含"portal"的页面
            if not parent_page:
                portal_pages = Page.objects.filter(slug__icontains='portal', live=True)
                if portal_pages.exists():
                    parent_page = portal_pages.first()
                    self.stdout.write(f'✅ 找到portal页面: {parent_page.title}')
            
            # 方法3: 使用深度为2的首页
            if not parent_page:
                home_pages = Page.objects.filter(depth=2, live=True)
                if home_pages.exists():
                    parent_page = home_pages.first()
                    self.stdout.write(f'✅ 使用首页作为父页面: {parent_page.title}')
            
            # 方法4: 最后使用根页面
            if not parent_page:
                parent_page = Page.objects.get(id=1)  # Root page
                self.stdout.write(f'⚠️ 使用根页面: {parent_page.title}')
            
            sites = Site.objects.all()
            self.stdout.write(f'📍 将在页面 "{parent_page.title}" 下创建文章')
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'获取页面结构失败: {str(e)}'))
            return

        # 文章数据
        articles_data = [
            {
                'title': '天安门广场盛大阅兵式举行 庆祝中华人民共和国成立76周年',
                'slug': 'tiananmen-square-parade-prc-76th-2025',
                'excerpt': '2025年10月1日上午，庆祝中华人民共和国成立76周年大会在北京天安门广场隆重举行。习近平主席检阅三军，展现人民军队崭新风貌。',
                'author_name': '新华社记者',
                'is_featured': True,
                'weight': 100,
                'tags': ['阅兵', '天安门', '国庆节', '76周年']
            },
            {
                'title': '76年辉煌成就展：从站起来到富起来再到强起来',
                'slug': 'prc-76-years-glorious-achievements-2025',
                'excerpt': '中华人民共和国成立76年来，从一穷二白到世界第二大经济体，中国人民在中国共产党领导下创造了人类发展史上的伟大奇迹。',
                'author_name': '人民日报记者',
                'is_featured': True,
                'weight': 95,
                'tags': ['成就', '发展', '76周年', '新中国']
            },
            {
                'title': '群众游行展现时代风采 全民共庆祖国华诞',
                'slug': 'mass-parade-celebrates-national-day-2025',
                'excerpt': '国庆节当天，来自各行各业的群众代表组成36个方阵，踏着铿锵有力的步伐走过天安门广场，展现新时代中国人民的精神风貌。',
                'author_name': '央视新闻',
                'is_featured': True,
                'weight': 90,
                'tags': ['游行', '群众', '庆典', '国庆节']
            },
            {
                'title': '经济发展创造奇迹 中国GDP稳居世界第二',
                'slug': 'china-economic-miracle-gdp-second-2025',
                'excerpt': '2025年，中国经济总量突破新高度，人均GDP持续增长。高质量发展成果显著，为全球经济复苏贡献中国力量。',
                'author_name': '经济日报记者',
                'is_featured': False,
                'weight': 85,
                'tags': ['经济', 'GDP', '发展', '成就']
            },
            {
                'title': '科技创新成果丰硕 中国航天、AI技术领跑世界',
                'slug': 'china-tech-innovation-aerospace-ai-2025',
                'excerpt': '2025年，中国在航天探索、人工智能、量子技术等前沿科技领域取得重大突破，彰显科技强国建设成效。',
                'author_name': '科技日报记者',
                'is_featured': False,
                'weight': 80,
                'tags': ['科技', '创新', '航天', 'AI', '量子技术']
            },
            {
                'title': '全国各省市举办庆祝活动 56个民族共庆华诞',
                'slug': 'nationwide-celebration-56-ethnic-2025',
                'excerpt': '国庆节期间，全国31个省区市和港澳台地区纷纷举办庆祝活动。56个民族同胞以不同形式表达对祖国的热爱和祝福。',
                'author_name': '光明日报记者',
                'is_featured': False,
                'weight': 75,
                'tags': ['庆祝', '民族', '全国', '活动']
            },
            {
                'title': '多国政要致电祝贺中华人民共和国成立76周年',
                'slug': 'international-congratulations-prc-76th-2025',
                'excerpt': '国庆节前后，俄罗斯、巴基斯坦、老挝等多国领导人致电或致函，祝贺中华人民共和国成立76周年，赞赏中国发展成就。',
                'author_name': '外交部发言人',
                'is_featured': False,
                'weight': 70,
                'tags': ['外交', '国际', '祝贺', '友好']
            },
            {
                'title': '港澳台同胞共庆国庆 一国两制成果丰硕',
                'slug': 'hk-macao-taiwan-celebrate-national-2025',
                'excerpt': '香港、澳门特别行政区和台湾地区同胞以各种方式庆祝国庆节，体现了中华民族血浓于水的深厚感情和对祖国统一的美好愿望。',
                'author_name': '港澳台办新闻发言人',
                'is_featured': False,
                'weight': 68,
                'tags': ['港澳台', '一国两制', '统一', '庆祝']
            },
            {
                'title': '人民群众：生活越来越好 为祖国发展感到骄傲',
                'slug': 'peoples-voice-proud-of-china-development-2025',
                'excerpt': '国庆节期间，记者走访全国各地，倾听人民群众的心声。大家纷纷表示，生活水平不断提高，为祖国的发展成就感到无比骄傲。',
                'author_name': '中央广播电视总台记者',
                'is_featured': False,
                'weight': 65,
                'tags': ['人民', '生活', '骄傲', '发展']
            },
            {
                'title': '青年学子：传承红色基因 担当时代使命',
                'slug': 'young-students-carry-on-mission-2025',
                'excerpt': '全国高校学子在国庆节期间开展形式多样的庆祝活动，表示要传承红色基因，勇担时代使命，为实现中华民族伟大复兴贡献青春力量。',
                'author_name': '中国青年报记者',
                'is_featured': False,
                'weight': 62,
                'tags': ['青年', '学生', '红色基因', '使命']
            }
        ]

        # 创建文章
        created_count = 0
        for i, article_data in enumerate(articles_data, 1):
            self.stdout.write(f'创建文章 {i}/{len(articles_data)}: {article_data["title"][:30]}...')
            
            # 检查是否已存在
            if ArticlePage.objects.filter(slug=article_data['slug']).exists():
                self.stdout.write(f'⚠️ 文章已存在，跳过: {article_data["slug"]}')
                continue

            try:
                # 创建发布时间（国庆节前后的随机时间）
                base_date = timezone.make_aware(datetime(2025, 10, 1, 8, 0, 0))
                publish_time = base_date + timedelta(hours=i*2, minutes=i*15)

                # 创建文章页面
                # 创建文章正文内容
                body_content = f"""
<h2>{article_data['title']}</h2>
<p><strong>{article_data['excerpt']}</strong></p>
<p>2025年10月1日，中华人民共和国迎来成立76周年华诞。这是一个值得全国人民共同庆祝的重要时刻，标志着新中国在中国共产党领导下走过了76年的光辉历程。</p>
<p>从1949年到2025年，中国人民在党的领导下，实现了从站起来、富起来到强起来的历史性飞跃。经济建设、政治建设、文化建设、社会建设、生态文明建设全面推进，中国特色社会主义事业取得了举世瞩目的伟大成就。</p>
<p>在这个特殊的日子里，我们回顾历史，展望未来，更加坚定了走中国特色社会主义道路的信心和决心。让我们紧密团结在以习近平同志为核心的党中央周围，为实现中华民族伟大复兴的中国梦而努力奋斗！</p>
<p><em>记者：{article_data['author_name']}</em></p>
                """.strip()

                article = ArticlePage(
                    title=article_data['title'],
                    slug=article_data['slug'],
                    excerpt=article_data['excerpt'],
                    body=body_content,  # 添加正文内容
                    author_name=article_data['author_name'],
                    is_featured=article_data['is_featured'],
                    weight=article_data['weight'],
                    channel=politics_channel,
                    first_published_at=publish_time,
                    last_published_at=publish_time,
                    live=True,
                    has_unpublished_changes=False
                )

                # 添加到门户页面下
                parent_page.add_child(instance=article)

                # 注意：ArticlePage继承自Wagtail的Page，站点关联通过父页面自动处理

                # 添加分类
                article.categories.add(celebration_category)

                # 关联专题
                article.topics.add(topic)

                # 添加标签
                article.save()
                for tag in article_data['tags']:
                    article.tags.add(tag)

                created_count += 1
                self.stdout.write(f'✅ 创建成功: {article.slug}')
                
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'⚠️ 创建文章失败: {article_data["slug"]} - {str(e)}')
                )

        # 最终统计
        self.stdout.write(
            self.style.SUCCESS(f'🎉 国庆节文章创建完成! 共创建 {created_count} 篇文章')
        )
        
        # 显示专题访问信息
        self.stdout.write('🔗 专题访问地址:')
        self.stdout.write(f'   http://localhost:3001/portal/topic/{topic.slug}')
        
        # 更新专题文章数量
        article_count = ArticlePage.objects.filter(topics=topic).count()
        self.stdout.write(f'📊 专题总文章数: {article_count}')
