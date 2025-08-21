#!/usr/bin/env python3
"""
批量生成AI门户网站示例数据
遵循Wagtail 7.1开发规范
"""

import time
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import random

from apps.ai_tools.models import AIToolPage
from apps.ai_news.models import AINewsPage  
from apps.ai_tutorials.models import AITutorialPage
from apps.home.models import HomePage
from wagtail.models import Site


class Command(BaseCommand):
    help = '批量生成AI门户网站示例数据'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='清除现有数据后再生成',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('清除现有数据...')
            AIToolPage.objects.all().delete()
            AINewsPage.objects.all().delete()
            AITutorialPage.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('✅ 现有数据已清除'))

        # 获取现有页面作为父页面
        try:
            from wagtail.models import Page
            # 使用根页面作为父页面，因为它已经有子页面，树结构完整
            parent_page = Page.objects.get(id=1)  # 获取根页面
            self.stdout.write('✅ 找到根页面作为父页面')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ 无法获取父页面: {e}'))
            return

        # 生成AI工具数据
        self.stdout.write('生成AI工具数据...')
        self.generate_ai_tools(parent_page)
        
        # 生成AI资讯数据
        self.stdout.write('生成AI资讯数据...')
        self.generate_ai_news(parent_page)
        
        # 生成AI教程数据
        self.stdout.write('生成AI教程数据...')
        self.generate_ai_tutorials(parent_page)
        
        self.stdout.write(self.style.SUCCESS('🎉 所有示例数据生成完成！'))

    def generate_ai_tools(self, parent_page):
        """生成AI工具示例数据"""
        ai_tools_data = [
            {
                'title': 'ChatGPT',
                'description': 'OpenAI开发的强大对话AI，能够进行自然对话、写作辅助、代码生成等多种任务',
                'tool_url': 'https://chat.openai.com',
                'category': 'chatbot',
                'pricing': 'freemium',
                'features': ['自然对话', '多语言支持', '知识问答', '写作辅助', '代码生成'],
                'rating': 4.9,
                'usage_count': 1000000,
                'is_hot': True,
                'is_new': False,
                'tags': ['对话', 'AI助手', '写作', 'OpenAI']
            },
            {
                'title': 'Midjourney',
                'description': '领先的AI艺术图像生成工具，能创造出高质量、富有创意的艺术作品',
                'tool_url': 'https://midjourney.com',
                'category': 'image-generation',
                'pricing': 'paid',
                'features': ['艺术创作', '高质量图像', '风格控制', '商业授权'],
                'rating': 4.8,
                'usage_count': 600000,
                'is_hot': True,
                'is_new': False,
                'tags': ['图像生成', '艺术', '创作', 'Discord']
            }
        ]

        for i, tool_data in enumerate(ai_tools_data):
            # 创建页面但不保存
            tool = AIToolPage(
                title=tool_data['title'],
                description=tool_data['description'],
                tool_url=tool_data['tool_url'],
                category=tool_data['category'],
                pricing=tool_data['pricing'],
                features=tool_data['features'],
                rating=tool_data['rating'],
                usage_count=tool_data['usage_count'],
                is_hot=tool_data['is_hot'],
                is_new=tool_data['is_new'],
                slug=f"ai-tool-{i+1}"
            )
            
            # 使用Wagtail的标准方法添加子页面
            created_tool = parent_page.add_child(instance=tool)
            
            # 添加标签
            for tag in tool_data['tags']:
                created_tool.tags.add(tag)
            
            # 保存标签
            created_tool.save()

        self.stdout.write(self.style.SUCCESS(f'✅ 生成了 {len(ai_tools_data)} 个AI工具'))

    def generate_ai_news(self, parent_page):
        """生成AI资讯示例数据"""
        ai_news_data = [
            # 技术突破类新闻
            {
                'title': 'OpenAI发布GPT-5，推理能力大幅提升',
                'introduction': '最新版本GPT-5在数学推理、代码生成和多模态理解方面都有显著提升，标志着AI技术的又一重大突破。',
                'body': '<p>OpenAI今日正式发布GPT-5，这是继GPT-4之后的最新一代大语言模型。</p>',
                'source': 'TechCrunch',
                'source_url': 'https://techcrunch.com',
                'category': 'technology',
                'is_hot': True,
                'is_top': True,
                'read_count': 15000,
                'image_url': 'https://example.com/images/gpt5-announcement.jpg',
                'author_name': 'Sarah Johnson',
                'has_video': False,
                'tags': ['OpenAI', 'GPT-5', '大语言模型', '技术突破']
            },
            {
                'title': 'Google推出Gemini Ultra 2.0，多模态能力显著增强',
                'introduction': 'Google最新AI模型在图像理解、视频分析和跨模态推理方面取得重大突破，性能超越前代产品。',
                'body': '<p>Google今日发布Gemini Ultra 2.0，新版本在多个AI基准测试中创下新纪录。</p>',
                'source': 'The Verge',
                'source_url': 'https://theverge.com',
                'category': 'technology',
                'is_hot': True,
                'is_top': False,
                'read_count': 12000,
                'image_url': 'https://example.com/images/gemini-ultra.jpg',
                'author_name': 'Mike Chen',
                'has_video': True,
                'tags': ['Google', 'Gemini', '多模态AI', '技术突破']
            },
            {
                'title': 'Meta开源LLaMA 3，支持100种语言',
                'introduction': 'Meta发布新一代开源大语言模型，在低资源语言理解和翻译方面表现优异。',
                'body': '<p>LLaMA 3采用了创新的多语言训练方法，为全球AI研究社区提供重要资源。</p>',
                'source': 'CNBC',
                'source_url': 'https://cnbc.com',
                'category': 'technology',
                'is_hot': False,
                'is_top': False,
                'read_count': 8000,
                'image_url': 'https://example.com/images/llama3.jpg',
                'author_name': 'David Wilson',
                'has_video': False,
                'tags': ['Meta', '开源', '多语言', 'LLaMA']
            },
            {
                'title': 'NVIDIA发布H200芯片，AI训练性能提升3倍',
                'introduction': 'NVIDIA新一代AI芯片采用5nm工艺，在AI训练和推理方面性能大幅提升。',
                'body': '<p>H200芯片特别优化了大语言模型的训练和部署，为AI研究提供强大算力支持。</p>',
                'source': 'Reuters',
                'source_url': 'https://reuters.com',
                'category': 'technology',
                'is_hot': True,
                'is_top': False,
                'read_count': 9500,
                'image_url': 'https://example.com/images/nvidia-h200.jpg',
                'author_name': 'Lisa Zhang',
                'has_video': False,
                'tags': ['NVIDIA', 'AI芯片', '硬件', '性能提升']
            },
            {
                'title': '微软推出Copilot Pro，编程助手能力大幅增强',
                'introduction': '微软AI编程助手新增代码重构、测试生成等高级功能，支持更多编程语言。',
                'body': '<p>Copilot Pro为开发者提供更强大的AI辅助编程体验，显著提高开发效率。</p>',
                'source': 'The Verge',
                'source_url': 'https://theverge.com',
                'category': 'technology',
                'is_hot': False,
                'is_top': False,
                'read_count': 7000,
                'image_url': 'https://example.com/images/copilot-pro.jpg',
                'author_name': 'Alex Brown',
                'has_video': True,
                'tags': ['微软', 'Copilot', '编程助手', 'AI工具']
            },
            # 产品发布类新闻
            {
                'title': 'Anthropic发布Claude 3.5 Sonnet，推理能力大幅提升',
                'introduction': 'Claude 3.5 Sonnet在复杂推理、代码生成和创意写作方面表现优异，性能超越前代产品。',
                'body': '<p>新版本采用了更先进的训练方法和架构设计，为用户提供更强大的AI助手体验。</p>',
                'source': 'TechCrunch',
                'source_url': 'https://techcrunch.com',
                'category': 'product',
                'is_hot': True,
                'is_top': False,
                'read_count': 11000,
                'image_url': 'https://example.com/images/claude-35.jpg',
                'author_name': 'Emma Davis',
                'has_video': False,
                'tags': ['Anthropic', 'Claude', '产品发布', 'AI助手']
            },
            {
                'title': 'Stability AI推出Stable Diffusion 3，图像质量显著提升',
                'introduction': '最新版本的Stable Diffusion在图像质量、细节表现和艺术风格方面都有重大改进。',
                'body': '<p>新版本支持更高分辨率的图像生成，为创作者提供更强大的工具。</p>',
                'source': 'Ars Technica',
                'source_url': 'https://arstechnica.com',
                'category': 'product',
                'is_hot': True,
                'is_top': False,
                'read_count': 9000,
                'image_url': 'https://example.com/images/stable-diffusion-3.jpg',
                'author_name': 'Tom Anderson',
                'has_video': True,
                'tags': ['Stability AI', 'Stable Diffusion', '图像生成', 'AI艺术']
            },
            {
                'title': 'Runway发布Gen-3 Alpha，视频生成质量大幅提升',
                'introduction': 'Gen-3 Alpha在视频生成质量、时长和一致性方面都有显著改进，支持更复杂的场景生成。',
                'body': '<p>新版本为内容创作者和电影制作人提供了更强大的AI视频生成工具。</p>',
                'source': 'Variety',
                'source_url': 'https://variety.com',
                'category': 'product',
                'is_hot': False,
                'is_top': False,
                'read_count': 7500,
                'image_url': 'https://example.com/images/runway-gen3.jpg',
                'author_name': 'Maria Garcia',
                'has_video': True,
                'tags': ['Runway', '视频生成', 'AI创作', '内容制作']
            },
            {
                'title': 'Hugging Face推出HuggingChat，开源聊天机器人',
                'introduction': 'Hugging Face发布开源聊天机器人，支持多种语言模型，为开发者提供免费AI对话服务。',
                'body': '<p>该工具支持多种开源模型，用户可以自由选择和切换不同的AI模型。</p>',
                'source': 'VentureBeat',
                'source_url': 'https://venturebeat.com',
                'category': 'product',
                'is_hot': False,
                'is_top': False,
                'read_count': 6000,
                'image_url': 'https://example.com/images/huggingchat.jpg',
                'author_name': 'Chris Lee',
                'has_video': False,
                'tags': ['Hugging Face', '开源', '聊天机器人', 'AI对话']
            },
            {
                'title': 'Cohere发布Command R+，企业级AI模型',
                'introduction': 'Cohere推出专为企业设计的AI模型，在安全性、可解释性和定制化方面表现优异。',
                'body': '<p>Command R+为企业提供了安全可靠的AI解决方案，支持私有化部署。</p>',
                'source': 'TechCrunch',
                'source_url': 'https://techcrunch.com',
                'category': 'product',
                'is_hot': False,
                'is_top': False,
                'read_count': 5500,
                'image_url': 'https://example.com/images/cohere-command.jpg',
                'author_name': 'Rachel Kim',
                'has_video': False,
                'tags': ['Cohere', '企业AI', '安全', '定制化']
            },
            # 投资融资类新闻
            {
                'title': 'OpenAI完成新一轮融资，估值达到800亿美元',
                'introduction': 'OpenAI完成新一轮融资，投资者对其AI技术前景充满信心，公司估值创下新高。',
                'body': '<p>本轮融资将用于进一步的技术研发和产品商业化，推动AI技术的普及应用。</p>',
                'source': 'Bloomberg',
                'source_url': 'https://bloomberg.com',
                'category': 'investment',
                'is_hot': True,
                'is_top': True,
                'read_count': 18000,
                'image_url': 'https://example.com/images/openai-funding.jpg',
                'author_name': 'John Smith',
                'has_video': False,
                'tags': ['OpenAI', '融资', '估值', '投资']
            },
            {
                'title': 'Anthropic获得50亿美元投资，加速AI模型开发',
                'introduction': 'Anthropic获得来自多家科技巨头的投资，将用于开发更安全、更可靠的AI模型。',
                'body': '<p>投资方包括Google、Amazon等科技巨头，体现了对AI安全性的重视。</p>',
                'source': 'Reuters',
                'source_url': 'https://reuters.com',
                'category': 'investment',
                'is_hot': True,
                'is_top': False,
                'read_count': 14000,
                'image_url': 'https://example.com/images/anthropic-funding.jpg',
                'author_name': 'Sarah Wilson',
                'has_video': False,
                'tags': ['Anthropic', '融资', 'AI安全', '投资']
            },
            {
                'title': 'AI芯片初创公司Cerebras完成新一轮融资',
                'introduction': '专注于AI芯片设计的Cerebras完成新一轮融资，将用于扩大生产规模和技术研发。',
                'body': '<p>该公司的大规模AI芯片在训练大型模型方面表现出色，获得投资者青睐。</p>',
                'source': 'TechCrunch',
                'source_url': 'https://techcrunch.com',
                'category': 'investment',
                'is_hot': False,
                'is_top': False,
                'read_count': 8500,
                'image_url': 'https://example.com/images/cerebras-funding.jpg',
                'author_name': 'Mike Johnson',
                'has_video': False,
                'tags': ['Cerebras', 'AI芯片', '融资', '硬件']
            },
            {
                'title': 'AI医疗诊断公司获得2亿美元投资',
                'introduction': '专注于AI医疗诊断的初创公司完成新一轮融资，将用于临床试验和产品商业化。',
                'body': '<p>该公司的AI诊断系统在多个疾病检测中表现优异，为医疗AI发展开辟新道路。</p>',
                'source': 'FierceBiotech',
                'source_url': 'https://fiercebiotech.com',
                'category': 'investment',
                'is_hot': False,
                'is_top': False,
                'read_count': 7000,
                'image_url': 'https://example.com/images/ai-medical-funding.jpg',
                'author_name': 'Lisa Chen',
                'has_video': False,
                'tags': ['AI医疗', '诊断', '融资', '医疗科技']
            },
            {
                'title': 'AI教育平台获得1.5亿美元投资',
                'introduction': 'AI驱动的在线教育平台完成新一轮融资，将用于技术升级和全球市场扩张。',
                'body': '<p>该平台利用AI技术提供个性化学习体验，获得教育投资者的大力支持。</p>',
                'source': 'EdSurge',
                'source_url': 'https://edsurge.com',
                'category': 'investment',
                'is_hot': False,
                'is_top': False,
                'read_count': 6000,
                'image_url': 'https://example.com/images/ai-education-funding.jpg',
                'author_name': 'David Brown',
                'has_video': False,
                'tags': ['AI教育', '在线学习', '融资', '教育科技']
            },
            # 研究突破类新闻
            {
                'title': 'AI在医疗诊断领域取得重大突破，准确率超过人类医生',
                'introduction': '最新研究显示，AI诊断系统在多种疾病检测中的准确率首次超过人类医生平均水平。',
                'body': '<p>该研究发表在《Nature Medicine》上，为AI辅助诊断的临床应用提供了重要依据。</p>',
                'source': 'Nature',
                'source_url': 'https://nature.com',
                'category': 'research',
                'is_hot': True,
                'is_top': False,
                'read_count': 16000,
                'image_url': 'https://example.com/images/ai-medical-breakthrough.jpg',
                'author_name': 'Dr. Emily Wang',
                'has_video': False,
                'tags': ['AI医疗', '诊断', '研究突破', '临床应用']
            },
            {
                'title': 'AI发现新型抗生素，对抗耐药细菌',
                'introduction': 'MIT研究团队利用AI技术发现了一种新型抗生素，能够有效对抗多种耐药细菌。',
                'body': '<p>这一发现为解决抗生素耐药性问题提供了新的可能性，展示了AI在药物发现中的巨大潜力。</p>',
                'source': 'Science',
                'source_url': 'https://science.org',
                'category': 'research',
                'is_hot': True,
                'is_top': False,
                'read_count': 13000,
                'image_url': 'https://example.com/images/ai-antibiotic.jpg',
                'author_name': 'Dr. James Chen',
                'has_video': False,
                'tags': ['AI药物发现', '抗生素', '耐药性', 'MIT']
            },
            {
                'title': 'AI预测蛋白质结构准确率创历史新高',
                'introduction': 'DeepMind的AlphaFold系统在蛋白质结构预测方面取得重大突破，准确率大幅提升。',
                'body': '<p>这一技术为药物设计和疾病研究提供了重要工具，推动了结构生物学的发展。</p>',
                'source': 'Nature',
                'source_url': 'https://nature.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 11000,
                'image_url': 'https://example.com/images/alphafold-protein.jpg',
                'author_name': 'Dr. Sarah Johnson',
                'has_video': True,
                'tags': ['DeepMind', 'AlphaFold', '蛋白质结构', '生物信息学']
            },
            {
                'title': 'AI在量子计算领域取得重要进展',
                'introduction': '研究人员利用AI技术优化量子算法，在量子计算性能方面取得重要突破。',
                'body': '<p>这一进展为量子计算的实际应用奠定了基础，推动了量子信息技术的发展。</p>',
                'source': 'Physical Review Letters',
                'source_url': 'https://journals.aps.org',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 9000,
                'image_url': 'https://example.com/images/ai-quantum.jpg',
                'author_name': 'Dr. Michael Brown',
                'has_video': False,
                'tags': ['AI', '量子计算', '量子算法', '物理研究']
            },
            {
                'title': 'AI辅助材料科学发现新型超导体',
                'introduction': '科学家利用AI技术发现了一种新型超导材料，在室温下表现出超导特性。',
                'body': '<p>这一发现为超导技术的实际应用开辟了新道路，具有重要的科学和工程价值。</p>',
                'source': 'Science',
                'source_url': 'https://science.org',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 8000,
                'image_url': 'https://example.com/images/ai-superconductor.jpg',
                'author_name': 'Dr. Lisa Zhang',
                'has_video': False,
                'tags': ['AI材料科学', '超导体', '室温超导', '材料发现']
            },
            # 政策法规类新闻
            {
                'title': '欧盟通过AI监管法案，建立全球首个AI治理框架',
                'introduction': '欧盟议会通过AI监管法案，为AI技术的负责任发展建立了全面的监管框架。',
                'body': '<p>该法案将AI系统分为四个风险等级，为全球AI治理提供了重要参考。</p>',
                'source': 'Reuters',
                'source_url': 'https://reuters.com',
                'category': 'policy',
                'is_hot': True,
                'is_top': True,
                'read_count': 17000,
                'image_url': 'https://example.com/images/eu-ai-regulation.jpg',
                'author_name': 'Maria Rodriguez',
                'has_video': False,
                'tags': ['欧盟', 'AI监管', '政策法规', '治理框架']
            },
            {
                'title': '美国发布AI行政令，推动AI安全发展',
                'introduction': '白宫发布AI行政令，要求AI公司进行安全测试并报告AI系统能力。',
                'body': '<p>该行政令旨在确保AI技术的安全发展，平衡创新与风险控制。</p>',
                'source': 'The New York Times',
                'source_url': 'https://nytimes.com',
                'category': 'policy',
                'is_hot': True,
                'is_top': False,
                'read_count': 15000,
                'image_url': 'https://example.com/images/us-ai-executive-order.jpg',
                'author_name': 'John Davis',
                'has_video': False,
                'tags': ['美国', 'AI行政令', '安全测试', '政策']
            },
            {
                'title': '中国发布AI治理指南，促进AI健康发展',
                'introduction': '中国发布AI治理指南，强调AI技术的安全、可控和可持续发展。',
                'body': '<p>该指南为AI技术的健康发展提供了重要指导，体现了负责任AI的理念。</p>',
                'source': '新华社',
                'source_url': 'https://xinhuanet.com',
                'category': 'policy',
                'is_hot': False,
                'is_top': False,
                'read_count': 12000,
                'image_url': 'https://example.com/images/china-ai-governance.jpg',
                'author_name': 'Li Wei',
                'has_video': False,
                'tags': ['中国', 'AI治理', '发展指南', '政策']
            },
            {
                'title': '联合国成立AI咨询机构，推动全球AI合作',
                'introduction': '联合国成立AI咨询机构，旨在促进全球AI技术的合作发展和治理。',
                'body': '<p>该机构将为国际AI政策制定提供建议，推动AI技术的全球合作。</p>',
                'source': 'UN News',
                'source_url': 'https://news.un.org',
                'category': 'policy',
                'is_hot': False,
                'is_top': False,
                'read_count': 10000,
                'image_url': 'https://example.com/images/un-ai-advisory.jpg',
                'author_name': 'Antonio Guterres',
                'has_video': False,
                'tags': ['联合国', 'AI咨询', '全球合作', '国际治理']
            },
            {
                'title': '英国发布AI安全峰会成果，推动国际合作',
                'introduction': '英国举办AI安全峰会，各国就AI安全治理达成重要共识。',
                'body': '<p>峰会成果为全球AI安全治理提供了重要框架，推动了国际合作。</p>',
                'source': 'BBC',
                'source_url': 'https://bbc.com',
                'category': 'policy',
                'is_hot': False,
                'is_top': False,
                'read_count': 9000,
                'image_url': 'https://example.com/images/uk-ai-summit.jpg',
                'author_name': 'Emma Thompson',
                'has_video': True,
                'tags': ['英国', 'AI安全峰会', '国际合作', '治理']
            },
            # 应用案例类新闻
            {
                'title': 'AI在金融风控领域应用取得显著成效',
                'introduction': '多家银行采用AI技术进行风险评估，显著提高了风控效率和准确性。',
                'body': '<p>AI风控系统能够实时分析大量数据，识别潜在风险，为金融安全提供保障。</p>',
                'source': 'Financial Times',
                'source_url': 'https://ft.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 8500,
                'image_url': 'https://example.com/images/ai-financial-risk.jpg',
                'author_name': 'Robert Wilson',
                'has_video': False,
                'tags': ['AI金融', '风控', '银行', '应用案例']
            },
            {
                'title': 'AI助力制造业数字化转型，生产效率提升30%',
                'introduction': '智能工厂利用AI技术优化生产流程，在质量控制和效率提升方面取得显著成果。',
                'body': '<p>AI系统能够预测设备故障，优化生产计划，推动制造业向智能化方向发展。</p>',
                'source': 'Manufacturing Today',
                'source_url': 'https://manufacturingtoday.com',
                'category': 'industry',
                'is_hot': False,
                'is_top': False,
                'read_count': 7500,
                'image_url': 'https://example.com/images/ai-manufacturing.jpg',
                'author_name': 'Jennifer Lee',
                'has_video': True,
                'tags': ['AI制造', '数字化转型', '智能工厂', '效率提升']
            },
            {
                'title': 'AI在教育领域应用广泛，个性化学习效果显著',
                'introduction': 'AI教育平台为学生提供个性化学习路径，显著提高了学习效果和参与度。',
                'body': '<p>AI系统能够分析学生学习行为，提供定制化教学内容，推动教育模式创新。</p>',
                'source': 'EdTech Magazine',
                'source_url': 'https://edtechmagazine.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 7000,
                'image_url': 'https://example.com/images/ai-education.jpg',
                'author_name': 'Dr. Sarah Chen',
                'has_video': False,
                'tags': ['AI教育', '个性化学习', '教育创新', '学习效果']
            },
            {
                'title': 'AI在零售业应用广泛，客户体验大幅提升',
                'introduction': '零售商利用AI技术提供个性化推荐和智能客服，显著提升了客户满意度。',
                'body': '<p>AI系统能够分析客户行为，提供精准的产品推荐，优化购物体验。</p>',
                'source': 'Retail Dive',
                'source_url': 'https://retaildive.com',
                'category': 'industry',
                'is_hot': False,
                'is_top': False,
                'read_count': 6500,
                'image_url': 'https://example.com/images/ai-retail.jpg',
                'author_name': 'Michael Brown',
                'has_video': False,
                'tags': ['AI零售', '个性化推荐', '智能客服', '客户体验']
            },
            {
                'title': 'AI在物流领域应用成熟，配送效率显著提升',
                'introduction': '物流公司采用AI技术优化配送路线和仓储管理，大幅提高了运营效率。',
                'body': '<p>AI系统能够预测需求，优化库存，实现智能化的物流管理。</p>',
                'source': 'Supply Chain Dive',
                'source_url': 'https://supplychaindive.com',
                'category': 'industry',
                'is_hot': False,
                'is_top': False,
                'read_count': 6000,
                'image_url': 'https://example.com/images/ai-logistics.jpg',
                'author_name': 'David Kim',
                'has_video': False,
                'tags': ['AI物流', '配送优化', '仓储管理', '效率提升']
            },
            # 行业动态类新闻
            {
                'title': 'AI芯片市场快速增长，预计2025年规模达1000亿美元',
                'introduction': 'AI芯片市场呈现爆发式增长，各大科技公司纷纷加大投资力度。',
                'body': '<p>随着AI应用的普及，对专用AI芯片的需求持续增长，市场前景广阔。</p>',
                'source': 'Market Research',
                'source_url': 'https://marketresearch.com',
                'category': 'industry',
                'is_hot': False,
                'is_top': False,
                'read_count': 7500,
                'image_url': 'https://example.com/images/ai-chip-market.jpg',
                'author_name': 'Analyst Team',
                'has_video': False,
                'tags': ['AI芯片', '市场增长', '投资', '行业动态']
            },
            {
                'title': 'AI人才需求激增，薪资水平持续上涨',
                'introduction': 'AI领域人才需求旺盛，相关岗位薪资水平大幅上涨，人才竞争激烈。',
                'body': '<p>AI工程师、数据科学家等岗位成为就业市场热点，企业争相抢夺人才。</p>',
                'source': 'LinkedIn',
                'source_url': 'https://linkedin.com',
                'category': 'industry',
                'is_hot': False,
                'is_top': False,
                'read_count': 7000,
                'image_url': 'https://example.com/images/ai-talent-demand.jpg',
                'author_name': 'HR Insights',
                'has_video': False,
                'tags': ['AI人才', '就业市场', '薪资', '人才竞争']
            },
            {
                'title': 'AI初创公司数量激增，创新生态日益活跃',
                'introduction': 'AI领域创业活动活跃，大量初创公司涌现，推动技术创新和商业化。',
                'body': '<p>投资者对AI初创公司兴趣浓厚，为AI生态发展注入活力。</p>',
                'source': 'Crunchbase',
                'source_url': 'https://crunchbase.com',
                'category': 'industry',
                'is_hot': False,
                'is_top': False,
                'read_count': 6500,
                'image_url': 'https://example.com/images/ai-startups.jpg',
                'author_name': 'Startup Analyst',
                'has_video': False,
                'tags': ['AI初创', '创业生态', '技术创新', '商业化']
            },
            {
                'title': 'AI在传统行业渗透率持续提升',
                'introduction': 'AI技术在各传统行业的应用不断深化，推动产业升级和转型。',
                'body': '<p>从制造业到服务业，AI技术正在重塑传统行业的运营模式。</p>',
                'source': 'Industry Week',
                'source_url': 'https://industryweek.com',
                'category': 'industry',
                'is_hot': False,
                'is_top': False,
                'read_count': 6000,
                'image_url': 'https://example.com/images/ai-traditional-industry.jpg',
                'author_name': 'Industry Expert',
                'has_video': False,
                'tags': ['AI应用', '传统行业', '产业升级', '数字化转型']
            },
            {
                'title': 'AI伦理和治理成为行业关注焦点',
                'introduction': '随着AI技术发展，伦理和治理问题日益重要，行业开始重视负责任AI。',
                'body': '<p>企业纷纷建立AI伦理委员会，制定相关准则，推动AI的负责任发展。</p>',
                'source': 'AI Ethics Journal',
                'source_url': 'https://aiethicsjournal.com',
                'category': 'industry',
                'is_hot': False,
                'is_top': False,
                'read_count': 5500,
                'image_url': 'https://example.com/images/ai-ethics.jpg',
                'author_name': 'Ethics Researcher',
                'has_video': False,
                'tags': ['AI伦理', '治理', '负责任AI', '行业标准']
            },
            # 技术趋势类新闻
            {
                'title': '多模态AI成为技术发展重点，融合能力显著提升',
                'introduction': '多模态AI技术快速发展，在文本、图像、音频、视频融合理解方面取得重要进展。',
                'body': '<p>多模态AI能够同时处理多种信息类型，为更智能的AI应用奠定基础。</p>',
                'source': 'AI Research Weekly',
                'source_url': 'https://airesearchweekly.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 7000,
                'image_url': 'https://example.com/images/multimodal-ai.jpg',
                'author_name': 'AI Researcher',
                'has_video': False,
                'tags': ['多模态AI', '技术趋势', '融合理解', 'AI发展']
            },
            {
                'title': '边缘AI计算快速发展，本地化部署成为趋势',
                'introduction': '边缘AI计算技术成熟，越来越多的AI应用开始向本地化部署方向发展。',
                'body': '<p>边缘AI能够提供更快的响应速度和更好的隐私保护，满足特定应用场景需求。</p>',
                'source': 'Edge Computing News',
                'source_url': 'https://edgecomputingnews.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 6500,
                'image_url': 'https://example.com/images/edge-ai.jpg',
                'author_name': 'Edge Computing Expert',
                'has_video': False,
                'tags': ['边缘AI', '本地化部署', '隐私保护', '技术趋势']
            },
            {
                'title': 'AI可解释性研究取得重要进展',
                'introduction': 'AI可解释性研究快速发展，为AI系统的透明度和可信度提供重要支持。',
                'body': '<p>可解释AI技术能够帮助用户理解AI决策过程，提高AI系统的可信度。</p>',
                'source': 'Explainable AI Journal',
                'source_url': 'https://explainableai.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 6000,
                'image_url': 'https://example.com/images/explainable-ai.jpg',
                'author_name': 'AI Ethics Researcher',
                'has_video': False,
                'tags': ['AI可解释性', '透明度', '可信度', '技术研究']
            },
            {
                'title': '联邦学习技术成熟，隐私保护AI成为可能',
                'introduction': '联邦学习技术快速发展，在保护用户隐私的同时实现AI模型训练。',
                'body': '<p>联邦学习能够在数据不出本地的情况下训练AI模型，为隐私保护AI提供解决方案。</p>',
                'source': 'Privacy Tech News',
                'source_url': 'https://privacytechnews.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 5500,
                'image_url': 'https://example.com/images/federated-learning.jpg',
                'author_name': 'Privacy Researcher',
                'has_video': False,
                'tags': ['联邦学习', '隐私保护', 'AI训练', '技术趋势']
            },
            {
                'title': 'AI与量子计算结合，开启计算新纪元',
                'introduction': 'AI与量子计算的结合为计算能力带来质的飞跃，开启计算技术新纪元。',
                'body': '<p>量子AI能够在特定问题上实现指数级性能提升，为AI发展开辟新道路。</p>',
                'source': 'Quantum Computing Report',
                'source_url': 'https://quantumcomputingreport.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 5000,
                'image_url': 'https://example.com/images/quantum-ai.jpg',
                'author_name': 'Quantum Researcher',
                'has_video': False,
                'tags': ['量子AI', '计算能力', '技术突破', '未来趋势']
            },
            # 未来展望类新闻
            {
                'title': '专家预测：2030年AI将重塑80%的工作岗位',
                'introduction': 'AI专家预测，到2030年，AI技术将重塑80%的工作岗位，创造新的就业机会。',
                'body': '<p>虽然AI会替代部分重复性工作，但也会创造更多创新性和创造性的新岗位。</p>',
                'source': 'Future of Work Institute',
                'source_url': 'https://futureofwork.org',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 8500,
                'image_url': 'https://example.com/images/ai-future-work.jpg',
                'author_name': 'Dr. Future Expert',
                'has_video': True,
                'tags': ['AI未来', '工作岗位', '就业预测', '专家观点']
            },
            {
                'title': 'AI将推动医疗革命，个性化治疗成为可能',
                'introduction': 'AI技术将推动医疗领域革命性变革，个性化治疗和精准医疗将成为现实。',
                'body': '<p>AI能够分析个人基因组数据，为患者提供定制化的治疗方案。</p>',
                'source': 'Medical AI Journal',
                'source_url': 'https://medicalai.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 7500,
                'image_url': 'https://example.com/images/ai-medical-future.jpg',
                'author_name': 'Dr. Medical AI',
                'has_video': False,
                'tags': ['AI医疗', '个性化治疗', '精准医疗', '医疗革命']
            },
            {
                'title': 'AI将改变教育模式，终身学习成为常态',
                'introduction': 'AI技术将彻底改变传统教育模式，个性化学习和终身学习将成为教育新常态。',
                'body': '<p>AI能够为每个学习者提供定制化的学习路径和内容，提高学习效率。</p>',
                'source': 'Education Future',
                'source_url': 'https://educationfuture.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 7000,
                'image_url': 'https://example.com/images/ai-education-future.jpg',
                'author_name': 'Education Futurist',
                'has_video': False,
                'tags': ['AI教育', '个性化学习', '终身学习', '教育变革']
            },
            {
                'title': 'AI将推动可持续发展，解决环境挑战',
                'introduction': 'AI技术将在应对气候变化和推动可持续发展方面发挥重要作用。',
                'body': '<p>AI能够优化能源使用、预测气候变化、保护生物多样性，为可持续发展提供技术支持。</p>',
                'source': 'Sustainability AI',
                'source_url': 'https://sustainabilityai.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 6500,
                'image_url': 'https://example.com/images/ai-sustainability.jpg',
                'author_name': 'Sustainability Expert',
                'has_video': False,
                'tags': ['AI可持续发展', '气候变化', '环境保护', '未来展望']
            },
            {
                'title': 'AI将创造新的艺术形式，推动文化创新',
                'introduction': 'AI技术将创造全新的艺术形式，推动文化创新和艺术表达方式的变革。',
                'body': '<p>AI能够生成独特的艺术作品，为艺术家提供新的创作工具和灵感来源。</p>',
                'source': 'AI Art Magazine',
                'source_url': 'https://aiartmagazine.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 6000,
                'image_url': 'https://example.com/images/ai-art-future.jpg',
                'author_name': 'AI Art Curator',
                'has_video': True,
                'tags': ['AI艺术', '文化创新', '艺术创作', '未来展望']
            },
            # 专家观点类新闻
            {
                'title': 'AI专家：AGI可能在2030-2040年实现',
                'introduction': '多位AI专家预测，通用人工智能(AGI)可能在2030-2040年实现，但需要解决关键技术挑战。',
                'body': '<p>专家们认为，AGI的实现需要在大语言模型、多模态理解和推理能力方面取得重大突破。</p>',
                'source': 'AI Expert Forum',
                'source_url': 'https://aiexpertforum.com',
                'category': 'research',
                'is_hot': True,
                'is_top': False,
                'read_count': 12000,
                'image_url': 'https://example.com/images/agi-prediction.jpg',
                'author_name': 'AI Expert Panel',
                'has_video': True,
                'tags': ['AGI', '专家预测', '技术挑战', 'AI发展']
            },
            {
                'title': '经济学家：AI将推动第四次工业革命',
                'introduction': '经济学家分析认为，AI技术将推动第四次工业革命，重塑全球经济格局。',
                'body': '<p>AI将提高生产效率，创造新的商业模式，推动经济结构转型和升级。</p>',
                'source': 'Economic Review',
                'source_url': 'https://economicreview.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 9500,
                'image_url': 'https://example.com/images/ai-industrial-revolution.jpg',
                'author_name': 'Economic Analyst',
                'has_video': False,
                'tags': ['AI经济', '工业革命', '经济转型', '专家分析']
            },
            {
                'title': '哲学家：AI发展需要建立新的伦理框架',
                'introduction': '哲学家认为，AI技术的快速发展需要建立新的伦理框架，平衡技术进步与人类价值。',
                'body': '<p>AI伦理需要关注公平性、透明度和人类尊严，确保技术发展符合人类利益。</p>',
                'source': 'Philosophy Today',
                'source_url': 'https://philosophytoday.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 8000,
                'image_url': 'https://example.com/images/ai-ethics-philosophy.jpg',
                'author_name': 'Philosophy Professor',
                'has_video': False,
                'tags': ['AI伦理', '哲学思考', '人类价值', '伦理框架']
            },
            {
                'title': '心理学家：AI将改变人类认知模式',
                'introduction': '心理学家研究发现，AI技术的使用正在改变人类的认知模式和思维方式。',
                'body': '<p>AI助手的使用可能影响人类的记忆、推理和创造力，需要关注其长期影响。</p>',
                'source': 'Psychology Research',
                'source_url': 'https://psychologyresearch.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 7500,
                'image_url': 'https://example.com/images/ai-cognition.jpg',
                'author_name': 'Cognitive Psychologist',
                'has_video': False,
                'tags': ['AI认知', '心理学', '思维方式', '人类影响']
            },
            {
                'title': '社会学家：AI将重塑社会结构',
                'introduction': '社会学家分析认为，AI技术将重塑社会结构，改变社会关系和权力分配。',
                'body': '<p>AI可能加剧社会不平等，但也为创造更公平的社会提供新的可能性。</p>',
                'source': 'Sociology Today',
                'source_url': 'https://sociologytoday.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 7000,
                'image_url': 'https://example.com/images/ai-social-structure.jpg',
                'author_name': 'Social Researcher',
                'has_video': False,
                'tags': ['AI社会', '社会结构', '社会关系', '社会影响']
            },
            # 行业分析类新闻
            {
                'title': 'AI市场规模2024年突破5000亿美元，增长势头强劲',
                'introduction': '最新市场报告显示，全球AI市场规模在2024年突破5000亿美元，预计未来五年将保持强劲增长。',
                'body': '<p>AI技术在各个行业的应用不断深化，推动市场规模持续扩大，投资热度不减。</p>',
                'source': 'Market Intelligence',
                'source_url': 'https://marketintelligence.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 9000,
                'image_url': 'https://example.com/images/ai-market-size.jpg',
                'author_name': 'Market Analyst',
                'has_video': False,
                'tags': ['AI市场', '市场规模', '增长趋势', '市场分析']
            },
            {
                'title': 'AI投资热点分析：医疗、金融、教育成为重点领域',
                'introduction': '投资机构分析显示，AI在医疗、金融、教育等领域的应用成为投资热点，前景广阔。',
                'body': '<p>这些领域具有巨大的市场潜力和应用价值，吸引了大量投资资金。</p>',
                'source': 'Investment Research',
                'source_url': 'https://investmentresearch.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 8000,
                'image_url': 'https://example.com/images/ai-investment-hotspots.jpg',
                'author_name': 'Investment Analyst',
                'has_video': False,
                'tags': ['AI投资', '投资热点', '重点领域', '市场前景']
            },
            {
                'title': 'AI人才市场分析：供需失衡，薪资持续上涨',
                'introduction': 'AI人才市场分析显示，人才供需严重失衡，相关岗位薪资水平持续上涨。',
                'body': '<p>AI技术快速发展，但人才培养速度跟不上需求增长，导致人才竞争激烈。</p>',
                'source': 'Talent Market Report',
                'source_url': 'https://talentmarketreport.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 7500,
                'image_url': 'https://example.com/images/ai-talent-market.jpg',
                'author_name': 'HR Analyst',
                'has_video': False,
                'tags': ['AI人才', '供需失衡', '薪资水平', '市场分析']
            },
            {
                'title': 'AI技术成熟度分析：部分技术已成熟，部分仍处早期',
                'introduction': '技术成熟度分析显示，AI在图像识别、自然语言处理等领域已相对成熟，但在推理、创造等方面仍处早期。',
                'body': '<p>不同AI技术的成熟度差异较大，需要针对性地进行技术投资和人才培养。</p>',
                'source': 'Technology Assessment',
                'source_url': 'https://technologyassessment.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 7000,
                'image_url': 'https://example.com/images/ai-technology-maturity.jpg',
                'author_name': 'Technology Analyst',
                'has_video': False,
                'tags': ['AI技术', '技术成熟度', '技术评估', '发展分析']
            },
            {
                'title': 'AI应用深度分析：从工具到平台，生态化发展明显',
                'introduction': '应用深度分析显示，AI正从单一工具向平台化、生态化方向发展，应用场景不断扩展。',
                'body': '<p>AI平台能够整合多种技术能力，为用户提供一站式解决方案，推动应用生态发展。</p>',
                'source': 'Application Analysis',
                'source_url': 'https://applicationanalysis.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 6500,
                'image_url': 'https://example.com/images/ai-application-ecosystem.jpg',
                'author_name': 'Application Analyst',
                'has_video': False,
                'tags': ['AI应用', '平台化', '生态发展', '应用分析']
            },
            # 国际动态类新闻
            {
                'title': '中美AI技术竞争加剧，合作与竞争并存',
                'introduction': '中美在AI技术领域的竞争日益激烈，但双方在AI安全、伦理等方面仍有合作空间。',
                'body': '<p>技术竞争推动创新，但AI的全球性挑战需要国际合作来解决。</p>',
                'source': 'International Relations',
                'source_url': 'https://internationalrelations.com',
                'category': 'research',
                'is_hot': True,
                'is_top': False,
                'read_count': 11000,
                'image_url': 'https://example.com/images/us-china-ai-competition.jpg',
                'author_name': 'International Analyst',
                'has_video': False,
                'tags': ['中美竞争', 'AI技术', '国际合作', '国际关系']
            },
            {
                'title': '欧盟与美国签署AI合作协议，推动技术标准统一',
                'introduction': '欧盟与美国签署AI合作协议，旨在推动AI技术标准的统一和治理框架的协调。',
                'body': '<p>合作协议将促进双方在AI安全、伦理和标准制定方面的合作。</p>',
                'source': 'EU-US Relations',
                'source_url': 'https://euusrelations.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 8500,
                'image_url': 'https://example.com/images/eu-us-ai-cooperation.jpg',
                'author_name': 'Diplomatic Correspondent',
                'has_video': False,
                'tags': ['欧盟', '美国', 'AI合作', '技术标准']
            },
            {
                'title': '日本推出AI国家战略，力争成为AI强国',
                'introduction': '日本发布AI国家战略，计划在未来十年内成为全球AI技术强国。',
                'body': '<p>战略包括人才培养、技术研发、产业应用等多个方面的具体措施。</p>',
                'source': 'Japan AI Strategy',
                'source_url': 'https://japanaistrategy.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 7500,
                'image_url': 'https://example.com/images/japan-ai-strategy.jpg',
                'author_name': 'Japan Correspondent',
                'has_video': False,
                'tags': ['日本', 'AI战略', '国家政策', '技术强国']
            },
            {
                'title': '印度AI人才崛起，成为全球AI研发重要力量',
                'introduction': '印度AI人才在全球AI研发中发挥越来越重要的作用，多家科技巨头在印度设立AI研发中心。',
                'body': '<p>印度拥有大量优秀的AI工程师和研究人员，为全球AI发展贡献重要力量。</p>',
                'source': 'India Tech News',
                'source_url': 'https://indiatechnews.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 7000,
                'image_url': 'https://example.com/images/india-ai-talent.jpg',
                'author_name': 'India Tech Reporter',
                'has_video': False,
                'tags': ['印度', 'AI人才', '全球研发', '技术中心']
            },
            {
                'title': '非洲AI发展起步，数字鸿沟挑战与机遇并存',
                'introduction': '非洲AI发展刚刚起步，面临数字鸿沟挑战，但也蕴含着巨大的发展机遇。',
                'body': '<p>AI技术为非洲跨越式发展提供了可能，但需要解决基础设施和人才培养等问题。</p>',
                'source': 'Africa Tech Report',
                'source_url': 'https://africatechreport.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 6500,
                'image_url': 'https://example.com/images/africa-ai-development.jpg',
                'author_name': 'Africa Tech Correspondent',
                'has_video': False,
                'tags': ['非洲', 'AI发展', '数字鸿沟', '发展机遇']
            },
            # 合作项目类新闻
            {
                'title': 'OpenAI与微软深化合作，共同开发下一代AI模型',
                'introduction': 'OpenAI与微软宣布深化合作关系，共同开发下一代AI模型，推动AI技术发展。',
                'body': '<p>合作将结合双方在AI研究和云计算方面的优势，加速AI技术的创新和应用。</p>',
                'source': 'Partnership News',
                'source_url': 'https://partnershipnews.com',
                'category': 'research',
                'is_hot': True,
                'is_top': False,
                'read_count': 10000,
                'image_url': 'https://example.com/images/openai-microsoft-collaboration.jpg',
                'author_name': 'Partnership Reporter',
                'has_video': False,
                'tags': ['OpenAI', '微软', 'AI合作', '技术开发']
            },
            {
                'title': 'Google与斯坦福大学合作，推动AI基础研究',
                'introduction': 'Google与斯坦福大学建立AI研究合作，共同推动AI基础理论和技术突破。',
                'body': '<p>合作将聚焦AI的可解释性、安全性和伦理等基础问题，为AI发展奠定理论基础。</p>',
                'source': 'Academic Partnership',
                'source_url': 'https://academicpartnership.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 8000,
                'image_url': 'https://example.com/images/google-stanford-collaboration.jpg',
                'author_name': 'Academic Correspondent',
                'has_video': False,
                'tags': ['Google', '斯坦福大学', 'AI研究', '学术合作']
            },
            {
                'title': 'Meta与多所大学合作，推动开源AI发展',
                'introduction': 'Meta与全球多所顶尖大学合作，共同推动开源AI技术的发展和应用。',
                'body': '<p>合作项目将开发更多开源AI工具和模型，促进AI技术的民主化和普及。</p>',
                'source': 'Open Source AI',
                'source_url': 'https://opensourceai.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 7500,
                'image_url': 'https://example.com/images/meta-university-collaboration.jpg',
                'author_name': 'Open Source Reporter',
                'has_video': False,
                'tags': ['Meta', '大学合作', '开源AI', '技术民主化']
            },
            {
                'title': 'NVIDIA与医疗机构合作，推动AI医疗应用',
                'introduction': 'NVIDIA与多家医疗机构合作，利用AI技术推动医疗诊断和治疗的创新发展。',
                'body': '<p>合作将结合NVIDIA的AI计算能力和医疗机构的专业知识，开发更先进的医疗AI应用。</p>',
                'source': 'Healthcare AI News',
                'source_url': 'https://healthcareai.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 7000,
                'image_url': 'https://example.com/images/nvidia-medical-collaboration.jpg',
                'author_name': 'Healthcare Reporter',
                'has_video': False,
                'tags': ['NVIDIA', '医疗合作', 'AI医疗', '医疗创新']
            },
            {
                'title': 'AI初创公司与传统企业合作，推动产业升级',
                'introduction': '越来越多的AI初创公司与传统企业建立合作关系，共同推动产业数字化和智能化升级。',
                'body': '<p>合作模式为传统企业提供AI技术能力，为AI初创公司提供应用场景和市场。</p>',
                'source': 'Industry Collaboration',
                'source_url': 'https://industrycollaboration.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 6500,
                'image_url': 'https://example.com/images/startup-enterprise-collaboration.jpg',
                'author_name': 'Industry Analyst',
                'has_video': False,
                'tags': ['AI初创', '传统企业', '产业升级', '合作模式']
            },
            # 创新成果类新闻
            {
                'title': 'AI在创意写作领域取得重大突破，创作能力显著提升',
                'introduction': 'AI在创意写作、诗歌创作和故事生成方面取得重大突破，创作能力接近人类水平。',
                'body': '<p>AI能够生成具有创意性和文学性的内容，为创意产业提供新的可能性。</p>',
                'source': 'Creative AI News',
                'source_url': 'https://creativeai.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 8000,
                'image_url': 'https://example.com/images/ai-creative-writing.jpg',
                'author_name': 'Creative AI Researcher',
                'has_video': True,
                'tags': ['AI创意', '写作创作', '文学创作', '创意产业']
            },
            {
                'title': 'AI音乐创作技术成熟，个性化音乐成为可能',
                'introduction': 'AI音乐创作技术日益成熟，能够根据用户喜好生成个性化的音乐作品。',
                'body': '<p>AI音乐创作为音乐产业带来革命性变化，个性化音乐服务成为可能。</p>',
                'source': 'Music AI Journal',
                'source_url': 'https://musicaijournal.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 7500,
                'image_url': 'https://example.com/images/ai-music-creation.jpg',
                'author_name': 'Music AI Expert',
                'has_video': True,
                'tags': ['AI音乐', '音乐创作', '个性化', '音乐产业']
            },
            {
                'title': 'AI在游戏开发中的应用日益广泛，游戏体验大幅提升',
                'introduction': 'AI技术在游戏开发中的应用越来越广泛，从NPC行为到游戏内容生成都有AI参与。',
                'body': '<p>AI为游戏带来更智能的NPC、更丰富的内容和更个性化的游戏体验。</p>',
                'source': 'Game AI News',
                'source_url': 'https://gameai.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 7000,
                'image_url': 'https://example.com/images/ai-game-development.jpg',
                'author_name': 'Game AI Developer',
                'has_video': False,
                'tags': ['AI游戏', '游戏开发', 'NPC智能', '游戏体验']
            },
            {
                'title': 'AI在建筑设计中的应用创新，智能建筑成为现实',
                'introduction': 'AI技术在建筑设计中的应用不断创新，从概念设计到结构优化都有AI参与。',
                'body': '<p>AI能够生成创新的建筑设计，优化建筑性能，推动建筑行业智能化发展。</p>',
                'source': 'Architecture AI',
                'source_url': 'https://architectureai.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 6500,
                'image_url': 'https://example.com/images/ai-architecture.jpg',
                'author_name': 'Architecture AI Expert',
                'has_video': False,
                'tags': ['AI建筑', '建筑设计', '智能建筑', '建筑创新']
            },
            {
                'title': 'AI在时尚设计中的应用创新，个性化时尚成为趋势',
                'introduction': 'AI技术在时尚设计中的应用不断创新，从款式设计到个性化推荐都有AI参与。',
                'body': '<p>AI能够分析时尚趋势，生成创新设计，为用户提供个性化的时尚服务。</p>',
                'source': 'Fashion AI News',
                'source_url': 'https://fashionai.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 6000,
                'image_url': 'https://example.com/images/ai-fashion-design.jpg',
                'author_name': 'Fashion AI Designer',
                'has_video': False,
                'tags': ['AI时尚', '时尚设计', '个性化', '时尚创新']
            },
            # 技术突破类新闻
            {
                'title': 'AI在量子机器学习领域取得重大突破',
                'introduction': '研究人员在量子机器学习领域取得重大突破，实现了量子优势的AI算法。',
                'body': '<p>量子AI算法在特定问题上实现了指数级性能提升，为AI发展开辟新道路。</p>',
                'source': 'Quantum AI Research',
                'source_url': 'https://quantumairesearch.com',
                'category': 'research',
                'is_hot': True,
                'is_top': False,
                'read_count': 9000,
                'image_url': 'https://example.com/images/quantum-ml-breakthrough.jpg',
                'author_name': 'Quantum AI Researcher',
                'has_video': False,
                'tags': ['量子AI', '机器学习', '技术突破', '量子优势']
            },
            {
                'title': 'AI在神经科学领域取得重要发现',
                'introduction': 'AI技术帮助神经科学家发现大脑工作新机制，推动神经科学研究发展。',
                'body': '<p>AI能够分析复杂的神经数据，发现人类大脑工作的新规律和机制。</p>',
                'source': 'Neuroscience AI',
                'source_url': 'https://neuroscienceai.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 8000,
                'image_url': 'https://example.com/images/ai-neuroscience.jpg',
                'author_name': 'Neuroscience Researcher',
                'has_video': False,
                'tags': ['AI神经科学', '大脑研究', '神经机制', '科学发现']
            },
            {
                'title': 'AI在材料科学领域发现新型超导体',
                'introduction': 'AI技术帮助科学家发现新型超导材料，在室温下表现出超导特性。',
                'body': '<p>这一发现为超导技术的实际应用开辟了新道路，具有重要的科学和工程价值。</p>',
                'source': 'Materials AI',
                'source_url': 'https://materialsai.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 7500,
                'image_url': 'https://example.com/images/ai-superconductor-discovery.jpg',
                'author_name': 'Materials Scientist',
                'has_video': False,
                'tags': ['AI材料科学', '超导体', '室温超导', '材料发现']
            },
            {
                'title': 'AI在气候预测领域取得重要进展',
                'introduction': 'AI技术在气候预测领域取得重要进展，预测精度大幅提升。',
                'body': '<p>AI能够分析大量气候数据，提供更准确的气候预测，为应对气候变化提供支持。</p>',
                'source': 'Climate AI',
                'source_url': 'https://climateai.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 7000,
                'image_url': 'https://example.com/images/ai-climate-prediction.jpg',
                'author_name': 'Climate AI Researcher',
                'has_video': False,
                'tags': ['AI气候', '气候预测', '气候变化', '环境科学']
            },
            {
                'title': 'AI在生物信息学领域取得重大突破',
                'introduction': 'AI技术在生物信息学领域取得重大突破，在基因分析和蛋白质结构预测方面表现优异。',
                'body': '<p>AI能够快速分析基因组数据，预测蛋白质结构，为生物医学研究提供重要工具。</p>',
                'source': 'Bioinformatics AI',
                'source_url': 'https://bioinformaticsai.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 6500,
                'image_url': 'https://example.com/images/ai-bioinformatics.jpg',
                'author_name': 'Bioinformatics Expert',
                'has_video': False,
                'tags': ['AI生物信息学', '基因分析', '蛋白质结构', '生物医学']
            },
            # 前沿研究类新闻
            {
                'title': 'AI在脑机接口领域取得重要进展',
                'introduction': 'AI技术在脑机接口领域取得重要进展，实现了更精确的脑信号解码。',
                'body': '<p>这一技术为残障人士提供新的康复可能性，也为人机交互开辟新道路。</p>',
                'source': 'Brain-Computer Interface',
                'source_url': 'https://braincomputerinterface.com',
                'category': 'technology',
                'is_hot': False,
                'is_top': False,
                'read_count': 8000,
                'image_url': 'https://example.com/images/ai-brain-interface.jpg',
                'author_name': 'BCI Researcher',
                'has_video': True,
                'tags': ['AI脑机接口', '脑信号解码', '康复技术', '人机交互']
            },
            {
                'title': 'AI在意识研究领域探索新方向',
                'introduction': 'AI技术为意识研究提供新的研究方法和工具，推动这一前沿领域的发展。',
                'body': '<p>AI能够模拟和测试不同的意识理论，为理解人类意识提供新的视角。</p>',
                'source': 'Consciousness Research',
                'source_url': 'https://consciousnessresearch.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 7500,
                'image_url': 'https://example.com/images/ai-consciousness.jpg',
                'author_name': 'Consciousness Researcher',
                'has_video': False,
                'tags': ['AI意识', '意识研究', '哲学AI', '前沿科学']
            },
            {
                'title': 'AI在情感计算领域取得突破性进展',
                'introduction': 'AI在情感计算领域取得突破性进展，能够更准确地识别和理解人类情感。',
                'body': '<p>情感AI为心理健康、教育、娱乐等领域提供新的应用可能性。</p>',
                'source': 'Affective Computing',
                'source_url': 'https://affectivecomputing.com',
                'category': 'technology',
                'is_hot': False,
                'is_top': False,
                'read_count': 7000,
                'image_url': 'https://example.com/images/ai-emotion.jpg',
                'author_name': 'Affective Computing Expert',
                'has_video': False,
                'tags': ['AI情感', '情感计算', '心理健康', '情感识别']
            },
            {
                'title': 'AI在创造力研究领域探索新可能',
                'introduction': 'AI技术在创造力研究领域探索新的可能性，挑战传统创造力理论。',
                'body': '<p>AI的创造性表现引发对创造力本质的重新思考，推动创造力研究发展。</p>',
                'source': 'Creativity Research',
                'source_url': 'https://creativityresearch.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 6500,
                'image_url': 'https://example.com/images/ai-creativity-research.jpg',
                'author_name': 'Creativity Researcher',
                'has_video': False,
                'tags': ['AI创造力', '创造力研究', '创造性思维', '前沿探索']
            },
            {
                'title': 'AI在元学习领域取得重要突破',
                'introduction': 'AI在元学习领域取得重要突破，实现了更高效的学习能力迁移。',
                'body': '<p>元学习技术使AI能够快速适应新任务，为通用AI的发展奠定基础。</p>',
                'source': 'Meta-Learning AI',
                'source_url': 'https://metalearningai.com',
                'category': 'technology',
                'is_hot': False,
                'is_top': False,
                'read_count': 6000,
                'image_url': 'https://example.com/images/ai-meta-learning.jpg',
                'author_name': 'Meta-Learning Expert',
                'has_video': False,
                'tags': ['AI元学习', '学习迁移', '通用AI', '前沿技术']
            },
            # 未来技术类新闻
            {
                'title': 'AI驱动的全息投影技术取得重大突破',
                'introduction': 'AI技术推动全息投影技术发展，实现了更真实、更交互的3D显示效果。',
                'body': '<p>AI全息技术为娱乐、教育、医疗等领域带来革命性变化，开启显示技术新纪元。</p>',
                'source': 'Holographic AI',
                'source_url': 'https://holographicai.com',
                'category': 'technology',
                'is_hot': False,
                'is_top': False,
                'read_count': 7500,
                'image_url': 'https://example.com/images/ai-hologram.jpg',
                'author_name': 'Holographic Expert',
                'has_video': True,
                'tags': ['AI全息', '3D显示', '交互技术', '未来显示']
            },
            {
                'title': 'AI在生物计算领域探索新可能',
                'introduction': 'AI技术在生物计算领域探索新的可能性，利用生物分子进行计算。',
                'body': '<p>生物计算结合AI技术，为计算能力带来质的飞跃，开启生物计算新纪元。</p>',
                'source': 'Biological Computing',
                'source_url': 'https://biologicalcomputing.com',
                'category': 'technology',
                'is_hot': False,
                'is_top': False,
                'read_count': 7000,
                'image_url': 'https://example.com/images/ai-biological-computing.jpg',
                'author_name': 'Biological Computing Researcher',
                'has_video': False,
                'tags': ['AI生物计算', '分子计算', '生物技术', '未来计算']
            },
            {
                'title': 'AI驱动的纳米机器人技术快速发展',
                'introduction': 'AI技术推动纳米机器人发展，在医疗、制造等领域展现巨大潜力。',
                'body': '<p>AI纳米机器人能够执行精确的微观操作，为精准医疗和精密制造提供新工具。</p>',
                'source': 'Nanorobotics AI',
                'source_url': 'https://nanoroboticsai.com',
                'category': 'technology',
                'is_hot': False,
                'is_top': False,
                'read_count': 6500,
                'image_url': 'https://example.com/images/ai-nanorobotics.jpg',
                'author_name': 'Nanorobotics Expert',
                'has_video': False,
                'tags': ['AI纳米机器人', '精准医疗', '精密制造', '微观技术']
            },
            {
                'title': 'AI在光量子计算领域取得重要进展',
                'introduction': 'AI技术在光量子计算领域取得重要进展，实现了更稳定的量子比特控制。',
                'body': '<p>光量子计算结合AI技术，为量子计算的实际应用提供了新的可能性。</p>',
                'source': 'Optical Quantum AI',
                'source_url': 'https://opticalquantumai.com',
                'category': 'technology',
                'is_hot': False,
                'is_top': False,
                'read_count': 6000,
                'image_url': 'https://example.com/images/ai-optical-quantum.jpg',
                'author_name': 'Optical Quantum Researcher',
                'has_video': False,
                'tags': ['AI光量子', '量子比特', '量子计算', '未来技术']
            },
            {
                'title': 'AI驱动的脑机融合技术探索',
                'introduction': 'AI技术推动脑机融合技术发展，探索人脑与计算机的直接连接。',
                'body': '<p>脑机融合技术为人类认知能力扩展和AI发展提供了新的可能性。</p>',
                'source': 'Brain-Machine Fusion',
                'source_url': 'https://brainmachinefusion.com',
                'category': 'technology',
                'is_hot': False,
                'is_top': False,
                'read_count': 5500,
                'image_url': 'https://example.com/images/ai-brain-fusion.jpg',
                'author_name': 'Brain-Machine Fusion Expert',
                'has_video': False,
                'tags': ['AI脑机融合', '认知扩展', '人机融合', '未来技术']
            },
            # 新兴应用类新闻
            {
                'title': 'AI在太空探索中的应用日益广泛',
                'introduction': 'AI技术在太空探索中的应用越来越广泛，从卫星控制到火星探测都有AI参与。',
                'body': '<p>AI为太空探索提供智能决策支持，提高任务成功率和科学发现效率。</p>',
                'source': 'Space AI News',
                'source_url': 'https://spaceai.com',
                'category': 'technology',
                'is_hot': False,
                'is_top': False,
                'read_count': 7000,
                'image_url': 'https://example.com/images/ai-space-exploration.jpg',
                'author_name': 'Space AI Expert',
                'has_video': True,
                'tags': ['AI太空', '太空探索', '卫星控制', '火星探测']
            },
            {
                'title': 'AI在海洋研究中的应用创新',
                'introduction': 'AI技术在海洋研究中的应用不断创新，从海洋监测到深海探索都有AI参与。',
                'body': '<p>AI为海洋研究提供智能分析工具，帮助科学家更好地理解海洋生态系统。</p>',
                'source': 'Ocean AI Research',
                'source_url': 'https://oceanairesearch.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 6500,
                'image_url': 'https://example.com/images/ai-ocean-research.jpg',
                'author_name': 'Ocean AI Researcher',
                'has_video': False,
                'tags': ['AI海洋', '海洋监测', '深海探索', '海洋生态']
            },
            {
                'title': 'AI在考古学领域的应用探索',
                'introduction': 'AI技术在考古学领域的应用探索，从文物识别到遗址分析都有AI参与。',
                'body': '<p>AI为考古研究提供智能分析工具，帮助考古学家更好地理解人类历史。</p>',
                'source': 'Archaeology AI',
                'source_url': 'https://archaeologyai.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 6000,
                'image_url': 'https://example.com/images/ai-archaeology.jpg',
                'author_name': 'Archaeology AI Expert',
                'has_video': False,
                'tags': ['AI考古', '文物识别', '遗址分析', '人类历史']
            },
            {
                'title': 'AI在语言学领域的应用突破',
                'introduction': 'AI技术在语言学领域的应用取得突破，从语言分析到濒危语言保护都有AI参与。',
                'body': '<p>AI为语言学研究提供智能工具，帮助语言学家更好地理解语言结构和演变。</p>',
                'source': 'Linguistics AI',
                'source_url': 'https://linguisticsai.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 5500,
                'image_url': 'https://example.com/images/ai-linguistics.jpg',
                'author_name': 'Linguistics AI Researcher',
                'has_video': False,
                'tags': ['AI语言学', '语言分析', '濒危语言', '语言演变']
            },
            {
                'title': 'AI在艺术史研究中的应用创新',
                'introduction': 'AI技术在艺术史研究中的应用不断创新，从艺术品分析到风格识别都有AI参与。',
                'body': '<p>AI为艺术史研究提供智能分析工具，帮助艺术史学家更好地理解艺术作品。</p>',
                'source': 'Art History AI',
                'source_url': 'https://arthistoryai.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 5000,
                'image_url': 'https://example.com/images/ai-art-history.jpg',
                'author_name': 'Art History AI Expert',
                'has_video': False,
                'tags': ['AI艺术史', '艺术品分析', '风格识别', '艺术研究']
            },
            # 创新案例类新闻
            {
                'title': 'AI助力小企业数字化转型成功案例',
                'introduction': '多家小企业利用AI技术成功实现数字化转型，提高运营效率和市场竞争力。',
                'body': '<p>AI技术为小企业提供了成本效益高的数字化解决方案，推动小企业创新发展。</p>',
                'source': 'Small Business AI',
                'source_url': 'https://smallbusinessai.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 7000,
                'image_url': 'https://example.com/images/ai-small-business.jpg',
                'author_name': 'Small Business Expert',
                'has_video': False,
                'tags': ['AI小企业', '数字化转型', '成功案例', '创新发展']
            },
            {
                'title': 'AI在农业领域的成功应用案例',
                'introduction': 'AI技术在农业领域的应用取得显著成效，从精准种植到智能收获都有成功案例。',
                'body': '<p>AI农业技术提高了农作物产量，降低了生产成本，推动了农业现代化发展。</p>',
                'source': 'Agricultural AI',
                'source_url': 'https://agriculturalai.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 6500,
                'image_url': 'https://example.com/images/ai-agriculture.jpg',
                'author_name': 'Agricultural AI Expert',
                'has_video': True,
                'tags': ['AI农业', '精准种植', '智能收获', '农业现代化']
            },
            {
                'title': 'AI在环保领域的成功应用案例',
                'introduction': 'AI技术在环保领域的应用取得重要成果，从污染监测到生态保护都有成功案例。',
                'body': '<p>AI环保技术为环境保护提供了新的工具和方法，推动了可持续发展。</p>',
                'source': 'Environmental AI',
                'source_url': 'https://environmentalai.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 6000,
                'image_url': 'https://example.com/images/ai-environmental.jpg',
                'author_name': 'Environmental AI Researcher',
                'has_video': False,
                'tags': ['AI环保', '污染监测', '生态保护', '可持续发展']
            },
            {
                'title': 'AI在文化遗产保护中的成功应用',
                'introduction': 'AI技术在文化遗产保护中的应用取得重要成果，从文物修复到遗址保护都有成功案例。',
                'body': '<p>AI技术为文化遗产保护提供了新的方法和工具，推动了文化传承和保护。</p>',
                'source': 'Cultural Heritage AI',
                'source_url': 'https://culturalheritageai.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 5500,
                'image_url': 'https://example.com/images/ai-cultural-heritage.jpg',
                'author_name': 'Cultural Heritage Expert',
                'has_video': False,
                'tags': ['AI文化遗产', '文物修复', '遗址保护', '文化传承']
            },
            {
                'title': 'AI在灾害预警中的成功应用案例',
                'introduction': 'AI技术在灾害预警中的应用取得重要成果，从地震预测到洪水预警都有成功案例。',
                'body': '<p>AI灾害预警技术为防灾减灾提供了新的工具和方法，保护了人民生命财产安全。</p>',
                'source': 'Disaster Prevention AI',
                'source_url': 'https://disasterpreventionai.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 5000,
                'image_url': 'https://example.com/images/ai-disaster-prevention.jpg',
                'author_name': 'Disaster Prevention Expert',
                'has_video': False,
                'tags': ['AI灾害预警', '地震预测', '洪水预警', '防灾减灾']
            },
            # 发展趋势类新闻
            {
                'title': 'AI技术发展趋势：从专用到通用，从工具到伙伴',
                'introduction': 'AI技术发展趋势分析显示，AI正从专用工具向通用智能发展，从工具向伙伴转变。',
                'body': '<p>未来AI将更加智能、更加人性化，与人类形成更紧密的协作关系。</p>',
                'source': 'AI Trends Analysis',
                'source_url': 'https://aitrendsanalysis.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 8000,
                'image_url': 'https://example.com/images/ai-development-trends.jpg',
                'author_name': 'AI Trends Analyst',
                'has_video': False,
                'tags': ['AI趋势', '技术发展', '通用智能', '人机协作']
            },
            {
                'title': 'AI产业生态发展趋势：平台化、生态化、开放化',
                'introduction': 'AI产业生态发展趋势显示，平台化、生态化、开放化成为主要发展方向。',
                'body': '<p>AI平台能够整合多种技术能力，为用户提供一站式解决方案，推动产业生态发展。</p>',
                'source': 'AI Industry Report',
                'source_url': 'https://aiindustryreport.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 7500,
                'image_url': 'https://example.com/images/ai-industry-ecosystem.jpg',
                'author_name': 'Industry Analyst',
                'has_video': False,
                'tags': ['AI产业', '平台化', '生态化', '开放化']
            },
            {
                'title': 'AI应用发展趋势：从单一到融合，从专业到普及',
                'introduction': 'AI应用发展趋势显示，AI正从单一应用向融合应用发展，从专业领域向普及应用扩展。',
                'body': '<p>AI技术将与更多领域深度融合，为各行各业提供智能化解决方案。</p>',
                'source': 'AI Application Trends',
                'source_url': 'https://aiapplicationtrends.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 7000,
                'image_url': 'https://example.com/images/ai-application-trends.jpg',
                'author_name': 'Application Trends Expert',
                'has_video': False,
                'tags': ['AI应用', '融合应用', '普及应用', '智能化']
            },
            {
                'title': 'AI治理发展趋势：从技术到伦理，从国内到国际',
                'introduction': 'AI治理发展趋势显示，AI治理正从技术层面向伦理层面发展，从国内治理向国际治理扩展。',
                'body': '<p>AI治理需要建立全球性的治理框架，平衡技术发展与伦理约束。</p>',
                'source': 'AI Governance Trends',
                'source_url': 'https://aigovernancetrends.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 6500,
                'image_url': 'https://example.com/images/ai-governance-trends.jpg',
                'author_name': 'Governance Expert',
                'has_video': False,
                'tags': ['AI治理', '伦理治理', '国际治理', '治理框架']
            },
            {
                'title': 'AI人才培养发展趋势：从专业到复合，从理论到实践',
                'introduction': 'AI人才培养发展趋势显示，AI人才正从专业型向复合型发展，从理论型向实践型转变。',
                'body': '<p>未来AI人才需要具备跨学科知识，能够将AI技术应用到实际业务中。</p>',
                'source': 'AI Talent Development',
                'source_url': 'https://aitalentdevelopment.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 6000,
                'image_url': 'https://example.com/images/ai-talent-development.jpg',
                'author_name': 'Talent Development Expert',
                'has_video': False,
                'tags': ['AI人才', '复合型人才', '实践型人才', '人才培养']
            },
            # 未来展望类新闻
            {
                'title': 'AI与人类共同进化的未来愿景',
                'introduction': 'AI与人类共同进化的未来愿景：AI将成为人类的智能伙伴，共同推动文明进步。',
                'body': '<p>未来AI将与人类形成共生关系，共同解决人类面临的重大挑战，推动文明发展。</p>',
                'source': 'Future Vision AI',
                'source_url': 'https://futurevisionai.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 7500,
                'image_url': 'https://example.com/images/ai-human-evolution.jpg',
                'author_name': 'Future Vision Expert',
                'has_video': True,
                'tags': ['AI人类', '共同进化', '智能伙伴', '文明进步']
            },
            {
                'title': 'AI推动人类文明进入新纪元的可能性',
                'introduction': 'AI技术推动人类文明进入新纪元的可能性：从信息时代到智能时代的跨越。',
                'body': '<p>AI技术可能推动人类文明进入智能时代，实现人类能力的质的飞跃。</p>',
                'source': 'Civilization AI',
                'source_url': 'https://civilizationai.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 7000,
                'image_url': 'https://example.com/images/ai-civilization.jpg',
                'author_name': 'Civilization Researcher',
                'has_video': False,
                'tags': ['AI文明', '智能时代', '人类能力', '文明跨越']
            },
            {
                'title': 'AI解决人类重大挑战的未来路径',
                'introduction': 'AI解决人类重大挑战的未来路径：从气候变化到疾病治疗，AI将发挥关键作用。',
                'body': '<p>AI技术将为解决气候变化、疾病治疗、能源危机等人类重大挑战提供新的解决方案。</p>',
                'source': 'Global Challenges AI',
                'source_url': 'https://globalchallengesai.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 6500,
                'image_url': 'https://example.com/images/ai-global-challenges.jpg',
                'author_name': 'Global Challenges Expert',
                'has_video': False,
                'tags': ['AI挑战', '气候变化', '疾病治疗', '全球问题']
            },
            {
                'title': 'AI创造无限可能的未来世界',
                'introduction': 'AI创造无限可能的未来世界：从虚拟现实到星际探索，AI将开启人类新篇章。',
                'body': '<p>AI技术将为人类创造无限可能，从虚拟现实到星际探索，开启人类文明新篇章。</p>',
                'source': 'Infinite Possibilities AI',
                'source_url': 'https://infinitepossibilitiesai.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 6000,
                'image_url': 'https://example.com/images/ai-infinite-possibilities.jpg',
                'author_name': 'Future Possibilities Expert',
                'has_video': True,
                'tags': ['AI可能', '虚拟现实', '星际探索', '人类未来']
            },
            {
                'title': 'AI与人类和谐共处的终极目标',
                'introduction': 'AI与人类和谐共处的终极目标：建立人机共生、和谐发展的美好未来。',
                'body': '<p>AI与人类的和谐共处是技术发展的终极目标，需要技术、伦理、治理等多方面的共同努力。</p>',
                'source': 'Harmony AI',
                'source_url': 'https://harmonyai.com',
                'category': 'research',
                'is_hot': False,
                'is_top': False,
                'read_count': 5500,
                'image_url': 'https://example.com/images/ai-human-harmony.jpg',
                'author_name': 'Harmony AI Researcher',
                'has_video': False,
                'tags': ['AI和谐', '人机共生', '和谐发展', '终极目标']
            }
        ]

        for i, news_data in enumerate(ai_news_data):
            days_ago = random.randint(0, 7)
            published_at = timezone.now() - timedelta(days=days_ago)
            
            # 创建页面但不保存
            news = AINewsPage(
                title=news_data['title'],
                introduction=news_data['introduction'],
                body=news_data['body'],
                source=news_data['source'],
                source_url=news_data['source_url'],
                category=news_data['category'],
                is_hot=news_data['is_hot'],
                is_top=news_data['is_top'],
                read_count=news_data['read_count'],
                image_url=news_data['image_url'],
                author_name=news_data['author_name'],
                has_video=news_data['has_video'],
                slug=f"ai-news-{i+1}",
                first_published_at=published_at,
                last_published_at=published_at
            )
            
            # 使用Wagtail的标准方法添加子页面
            created_news = parent_page.add_child(instance=news)
            
            # 添加标签
            for tag in news_data['tags']:
                created_news.tags.add(tag)
            
            # 保存标签
            created_news.save()

        self.stdout.write(self.style.SUCCESS(f'✅ 生成了 {len(ai_news_data)} 条AI资讯'))

    def generate_ai_tutorials(self, parent_page):
        """生成AI教程示例数据"""
        ai_tutorials_data = [
            {
                'title': 'ChatGPT使用入门指南',
                'introduction': '从零开始学习如何有效使用ChatGPT，掌握基本的提示工程技巧，提升AI对话效果。',
                'body': '<h2>什么是ChatGPT？</h2><p>ChatGPT是OpenAI开发的大型语言模型。</p>',
                'difficulty': 'beginner',
                'duration': '30分钟',
                'author_name': '张明',
                'category': 'ai-fundamentals',
                'is_hot': True,
                'is_free': True,
                'student_count': 5000,
                'rating': 4.8,
                'tags': ['ChatGPT', '入门', '提示工程', '基础']
            }
        ]

        for i, tutorial_data in enumerate(ai_tutorials_data):
            days_ago = random.randint(1, 30)
            published_at = timezone.now() - timedelta(days=days_ago)
            
            tutorial = AITutorialPage(
                title=tutorial_data['title'],
                introduction=tutorial_data['introduction'],
                body=tutorial_data['body'],
                difficulty=tutorial_data['difficulty'],
                duration=tutorial_data['duration'],
                author_name=tutorial_data['author_name'],
                category=tutorial_data['category'],
                is_hot=tutorial_data['is_hot'],
                is_free=tutorial_data['is_free'],
                student_count=tutorial_data['student_count'],
                rating=tutorial_data['rating'],
                slug=f"ai-tutorial-{i+1}",
                first_published_at=published_at,
                last_published_at=published_at
            )
            # 使用Wagtail的标准方法添加子页面
            created_tutorial = parent_page.add_child(instance=tutorial)
            
            # 添加标签
            for tag in tutorial_data['tags']:
                created_tutorial.tags.add(tag)
            
            # 保存标签
            created_tutorial.save()

        self.stdout.write(self.style.SUCCESS(f'✅ 生成了 {len(ai_tutorials_data)} 个AI教程'))
