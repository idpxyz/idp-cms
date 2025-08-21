#!/usr/bin/env python3
"""
批量生成AI门户网站示例数据
"""

import os
import sys
import django
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import random

# 添加Django项目路径
sys.path.append('/opt/idp-cms/authoring')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'authoring.settings.base')
django.setup()

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

        # 获取现有站点的根页面作为父页面
        try:
            # 获取localhost站点（我们现有的站点）
            site = Site.objects.filter(hostname='localhost').first()
            if not site:
                # 如果没有localhost站点，使用第一个站点
                site = Site.objects.first()
            
            if not site:
                self.stdout.write(self.style.ERROR('❌ 没有找到任何站点！'))
                return
                
            home_page = site.root_page
            self.stdout.write(f'✅ 使用站点: {site.hostname}:{site.port}')
            self.stdout.write(f'✅ 根页面: {home_page.title}')
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ 无法获取站点: {e}'))
            return

        # 生成AI工具数据
        self.stdout.write('生成AI工具数据...')
        self.generate_ai_tools(home_page)
        
        # 生成AI资讯数据
        self.stdout.write('生成AI资讯数据...')
        self.generate_ai_news(home_page)
        
        # 生成AI教程数据
        self.stdout.write('生成AI教程数据...')
        self.generate_ai_tutorials(home_page)
        
        self.stdout.write(self.style.SUCCESS('🎉 所有示例数据生成完成！'))

    def generate_ai_tools(self, parent_page):
        """生成AI工具示例数据"""
        ai_tools_data = [
            # 文字生成工具
            {
                'title': 'ChatGPT',
                'description': 'OpenAI开发的强大对话AI，能够进行自然对话、写作辅助、代码生成等多种任务',
                'tool_url': 'https://chat.openai.com',
                'category': 'text-generation',
                'pricing': 'freemium',
                'features': ['自然对话', '多语言支持', '知识问答', '写作辅助', '代码生成'],
                'rating': 4.9,
                'usage_count': 1000000,
                'is_hot': True,
                'is_new': False,
                'tags': ['对话', 'AI助手', '写作', 'OpenAI']
            },
            {
                'title': 'Claude',
                'description': 'Anthropic开发的AI助手，注重安全性和有用性，擅长长文本处理和分析',
                'tool_url': 'https://claude.ai',
                'category': 'text-generation',
                'pricing': 'freemium', 
                'features': ['安全对话', '文档分析', '创意写作', '代码辅助'],
                'rating': 4.8,
                'usage_count': 500000,
                'is_hot': True,
                'is_new': False,
                'tags': ['AI助手', '安全', '文档分析', 'Anthropic']
            },
            {
                'title': 'Notion AI',
                'description': '集成在Notion中的AI写作助手，帮助用户更高效地创作和整理内容',
                'tool_url': 'https://notion.so',
                'category': 'productivity',
                'pricing': 'paid',
                'features': ['智能写作', '内容总结', '翻译', '头脑风暴'],
                'rating': 4.6,
                'usage_count': 800000,
                'is_hot': True,
                'is_new': False,
                'tags': ['写作', '笔记', '生产力', 'Notion']
            },
            
            # 图像生成工具
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
            },
            {
                'title': 'DALL-E 3',
                'description': 'OpenAI最新的图像生成模型，能根据文字描述生成高质量图像',
                'tool_url': 'https://openai.com/dall-e-3',
                'category': 'image-generation',
                'pricing': 'paid',
                'features': ['文字转图像', '高分辨率', '创意设计', 'API集成'],
                'rating': 4.7,
                'usage_count': 400000,
                'is_hot': True,
                'is_new': True,
                'tags': ['图像生成', 'OpenAI', '创意', '设计']
            },
            {
                'title': 'Stable Diffusion',
                'description': '开源的图像生成模型，支持本地部署和自定义训练',
                'tool_url': 'https://stability.ai/stable-diffusion',
                'category': 'image-generation',
                'pricing': 'free',
                'features': ['开源免费', '本地部署', '模型训练', '社区支持'],
                'rating': 4.5,
                'usage_count': 700000,
                'is_hot': True,
                'is_new': False,
                'tags': ['开源', '图像生成', '本地部署', 'Stability AI']
            },
            
            # 代码生成工具
            {
                'title': 'GitHub Copilot',
                'description': 'GitHub和OpenAI合作开发的AI编程助手，提供智能代码补全和建议',
                'tool_url': 'https://github.com/features/copilot',
                'category': 'code-generation',
                'pricing': 'paid',
                'features': ['代码补全', '智能建议', '多语言支持', '实时协作'],
                'rating': 4.6,
                'usage_count': 1200000,
                'is_hot': True,
                'is_new': False,
                'tags': ['编程', '代码生成', 'GitHub', 'IDE集成']
            },
            {
                'title': 'Cursor',
                'description': '专为AI编程设计的代码编辑器，内置强大的AI助手功能',
                'tool_url': 'https://cursor.sh',
                'category': 'code-generation',
                'pricing': 'freemium',
                'features': ['AI原生编辑器', '智能重构', '代码解释', '项目理解'],
                'rating': 4.7,
                'usage_count': 300000,
                'is_hot': True,
                'is_new': True,
                'tags': ['编辑器', 'AI编程', '代码助手', '开发工具']
            },
            {
                'title': 'Codeium',
                'description': '免费的AI编程助手，支持多种IDE和编程语言',
                'tool_url': 'https://codeium.com',
                'category': 'code-generation',
                'pricing': 'free',
                'features': ['免费使用', '多IDE支持', '代码补全', '聊天功能'],
                'rating': 4.4,
                'usage_count': 500000,
                'is_hot': False,
                'is_new': False,
                'tags': ['免费', '编程助手', 'IDE插件', '代码补全']
            },
            
            # 聊天机器人
            {
                'title': 'Gemini',
                'description': 'Google开发的多模态AI模型，支持文本、图像和代码理解',
                'tool_url': 'https://gemini.google.com',
                'category': 'chatbot',
                'pricing': 'freemium',
                'features': ['多模态理解', '实时信息', '代码生成', 'Google集成'],
                'rating': 4.5,
                'usage_count': 600000,
                'is_hot': True,
                'is_new': False,
                'tags': ['Google', '多模态', 'AI助手', '搜索集成']
            },
            {
                'title': 'Character.AI',
                'description': '专注于角色扮演和创意对话的AI聊天平台',
                'tool_url': 'https://character.ai',
                'category': 'chatbot',
                'pricing': 'freemium',
                'features': ['角色创建', '创意对话', '个性化AI', '社区分享'],
                'rating': 4.3,
                'usage_count': 400000,
                'is_hot': False,
                'is_new': False,
                'tags': ['角色扮演', '创意', '对话', '娱乐']
            }
        ]

        for i, tool_data in enumerate(ai_tools_data):
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
            parent_page.add_child(instance=tool)
            
            # 添加标签
            for tag in tool_data['tags']:
                tool.tags.add(tag)
            
            tool.save()

        self.stdout.write(self.style.SUCCESS(f'✅ 生成了 {len(ai_tools_data)} 个AI工具'))

    def generate_ai_news(self, parent_page):
        """生成AI资讯示例数据"""
        ai_news_data = [
            {
                'title': 'OpenAI发布GPT-5，推理能力大幅提升',
                'introduction': '最新版本GPT-5在数学推理、代码生成和多模态理解方面都有显著提升，标志着AI技术的又一重大突破。',
                'body': '''<p>OpenAI今日正式发布GPT-5，这是继GPT-4之后的最新一代大语言模型。据官方介绍，GPT-5在推理能力、多模态理解和代码生成方面都有显著改进。</p>
                
                <h3>主要改进</h3>
                <ul>
                <li><strong>推理能力提升</strong>：在数学、逻辑推理等方面表现更加出色</li>
                <li><strong>多模态理解</strong>：能更好地理解图像、音频等多种输入形式</li>
                <li><strong>代码生成</strong>：编程能力显著增强，支持更多编程语言</li>
                <li><strong>响应速度</strong>：处理速度比GPT-4提升30%</li>
                </ul>
                
                <p>业界专家认为，GPT-5的发布将进一步推动AI在各个领域的应用，特别是在教育、医疗和科研领域。</p>''',
                'source': 'TechCrunch',
                'source_url': 'https://techcrunch.com',
                'category': 'technology',
                'is_hot': True,
                'is_top': True,
                'read_count': 15000,
                'image_url': '/images/gpt5-announcement.jpg',
                'author_name': 'Sarah Johnson',
                'has_video': False,
                'tags': ['OpenAI', 'GPT-5', '大语言模型', '技术突破']
            },
            {
                'title': 'Google推出Gemini Ultra 2.0，性能超越GPT-4',
                'introduction': '谷歌最新发布的Gemini Ultra 2.0在多项基准测试中超越了GPT-4，特别是在科学推理和代码生成方面表现突出。',
                'body': '''<p>Google今日发布Gemini Ultra 2.0，这是其最新的多模态AI模型。在多项标准化测试中，该模型的表现均超越了目前的GPT-4。</p>
                
                <h3>性能亮点</h3>
                <ul>
                <li>在MMLU测试中得分94.2%，超越GPT-4的86.4%</li>
                <li>代码生成能力提升40%</li>
                <li>科学推理准确率达到92%</li>
                <li>支持32种语言的高质量翻译</li>
                </ul>
                
                <p>Google表示，Gemini Ultra 2.0将首先在Bard中部署，随后会通过API向开发者开放。</p>''',
                'source': 'The Verge',
                'source_url': 'https://theverge.com',
                'category': 'product',
                'is_hot': True,
                'is_top': False,
                'read_count': 12000,
                'image_url': '/images/gemini-ultra-2.jpg',
                'author_name': 'Alex Chen',
                'has_video': True,
                'tags': ['Google', 'Gemini', '产品发布', '基准测试']
            },
            {
                'title': 'AI投资热潮持续，2024年融资额突破800亿美元',
                'introduction': '据最新统计，2024年全球AI领域投资总额已突破800亿美元，其中生成式AI占据了60%以上的份额。',
                'body': '''<p>根据风险投资公司Andreessen Horowitz发布的最新报告，2024年全球AI领域的投资热情持续高涨，总投资额已突破800亿美元大关。</p>
                
                <h3>投资分布</h3>
                <ul>
                <li><strong>生成式AI</strong>：占总投资的65%，约520亿美元</li>
                <li><strong>AI基础设施</strong>：占20%，约160亿美元</li>
                <li><strong>行业应用</strong>：占15%，约120亿美元</li>
                </ul>
                
                <p>报告指出，投资者对AI技术的长期前景依然看好，预计2025年投资额将继续增长。</p>''',
                'source': 'Bloomberg',
                'source_url': 'https://bloomberg.com',
                'category': 'investment',
                'is_hot': True,
                'is_top': False,
                'read_count': 9800,
                'image_url': '/images/ai-investment.jpg',
                'author_name': 'Michael Zhang',
                'has_video': False,
                'tags': ['投资', '融资', '生成式AI', '风险投资']
            },
            {
                'title': 'NVIDIA发布新一代AI芯片H200，性能提升2.5倍',
                'introduction': 'NVIDIA最新发布的H200 GPU在AI训练和推理性能上相比上一代产品提升了2.5倍，进一步巩固了其在AI芯片领域的领导地位。',
                'body': '''<p>NVIDIA今日正式发布新一代AI芯片H200，这款基于Hopper架构的GPU在AI工作负载方面表现出色。</p>
                
                <h3>技术规格</h3>
                <ul>
                <li>配备141GB HBM3e内存，带宽达4.8TB/s</li>
                <li>AI训练性能提升2.5倍</li>
                <li>推理性能提升1.8倍</li>
                <li>功耗降低15%</li>
                </ul>
                
                <p>该芯片将于2024年第二季度开始向主要云服务提供商和企业客户供货。</p>''',
                'source': 'Reuters',
                'source_url': 'https://reuters.com',
                'category': 'technology',
                'is_hot': True,
                'is_top': False,
                'read_count': 8500,
                'image_url': '/images/nvidia-h200.jpg',
                'author_name': 'Lisa Wang',
                'has_video': True,
                'tags': ['NVIDIA', 'AI芯片', '硬件', 'GPU']
            },
            {
                'title': '欧盟AI法案正式生效，全球首个AI监管框架',
                'introduction': '欧盟人工智能法案正式生效，建立了全球首个全面的AI监管框架，对高风险AI系统提出了严格要求。',
                'body': '''<p>欧盟人工智能法案于今日正式生效，这是全球首个全面的AI监管法律框架。该法案根据风险等级对AI系统进行分类管理。</p>
                
                <h3>主要条款</h3>
                <ul>
                <li><strong>禁止性应用</strong>：禁止在公共场所进行实时面部识别</li>
                <li><strong>高风险系统</strong>：医疗、交通等领域的AI需要严格审查</li>
                <li><strong>透明度要求</strong>：AI系统必须明确标识</li>
                <li><strong>罚款机制</strong>：违规企业可面临最高全球年收入7%的罚款</li>
                </ul>
                
                <p>该法案的实施将对全球AI产业产生深远影响，许多公司已开始调整其AI产品以符合新规。</p>''',
                'source': 'EU Parliament',
                'source_url': 'https://europarl.europa.eu',
                'category': 'policy',
                'is_hot': False,
                'is_top': False,
                'read_count': 7200,
                'image_url': '/images/eu-ai-act.jpg',
                'author_name': 'Pierre Dubois',
                'has_video': False,
                'tags': ['欧盟', 'AI法规', '监管', '政策']
            },
            {
                'title': 'Anthropic获得40亿美元投资，用于开发更安全的AI',
                'introduction': 'AI安全公司Anthropic宣布获得Google牵头的40亿美元投资，将用于开发更安全、更可控的AI系统。',
                'body': '''<p>Claude开发商Anthropic今日宣布完成40亿美元的新一轮融资，由Google领投，其他投资者包括Spark Capital和Salesforce Ventures。</p>
                
                <h3>资金用途</h3>
                <ul>
                <li>扩大AI安全研究团队</li>
                <li>开发下一代Claude模型</li>
                <li>建设专用计算基础设施</li>
                <li>推进宪法AI技术</li>
                </ul>
                
                <p>Anthropic表示，将继续专注于开发有用、无害且诚实的AI系统，推动AI安全技术的发展。</p>''',
                'source': 'VentureBeat',
                'source_url': 'https://venturebeat.com',
                'category': 'investment',
                'is_hot': True,
                'is_top': False,
                'read_count': 6000,
                'image_url': '/images/anthropic-funding.jpg',
                'author_name': 'David Kim',
                'has_video': False,
                'tags': ['Anthropic', '融资', 'Claude', 'AI安全']
            }
        ]

        for i, news_data in enumerate(ai_news_data):
            # 计算发布时间（最近7天内的随机时间）
            days_ago = random.randint(0, 7)
            published_at = timezone.now() - timedelta(days=days_ago)
            
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
            parent_page.add_child(instance=news)
            
            # 添加标签
            for tag in news_data['tags']:
                news.tags.add(tag)
            
            news.save()

        self.stdout.write(self.style.SUCCESS(f'✅ 生成了 {len(ai_news_data)} 条AI资讯'))

    def generate_ai_tutorials(self, parent_page):
        """生成AI教程示例数据"""
        ai_tutorials_data = [
            {
                'title': 'ChatGPT使用入门指南',
                'introduction': '从零开始学习如何有效使用ChatGPT，掌握基本的提示工程技巧，提升AI对话效果。',
                'body': '''<h2>什么是ChatGPT？</h2>
                <p>ChatGPT是OpenAI开发的大型语言模型，能够进行自然语言对话、回答问题、协助写作等。</p>
                
                <h2>基本使用方法</h2>
                <ol>
                <li>注册OpenAI账号</li>
                <li>访问chat.openai.com</li>
                <li>输入您的问题或请求</li>
                <li>等待AI回复并继续对话</li>
                </ol>
                
                <h2>提示工程技巧</h2>
                <ul>
                <li><strong>明确具体</strong>：提供清晰、具体的指令</li>
                <li><strong>给出示例</strong>：通过例子说明您的需求</li>
                <li><strong>分步骤</strong>：将复杂任务分解为小步骤</li>
                <li><strong>设定角色</strong>：让AI扮演专家角色</li>
                </ul>''',
                'difficulty': 'beginner',
                'duration': '30分钟',
                'author_name': '张明',
                'category': 'ai-fundamentals',
                'is_hot': True,
                'is_free': True,
                'student_count': 5000,
                'rating': 4.8,
                'tags': ['ChatGPT', '入门', '提示工程', '基础']
            },
            {
                'title': '使用Python构建AI聊天机器人',
                'introduction': '学习如何使用Python和OpenAI API创建自己的聊天机器人，包括环境搭建、API调用和界面设计。',
                'body': '''<h2>环境准备</h2>
                <p>首先安装必要的Python库：</p>
                <pre><code>pip install openai streamlit python-dotenv</code></pre>
                
                <h2>API配置</h2>
                <p>创建.env文件配置OpenAI API密钥：</p>
                <pre><code>OPENAI_API_KEY=your_api_key_here</code></pre>
                
                <h2>基础代码</h2>
                <pre><code>import openai
import streamlit as st
from dotenv import load_dotenv

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

def get_response(message):
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": message}]
    )
    return response.choices[0].message.content</code></pre>''',
                'difficulty': 'intermediate',
                'duration': '2小时',
                'author_name': '李华',
                'category': 'chatbot',
                'is_hot': True,
                'is_free': True,
                'student_count': 3200,
                'rating': 4.6,
                'tags': ['Python', '聊天机器人', 'OpenAI API', '编程']
            },
            {
                'title': 'Stable Diffusion图像生成完全指南',
                'introduction': '深入学习Stable Diffusion的使用方法，包括模型安装、参数调优和高级技巧，创作出色的AI艺术作品。',
                'body': '''<h2>什么是Stable Diffusion？</h2>
                <p>Stable Diffusion是一个开源的文本到图像生成模型，能够根据文字描述创建高质量图像。</p>
                
                <h2>安装步骤</h2>
                <ol>
                <li>安装Python 3.8+</li>
                <li>安装CUDA（NVIDIA GPU用户）</li>
                <li>下载Stable Diffusion WebUI</li>
                <li>下载基础模型文件</li>
                </ol>
                
                <h2>关键参数</h2>
                <ul>
                <li><strong>Steps</strong>：生成步数，通常20-50步</li>
                <li><strong>CFG Scale</strong>：文本引导强度，7-15较好</li>
                <li><strong>Sampling Method</strong>：采样方法，推荐DPM++</li>
                <li><strong>Seed</strong>：随机种子，用于复现结果</li>
                </ul>
                
                <h2>提示词技巧</h2>
                <p>学习如何编写有效的提示词是关键...</p>''',
                'difficulty': 'intermediate',
                'duration': '3小时',
                'author_name': '王芳',
                'category': 'image-generation',
                'is_hot': True,
                'is_free': True,
                'student_count': 4100,
                'rating': 4.7,
                'tags': ['Stable Diffusion', '图像生成', 'AI艺术', '开源']
            },
            {
                'title': '深度学习基础：神经网络原理',
                'introduction': '从数学基础开始，系统学习神经网络的工作原理，包括前向传播、反向传播和梯度下降等核心概念。',
                'body': '''<h2>神经网络简介</h2>
                <p>神经网络是受生物神经元启发的计算模型，通过多层节点处理信息。</p>
                
                <h2>基本组成</h2>
                <ul>
                <li><strong>输入层</strong>：接收原始数据</li>
                <li><strong>隐藏层</strong>：处理和变换数据</li>
                <li><strong>输出层</strong>：产生最终结果</li>
                </ul>
                
                <h2>数学基础</h2>
                <p>理解线性代数、微积分和概率论的基本概念对学习神经网络至关重要。</p>
                
                <h2>激活函数</h2>
                <p>常用的激活函数包括：</p>
                <ul>
                <li>ReLU：f(x) = max(0, x)</li>
                <li>Sigmoid：f(x) = 1/(1+e^(-x))</li>
                <li>Tanh：f(x) = tanh(x)</li>
                </ul>''',
                'difficulty': 'advanced',
                'duration': '5小时',
                'author_name': '陈教授',
                'category': 'machine-learning',
                'is_hot': False,
                'is_free': True,
                'student_count': 2800,
                'rating': 4.9,
                'tags': ['深度学习', '神经网络', '数学基础', '理论']
            },
            {
                'title': 'AI伦理与安全：负责任的AI开发',
                'introduction': '探讨AI技术发展中的伦理问题和安全挑战，学习如何开发负责任的AI系统。',
                'body': '''<h2>AI伦理的重要性</h2>
                <p>随着AI技术的快速发展，确保其安全、公平和有益的使用变得越来越重要。</p>
                
                <h2>主要伦理问题</h2>
                <ul>
                <li><strong>偏见和歧视</strong>：算法可能放大现有的社会偏见</li>
                <li><strong>隐私保护</strong>：数据收集和使用的透明度</li>
                <li><strong>工作替代</strong>：AI对就业市场的影响</li>
                <li><strong>决策透明度</strong>：AI决策过程的可解释性</li>
                </ul>
                
                <h2>最佳实践</h2>
                <ol>
                <li>多样化的开发团队</li>
                <li>定期的偏见测试</li>
                <li>用户知情同意</li>
                <li>持续监控和改进</li>
                </ol>''',
                'difficulty': 'intermediate',
                'duration': '1.5小时',
                'author_name': '刘博士',
                'category': 'ai-ethics',
                'is_hot': False,
                'is_free': True,
                'student_count': 1500,
                'rating': 4.5,
                'tags': ['AI伦理', '安全', '负责任AI', '社会影响']
            },
            {
                'title': 'AI商业应用案例分析',
                'introduction': '通过真实案例分析AI在不同行业的应用，了解AI如何创造商业价值和解决实际问题。',
                'body': '''<h2>AI在各行业的应用</h2>
                
                <h3>医疗健康</h3>
                <ul>
                <li>医学影像诊断</li>
                <li>药物发现</li>
                <li>个性化治疗</li>
                <li>健康监测</li>
                </ul>
                
                <h3>金融服务</h3>
                <ul>
                <li>风险评估</li>
                <li>欺诈检测</li>
                <li>算法交易</li>
                <li>客户服务</li>
                </ul>
                
                <h3>制造业</h3>
                <ul>
                <li>预测性维护</li>
                <li>质量控制</li>
                <li>供应链优化</li>
                <li>智能机器人</li>
                </ul>
                
                <h2>成功案例</h2>
                <p>深入分析Netflix推荐系统、Tesla自动驾驶等成功案例...</p>''',
                'difficulty': 'beginner',
                'duration': '2小时',
                'author_name': '赵经理',
                'category': 'ai-business',
                'is_hot': True,
                'is_free': False,
                'student_count': 3600,
                'rating': 4.4,
                'tags': ['商业应用', '案例分析', '行业应用', 'AI商业化']
            }
        ]

        for i, tutorial_data in enumerate(ai_tutorials_data):
            # 计算发布时间
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
            parent_page.add_child(instance=tutorial)
            
            # 添加标签
            for tag in tutorial_data['tags']:
                tutorial.tags.add(tag)
            
            tutorial.save()

        self.stdout.write(self.style.SUCCESS(f'✅ 生成了 {len(ai_tutorials_data)} 个AI教程'))


if __name__ == '__main__':
    command = Command()
    command.handle()
