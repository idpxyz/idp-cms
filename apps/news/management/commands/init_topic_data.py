"""
Django管理命令：初始化专题系统测试数据
创建TopicTemplate记录、示例专题和测试文章
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from wagtail.models import Site
from django.db import transaction
from datetime import datetime, timedelta
import random

from apps.news.models.topic import Topic, TopicTemplate
from apps.news.models.article import ArticlePage
from apps.core.models.channel import Channel
from wagtail.models import Page


class Command(BaseCommand):
    help = '初始化专题系统测试数据：创建模板、专题和示例文章'

    def add_arguments(self, parser):
        parser.add_argument(
            '--skip-templates',
            action='store_true',
            help='跳过创建TopicTemplate记录（如果已存在）'
        )
        parser.add_argument(
            '--skip-topics',
            action='store_true',
            help='跳过创建示例专题数据'
        )
        parser.add_argument(
            '--skip-articles',
            action='store_true',
            help='跳过创建示例文章'
        )
        parser.add_argument(
            '--clear-existing',
            action='store_true',
            help='清除现有的测试数据（谨慎使用）'
        )

    def handle(self, *args, **options):
        """执行数据初始化"""
        self.stdout.write(
            self.style.SUCCESS('🚀 开始初始化专题系统测试数据...\n')
        )

        try:
            with transaction.atomic():
                # 1. 清除现有数据（如果指定）
                if options['clear_existing']:
                    self._clear_existing_data()

                # 2. 创建TopicTemplate记录
                if not options['skip_templates']:
                    self._create_topic_templates()

                # 3. 创建示例专题数据
                if not options['skip_topics']:
                    self._create_sample_topics()

                # 4. 创建示例文章并关联专题
                if not options['skip_articles']:
                    self._create_sample_articles()

                self.stdout.write(
                    self.style.SUCCESS('\n✅ 专题系统测试数据初始化完成！')
                )
                self._print_summary()

        except Exception as e:
            raise CommandError(f'初始化失败: {str(e)}')

    def _clear_existing_data(self):
        """清除现有的测试数据"""
        self.stdout.write('🗑️  清除现有测试数据...')
        
        # 删除测试专题（小心不要删除真实数据）
        test_topics = Topic.objects.filter(
            slug__startswith='test-'
        )
        count = test_topics.count()
        test_topics.delete()
        
        self.stdout.write(f'   删除了 {count} 个测试专题')

    def _create_topic_templates(self):
        """创建TopicTemplate记录"""
        self.stdout.write('📁 创建专题模板记录...')
        
        templates_data = [
            {
                'name': '默认专题模板',
                'slug': 'default',
                'file_name': 'DefaultTopicTemplate.tsx',
                'description': '通用的专题展示模板，适用于大多数专题',
                'is_active': True,
                'is_default': True,
                'order': 0
            },
            {
                'name': '突发事件专题模板',
                'slug': 'breaking',
                'file_name': 'BreakingTopicTemplate.tsx',
                'description': '突发重大事件专题模板，红色警示主题，强调紧急性',
                'is_active': True,
                'is_default': False,
                'order': 10
            },
            {
                'name': '国家级专题模板',
                'slug': 'national',
                'file_name': 'NationalTopicTemplate.tsx',
                'description': '国家级重大专题模板，庄重正式的红金主题',
                'is_active': True,
                'is_default': False,
                'order': 20
            },
            {
                'name': '时间线专题模板',
                'slug': 'timeline',
                'file_name': 'TimelineTopicTemplate.tsx',
                'description': '时间线型专题模板，强调事件发展轨迹和历史意义',
                'is_active': True,
                'is_default': False,
                'order': 30
            }
        ]

        created_count = 0
        for template_data in templates_data:
            template, created = TopicTemplate.objects.get_or_create(
                slug=template_data['slug'],
                defaults=template_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(f'   ✅ 创建模板: {template.name}')
            else:
                self.stdout.write(f'   📋 模板已存在: {template.name}')

        self.stdout.write(f'   共创建了 {created_count} 个新模板\n')

    def _create_sample_topics(self):
        """创建示例专题数据"""
        self.stdout.write('🏷️  创建示例专题数据...')
        
        # 获取所有Wagtail站点
        sites = list(Site.objects.all())
        if not sites:
            # 如果没有Wagtail站点，创建一个默认站点
            try:
                from wagtail.models import Page
                # 获取根页面
                root_page = Page.objects.filter(depth=1).first()
                if root_page:
                    default_site, created = Site.objects.get_or_create(
                        hostname='localhost',
                        defaults={
                            'port': 3000,
                            'site_name': '本地开发站点',
                            'root_page': root_page,
                            'is_default_site': True
                        }
                    )
                    sites = [default_site]
                    if created:
                        self.stdout.write('   ✅ 创建了默认Wagtail站点: localhost:3000')
                else:
                    self.stdout.write('   ⚠️ 没有根页面，跳过站点关联')
                    sites = []
            except Exception as e:
                self.stdout.write(f'   ⚠️ 站点创建失败: {str(e)}，跳过站点关联')
                sites = []
        
        templates = {
            template.slug: template 
            for template in TopicTemplate.objects.filter(is_active=True)
        }

        # 示例专题数据
        topics_data = [
            {
                'title': '四川6.8级地震救援专题',
                'slug': 'test-sichuan-earthquake-2024',
                'summary': '四川阿坝州发生6.8级地震，各方救援力量火速集结，全力开展抢险救灾工作。本专题将持续跟踪报道救援进展、灾情动态和重建情况。',
                'importance_level': 'national',
                'status': 'ongoing',
                'is_breaking': True,
                'priority_weight': 1800,
                'template_slug': 'breaking',
                'tags': ['突发事件', '自然灾害', '地震', '救援', '四川'],
                'start_date': timezone.now() - timedelta(hours=6),
                'end_date': None,
                'is_active': True,
                'is_featured': True
            },
            {
                'title': '庆祝中华人民共和国成立75周年',
                'slug': 'test-national-day-75th',
                'summary': '2024年10月1日，中华人民共和国迎来75周年华诞。全国各地举行盛大庆典活动，回顾光辉历程，展望美好未来，凝聚奋进力量。',
                'importance_level': 'national',
                'status': 'ongoing',
                'is_breaking': False,
                'priority_weight': 1500,
                'template_slug': 'national',
                'tags': ['国庆节', '国家庆典', '75周年', '建国纪念', '爱国主义'],
                'start_date': timezone.make_aware(datetime(2024, 9, 15)),
                'end_date': timezone.make_aware(datetime(2024, 10, 15)),
                'is_active': True,
                'is_featured': True
            },
            {
                'title': '纪念汶川地震16周年',
                'slug': 'test-wenchuan-memorial-16th',
                'summary': '2024年5月12日，汶川地震16周年纪念日。回顾抗震救灾的伟大壮举，缅怀逝去的同胞，致敬重建中的坚强不屈，传承抗震救灾精神。',
                'importance_level': 'major',
                'status': 'memorial',
                'is_breaking': False,
                'priority_weight': 800,
                'template_slug': 'timeline',
                'tags': ['纪念活动', '汶川地震', '16周年', '缅怀同胞', '重建精神'],
                'start_date': timezone.make_aware(datetime(2024, 5, 12)),
                'end_date': timezone.make_aware(datetime(2024, 5, 12)),
                'is_active': True,
                'is_featured': False
            },
            {
                'title': '全国两会2024专题报道',
                'slug': 'test-national-congress-2024',
                'summary': '2024年全国两会在北京胜利召开。聚焦政府工作报告、重要提案议案、代表委员建议，全面报道两会盛况和重要成果。',
                'importance_level': 'national',
                'status': 'concluded',
                'is_breaking': False,
                'priority_weight': 1200,
                'template_slug': 'national',
                'tags': ['全国两会', '人大会议', '政协会议', '政府工作报告', '民主政治'],
                'start_date': timezone.make_aware(datetime(2024, 3, 5)),
                'end_date': timezone.make_aware(datetime(2024, 3, 15)),
                'is_active': True,
                'is_featured': False
            },
            {
                'title': '科技创新发展专题',
                'slug': 'test-tech-innovation-2024',
                'summary': '聚焦我国科技创新发展的重要成就和突破，展现科技强国建设的新进展，报道前沿科技、创新成果和科研动态。',
                'importance_level': 'specialized',
                'status': 'ongoing',
                'is_breaking': False,
                'priority_weight': 600,
                'template_slug': 'default',
                'tags': ['科技创新', '科研成果', '创新发展', '科技强国', '前沿科技'],
                'start_date': timezone.make_aware(datetime(2024, 1, 1)),
                'end_date': None,
                'is_active': True,
                'is_featured': False
            }
        ]

        created_count = 0
        for topic_data in topics_data:
            template_slug = topic_data.pop('template_slug')
            template = templates.get(template_slug)
            
            topic, created = Topic.objects.get_or_create(
                slug=topic_data['slug'],
                defaults={
                    **topic_data,
                    'template': template
                }
            )
            
            if created:
                # 添加站点关联 - 只有在有站点时才关联
                if sites:
                    try:
                        topic.sites.set([site.id for site in sites])
                        self.stdout.write(f'      🌐 关联站点: {", ".join([f"{site.hostname}:{site.port}" for site in sites])}')
                    except Exception as e:
                        self.stdout.write(
                            self.style.WARNING(f'      ⚠️ 站点关联失败: {str(e)}')
                        )
                else:
                    self.stdout.write('      📍 跳过站点关联（无可用站点）')
                
                # 保存对象以确保tags管理器正常工作
                topic.save()
                
                # 添加标签
                tags_list = topic_data.get('tags', [])
                if tags_list and hasattr(topic.tags, 'add'):
                    for tag in tags_list:
                        try:
                            topic.tags.add(tag)
                        except Exception as e:
                            self.stdout.write(
                                self.style.WARNING(f'   ⚠️ 添加标签"{tag}"失败: {str(e)}')
                            )
                
                created_count += 1
                self.stdout.write(f'   ✅ 创建专题: {topic.title}')
                self.stdout.write(f'      📋 模板: {template.name if template else "默认"}')
                self.stdout.write(f'      🏷️  标签: {", ".join(topic_data.get("tags", []))}')
            else:
                self.stdout.write(f'   📋 专题已存在: {topic.title}')

        self.stdout.write(f'   共创建了 {created_count} 个新专题\n')

    def _create_sample_articles(self):
        """创建示例文章并关联专题"""
        self.stdout.write('📰 创建示例文章并关联专题...')
        
        # 获取合适的父页面（根页面或第一个可用页面）
        try:
            # 尝试获取根页面
            root_page = Page.objects.filter(depth=1).first()
            if not root_page:
                # 如果没有根页面，获取任何可用的页面作为父页面
                parent_page = Page.objects.filter(depth__gte=1).first()
                if not parent_page:
                    self.stdout.write(
                        self.style.WARNING('   ⚠️ 未找到合适的父页面，跳过创建文章')
                    )
                    return
            else:
                parent_page = root_page
            
            self.stdout.write(f'   📄 使用父页面: {parent_page.title}')
            
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(f'   ⚠️ 无法获取父页面: {str(e)}，跳过创建文章')
            )
            return

        # 获取默认频道
        default_channel = Channel.objects.filter(is_active=True).first()
        
        # 获取测试专题
        topics = Topic.objects.filter(slug__startswith='test-')
        
        if not topics.exists():
            self.stdout.write('   ⚠️ 没有找到测试专题，跳过创建文章')
            return

        # 为每个专题创建文章
        created_count = 0
        for topic in topics:
            article_count = random.randint(3, 6)  # 每个专题3-6篇文章
            
            for i in range(article_count):
                # 生成文章标题和内容
                article_title = self._generate_article_title(topic, i)
                article_content = self._generate_article_content(topic, i)
                
                # 创建文章页面
                article_slug = f'{topic.slug}-article-{i+1}'
                
                # 检查文章是否已存在
                if ArticlePage.objects.filter(slug=article_slug).exists():
                    continue
                
                try:
                    # 创建文章页面
                    article = ArticlePage(
                        title=article_title,
                        slug=article_slug,
                        summary=article_content[:200] + '...' if len(article_content) > 200 else article_content,
                        content=article_content,
                        author='系统测试',
                        source='测试数据源',
                        is_breaking_news=topic.is_breaking and i == 0,  # 第一篇文章设为突发
                        topic_importance=random.randint(70, 100),  # 专题重要度
                        channel=default_channel,
                        show_in_menus=False,  # 测试文章不显示在菜单中
                    )
                    
                    # 添加到父页面下
                    parent_page.add_child(instance=article)
                    
                    # 发布文章
                    article.save_revision().publish()
                    
                    # 关联专题
                    article.topics.add(topic)
                    
                    created_count += 1
                    self.stdout.write(f'   ✅ 创建文章: {article_title[:50]}...')
                    
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'   ❌ 创建文章失败: {str(e)}')
                    )

        self.stdout.write(f'   共创建了 {created_count} 篇测试文章\n')

    def _generate_article_title(self, topic, index):
        """生成文章标题"""
        title_patterns = {
            'breaking': [
                f'{topic.title.split("专题")[0]}最新进展：救援工作取得重要突破',
                f'{topic.title.split("专题")[0]}现场直击：各方救援力量全力投入',
                f'{topic.title.split("专题")[0]}权威发布：最新伤亡情况和救援部署',
                f'{topic.title.split("专题")[0]}感人瞬间：生死救援中的温暖力量',
                f'{topic.title.split("专题")[0]}专家解读：地质情况分析与预警',
                f'{topic.title.split("专题")[0]}后续工作：灾后重建规划启动',
            ],
            'national': [
                f'{topic.title}系列报道：回顾光辉历程',
                f'{topic.title}特别策划：展望美好未来',
                f'{topic.title}深度观察：发展成就综述',
                f'{topic.title}现场报道：庆典活动盛况',
                f'{topic.title}专家访谈：历史意义解读',
                f'{topic.title}民生关注：人民生活变化',
            ],
            'timeline': [
                f'{topic.title}：历史回顾与深度思考',
                f'{topic.title}：珍贵影像资料首次公开',
                f'{topic.title}：亲历者讲述真实故事',
                f'{topic.title}：专家学者深度解读',
                f'{topic.title}：传承精神激励后人',
                f'{topic.title}：纪念意义与现实启示',
            ],
            'default': [
                f'{topic.title}：最新发展动态',
                f'{topic.title}：深度分析报道',
                f'{topic.title}：专家观点解读',
                f'{topic.title}：现场调研报告',
                f'{topic.title}：政策解读分析',
                f'{topic.title}：未来展望预测',
            ]
        }
        
        # 根据专题模板选择标题模式
        template_slug = topic.template.slug if topic.template else 'default'
        patterns = title_patterns.get(template_slug, title_patterns['default'])
        
        if index < len(patterns):
            return patterns[index]
        else:
            return f'{topic.title}相关报道 {index + 1}'

    def _generate_article_content(self, topic, index):
        """生成文章内容"""
        content_templates = {
            'breaking': f"""
            【最新消息】{topic.title.split("专题")[0]}持续引发关注。根据最新消息，相关部门已经启动应急响应机制，各项救援工作正在有序开展。

            现场情况：
            - 救援队伍已抵达现场，正在进行紧急搜救
            - 医疗队伍随时待命，确保伤员得到及时救治  
            - 交通部门正在抢修受损道路，保障救援通道畅通
            - 通信部门全力保障现场通信联络

            专家表示，当前救援工作面临一定挑战，但在各方共同努力下，相信能够最大限度减少损失。我们将持续跟踪报道最新进展。

            【温馨提示】请广大民众关注官方权威发布，不信谣不传谣。
            """,
            'national': f"""
            今天，我们迎来了{topic.title}这一重要时刻。这不仅是一个值得庆祝的日子，更是我们回顾历史、展望未来的重要契机。

            历史回顾：
            - 从建国初期的艰难起步到今天的繁荣发展
            - 改革开放以来取得的辉煌成就
            - 新时代中国特色社会主义的伟大实践

            现实意义：
            今天的庆典不仅展现了我们的发展成就，更体现了全国人民的团结一心和奋发向上的精神风貌。

            未来展望：
            在新的历史起点上，我们要继续坚持党的领导，贯彻新发展理念，为实现中华民族伟大复兴的中国梦而努力奋斗。
            """,
            'timeline': f"""
            时光荏苒，{topic.title}让我们再次回到那个特殊的时刻。历史是最好的教科书，通过回顾这段重要历史，我们能够更好地理解过去、把握现在、开创未来。

            历史背景：
            在特定的历史条件下，这一事件的发生有着深刻的历史必然性。

            发展过程：
            - 事件的起因和背景
            - 发展过程中的重要节点
            - 各方的应对措施和反应
            - 最终的结果和影响

            历史意义：
            这一事件不仅在当时产生了重大影响，而且对后来的发展产生了深远的历史意义。

            现实启示：
            历史告诉我们，只有坚持正确的道路，团结一心，才能战胜各种困难和挑战。
            """,
            'default': f"""
            关于{topic.title}的最新报道。

            背景介绍：
            这是一个具有重要意义的专题，涉及多个方面的内容和发展动态。

            主要内容：
            - 相关政策解读和分析
            - 最新发展动态和趋势
            - 专家观点和建议
            - 实践案例和经验分享

            深度分析：
            从多个角度对这一专题进行深入分析，为读者提供全面、准确的信息。

            结论：
            通过综合分析，我们可以看出这一专题的重要性和未来发展前景。
            """
        }
        
        template_slug = topic.template.slug if topic.template else 'default'
        base_content = content_templates.get(template_slug, content_templates['default'])
        
        # 添加一些随机性
        additional_info = [
            "\n\n【编辑观点】这一事件的发展值得我们持续关注。",
            "\n\n【相关链接】更多详细信息请关注后续报道。",
            "\n\n【读者互动】欢迎广大读者参与讨论，分享您的观点。",
        ]
        
        return base_content + random.choice(additional_info)

    def _print_summary(self):
        """打印初始化结果总结"""
        self.stdout.write('\n📊 初始化结果总结:')
        self.stdout.write('=' * 50)
        
        # 统计模板数量
        template_count = TopicTemplate.objects.count()
        active_template_count = TopicTemplate.objects.filter(is_active=True).count()
        self.stdout.write(f'📁 专题模板: {active_template_count}/{template_count} (活跃/总数)')
        
        # 统计专题数量
        topic_count = Topic.objects.count()
        active_topic_count = Topic.objects.filter(is_active=True).count()
        test_topic_count = Topic.objects.filter(slug__startswith='test-').count()
        self.stdout.write(f'🏷️  专题数量: {active_topic_count}/{topic_count} (活跃/总数)')
        self.stdout.write(f'🧪 测试专题: {test_topic_count}')
        
        # 统计文章数量
        total_articles = ArticlePage.objects.count()
        test_articles = ArticlePage.objects.filter(slug__contains='test-').count()
        self.stdout.write(f'📰 文章数量: {total_articles} (测试文章: {test_articles})')
        
        # 打印各模板使用情况
        self.stdout.write('\n🎨 模板使用情况:')
        for template in TopicTemplate.objects.filter(is_active=True):
            topic_count = Topic.objects.filter(template=template, is_active=True).count()
            self.stdout.write(f'   {template.name}: {topic_count} 个专题')
        
        # 打印测试页面链接
        self.stdout.write('\n🔗 测试页面链接:')
        test_topics = Topic.objects.filter(slug__startswith='test-', is_active=True)
        for topic in test_topics:
            self.stdout.write(f'   📄 {topic.title}: /portal/topic/{topic.slug}')
        
        self.stdout.write('\n🎉 现在可以访问这些页面测试专题模板效果了！')
