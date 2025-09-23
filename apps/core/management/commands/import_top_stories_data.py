#!/usr/bin/env python3
"""
导入头条新闻数据 - 将TopStories的mock数据写入数据库

用法：
  python manage.py import_top_stories_data                    # 导入所有头条新闻数据
  python manage.py import_top_stories_data --site=aivoya.com  # 导入到指定站点
  python manage.py import_top_stories_data --replace          # 清除现有头条数据后导入
"""

import os
import requests
import tempfile
from pathlib import Path
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.files import File
from django.core.files.images import ImageFile
from wagtail.models import Site
from wagtail.images import get_image_model
from apps.news.models import ArticlePage
from apps.core.models import Channel, Region
from datetime import datetime, timedelta
import random
import hashlib


class Command(BaseCommand):
    help = "导入头条新闻数据到数据库，包括下载和处理图片"

    def add_arguments(self, parser):
        parser.add_argument(
            '--site',
            type=str,
            default='aivoya.com',
            help='目标站点（默认aivoya.com）',
        )
        parser.add_argument(
            '--replace',
            action='store_true',
            help='清除现有头条数据后导入新数据',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='预览模式，不实际创建数据',
        )

    def handle(self, *args, **options):
        self.site_hostname = options['site']
        self.replace = options.get('replace', False)
        self.dry_run = options.get('dry_run', False)
        
        self.style.SUCCESS = self.style.HTTP_SUCCESS
        self.stdout.write(
            self.style.SUCCESS(f'🚀 开始导入头条新闻数据到站点: {self.site_hostname}')
        )
        
        try:
            # 获取目标站点
            self.site = Site.objects.get(hostname=self.site_hostname)
            self.stdout.write(f'✅ 找到目标站点: {self.site.site_name}')
        except Site.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'❌ 站点 {self.site_hostname} 不存在')
            )
            return

        # 获取Wagtail图片模型
        self.Image = get_image_model()

        # 清除现有数据（如果指定了--replace）
        if self.replace:
            self.clear_existing_data()

        # 创建频道数据
        self.create_channels()

        # 获取mock数据并导入
        mock_data = self.get_mock_top_stories_data()
        self.import_top_stories(mock_data)

        self.stdout.write(
            self.style.SUCCESS('🎉 头条新闻数据导入完成！')
        )

    def clear_existing_data(self):
        """清除现有的头条新闻数据"""
        if self.dry_run:
            self.stdout.write('🔍 [预览] 将清除现有头条新闻数据...')
            return

        # 清除标记为头条的文章（通过is_featured字段识别）
        existing_articles = ArticlePage.objects.filter(
            is_featured=True
        ).exclude(is_hero=True)  # 保留Hero数据，只清除非Hero的featured数据
        
        count = existing_articles.count()
        if count > 0:
            existing_articles.delete()
            self.stdout.write(f'🗑️ 已清除 {count} 条现有头条新闻数据')
        else:
            self.stdout.write('ℹ️ 没有找到需要清除的现有数据')

    def create_channels(self):
        """创建频道数据并关联到当前站点"""
        channels_data = [
            {'name': '财经', 'slug': 'finance', 'order': 10},
            {'name': '科技', 'slug': 'tech', 'order': 20},
            {'name': '教育', 'slug': 'education', 'order': 30},
            {'name': '环境', 'slug': 'environment', 'order': 40},
            {'name': '体育', 'slug': 'sports', 'order': 50},
            {'name': '文化', 'slug': 'culture', 'order': 60},
            {'name': '健康', 'slug': 'health', 'order': 70},
            {'name': '交通', 'slug': 'transport', 'order': 80},
            {'name': '农业', 'slug': 'agriculture', 'order': 90},
        ]
        
        for channel_data in channels_data:
            if self.dry_run:
                self.stdout.write(f'🔍 [预览] 将创建频道: {channel_data["name"]} ({channel_data["slug"]})')
                continue
                
            channel, created = Channel.objects.get_or_create(
                slug=channel_data['slug'],
                defaults={
                    'name': channel_data['name'],
                    'order': channel_data['order'],
                    'is_active': True,
                }
            )
            
            # 确保频道关联到当前站点
            if not channel.sites.filter(id=self.site.id).exists():
                channel.sites.add(self.site)
                self.stdout.write(f'🔗 频道 {channel.name} 已关联到站点 {self.site.site_name}')
            
            if created:
                self.stdout.write(f'✅ 创建频道: {channel.name}')
            else:
                self.stdout.write(f'ℹ️ 频道已存在: {channel.name}')

    def get_mock_top_stories_data(self):
        """获取TopStories的mock数据"""
        now = timezone.now()
        
        return [
            {
                'title': '全球经济复苏加速，中国GDP增长超预期达到8.5%',
                'slug': 'china-gdp-growth-exceeds-expectations',
                'excerpt': '国家统计局今日发布最新数据显示，中国经济在第三季度表现强劲，GDP同比增长8.5%，超出市场预期的7.8%。专家认为，这得益于消费复苏和出口贸易的强劲增长。',
                'image_url': 'https://picsum.photos/800/450?random=1',
                'publish_time': now - timedelta(minutes=30),
                'author': '经济日报记者',
                'channel_slug': 'finance',
                'tags': ['经济', 'GDP', '增长'],
                'is_featured': True,
                'is_editor_pick': True,
                'weight': 100,
            },
            {
                'title': '科技创新突破：量子计算机实现新的里程碑式进展',
                'slug': 'quantum-computing-breakthrough-milestone',
                'excerpt': '中科院量子信息与量子科技创新研究院宣布，其研发的量子计算机在特定算法上的计算能力较传统超级计算机提升了100万倍。',
                'image_url': 'https://picsum.photos/800/450?random=2',
                'publish_time': now - timedelta(hours=1),
                'author': '科技日报',
                'channel_slug': 'tech',
                'tags': ['科技', '量子计算', '创新'],
                'is_featured': True,
                'is_editor_pick': False,
                'weight': 90,
            },
            {
                'title': '教育改革新政策：义务教育阶段将全面实施素质教育评价体系',
                'slug': 'education-reform-quality-assessment-system',
                'excerpt': '教育部发布新的教育评价改革方案，将在全国义务教育阶段全面推行多元化素质教育评价体系，改变唯分数论的传统模式。',
                'image_url': 'https://picsum.photos/800/450?random=3',
                'publish_time': now - timedelta(hours=2),
                'author': '教育周刊',
                'channel_slug': 'education',
                'tags': ['教育', '改革', '评价体系'],
                'is_featured': False,
                'is_editor_pick': True,
                'weight': 80,
            },
            {
                'title': '环保新举措：全国碳交易市场启动，助力碳中和目标实现',
                'slug': 'national-carbon-trading-market-launch',
                'excerpt': '全国碳排放权交易市场正式启动交易，首日成交量达到410万吨，成交额超过2亿元，标志着中国碳市场建设迈出重要一步。',
                'image_url': 'https://picsum.photos/800/450?random=4',
                'publish_time': now - timedelta(hours=3),
                'author': '环境报',
                'channel_slug': 'environment',
                'tags': ['环保', '碳交易', '碳中和'],
                'is_featured': False,
                'is_editor_pick': False,
                'weight': 70,
            },
            {
                'title': '体育盛事：2024年奥运会中国代表团名单公布，创历史新高',
                'slug': 'china-olympics-team-2024-record-size',
                'excerpt': '中国奥委会正式公布2024年巴黎奥运会中国体育代表团名单，共有777名运动员参加33个大项的比赛，参赛人数创历史新高。',
                'image_url': 'https://picsum.photos/800/450?random=5',
                'publish_time': now - timedelta(hours=4),
                'author': '体育周报',
                'channel_slug': 'sports',
                'tags': ['体育', '奥运会', '代表团'],
                'is_featured': False,
                'is_editor_pick': False,
                'weight': 60,
            },
            {
                'title': '文化传承：非遗保护工作取得重大进展，数字化保护全面启动',
                'slug': 'intangible-heritage-digital-protection-project',
                'excerpt': '文化和旅游部宣布启动非物质文化遗产数字化保护工程，计划用5年时间建成覆盖全国的非遗数字化保护体系。',
                'image_url': 'https://picsum.photos/800/450?random=6',
                'publish_time': now - timedelta(hours=5),
                'author': '文化日报',
                'channel_slug': 'culture',
                'tags': ['文化', '非遗', '数字化'],
                'is_featured': False,
                'is_editor_pick': False,
                'weight': 50,
            },
            {
                'title': '医疗健康：新冠疫苗接种率达95%，群体免疫屏障基本建立',
                'slug': 'covid-vaccine-coverage-95-percent',
                'excerpt': '国家卫健委发布数据显示，全国新冠疫苗接种率已达95%，有效建立了群体免疫屏障，为经济社会全面恢复提供了坚实保障。',
                'image_url': 'https://picsum.photos/800/450?random=7',
                'publish_time': now - timedelta(hours=6),
                'author': '健康报',
                'channel_slug': 'health',
                'tags': ['医疗', '疫苗', '健康'],
                'is_featured': False,
                'is_editor_pick': False,
                'weight': 40,
            },
            {
                'title': '交通发展：高铁网络再扩容，新增3条高速铁路线正式通车',
                'slug': 'high-speed-rail-network-expansion',
                'excerpt': '今日，京雄商高铁、西十高铁、成达万高铁三条新线同时开通运营，中国高铁运营里程突破4.5万公里，覆盖全国主要城市群。',
                'image_url': 'https://picsum.photos/800/450?random=8',
                'publish_time': now - timedelta(hours=7),
                'author': '交通日报',
                'channel_slug': 'transport',
                'tags': ['交通', '高铁', '基建'],
                'is_featured': False,
                'is_editor_pick': False,
                'weight': 30,
            },
            {
                'title': '农业现代化：智慧农业试点成效显著，粮食产量提升15%',
                'slug': 'smart-agriculture-pilot-success',
                'excerpt': '农业农村部公布智慧农业试点成果，通过物联网、大数据、人工智能等技术应用，试点地区粮食产量平均提升15%，农药使用量减少30%。',
                'image_url': 'https://picsum.photos/800/450?random=9',
                'publish_time': now - timedelta(hours=8),
                'author': '农民日报',
                'channel_slug': 'agriculture',
                'tags': ['农业', '智慧农业', '现代化'],
                'is_featured': False,
                'is_editor_pick': False,
                'weight': 20,
            },
        ]

    def download_image(self, image_url, title):
        """下载图片并返回临时文件路径"""
        try:
            # 为每个URL生成一个唯一的文件名，避免重复下载
            url_hash = hashlib.md5(image_url.encode()).hexdigest()[:8]
            safe_title = "".join(c for c in title[:20] if c.isalnum() or c in (' ', '-', '_')).rstrip()
            filename = f"topstory_{url_hash}_{safe_title}.jpg"
            
            self.stdout.write(f'📥 下载图片: {image_url}')
            
            # 下载图片
            response = requests.get(image_url, stream=True, timeout=30)
            response.raise_for_status()
            
            # 创建临时文件
            temp_dir = tempfile.gettempdir()
            temp_path = Path(temp_dir) / filename
            
            with open(temp_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            self.stdout.write(f'✅ 图片下载成功: {temp_path}')
            return str(temp_path)
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ 图片下载失败 {image_url}: {str(e)}')
            )
            return None

    def create_wagtail_image(self, image_path, title):
        """创建Wagtail图片记录"""
        try:
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"图片文件不存在: {image_path}")
            
            # 生成唯一标题，避免重复
            base_title = f"TopStory - {title[:50]}"
            counter = 1
            unique_title = base_title
            
            while self.Image.objects.filter(title=unique_title).exists():
                unique_title = f"{base_title} ({counter})"
                counter += 1
            
            # 创建Wagtail图片对象
            with open(image_path, 'rb') as f:
                image_file = ImageFile(f, name=Path(image_path).name)
                image = self.Image(
                    title=unique_title,
                    file=image_file,
                    uploaded_by_user_id=1,  # 假设存在ID为1的用户，实际应该使用当前用户
                )
                image.save()
            
            self.stdout.write(f'✅ 创建Wagtail图片记录: {unique_title}')
            
            # 清理临时文件
            try:
                os.unlink(image_path)
                self.stdout.write(f'🗑️ 已清理临时文件: {image_path}')
            except:
                pass  # 忽略清理失败
            
            return image
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ 创建Wagtail图片失败: {str(e)}')
            )
            return None

    def import_top_stories(self, mock_data):
        """导入头条新闻数据"""
        self.stdout.write(f'📰 开始导入 {len(mock_data)} 条头条新闻数据...')
        
        success_count = 0
        error_count = 0
        
        for item in mock_data:
            try:
                if self.dry_run:
                    self.stdout.write(f'🔍 [预览] 将创建文章: {item["title"]}')
                    success_count += 1
                    continue
                
                # 检查是否已存在相同slug的文章
                if ArticlePage.objects.filter(slug=item['slug']).exists():
                    self.stdout.write(f'⚠️ 文章已存在，跳过: {item["title"]}')
                    continue
                
                # 下载图片
                image_path = self.download_image(item['image_url'], item['title'])
                image_record = None
                if image_path:
                    image_record = self.create_wagtail_image(image_path, item['title'])
                
                # 获取频道
                try:
                    channel = Channel.objects.get(slug=item['channel_slug'])
                except Channel.DoesNotExist:
                    self.stdout.write(f'⚠️ 频道不存在: {item["channel_slug"]}，使用默认频道')
                    channel = None
                
                # 创建文章页面
                article = ArticlePage(
                    title=item['title'],
                    slug=item['slug'],
                    excerpt=item['excerpt'],
                    author_name=item['author'],  # 修正字段名称
                    cover=image_record,
                    channel=channel,
                    is_hero=False,  # 这些是TopStories，不是Hero
                    is_featured=item['is_featured'],
                    weight=item['weight'],
                    publish_at=item['publish_time'],
                    # 简单的正文内容
                    body=f'<p>{item["excerpt"]}</p><p>这是一条由系统自动导入的头条新闻数据，用于演示和测试目的。实际内容应该由编辑人员补充完善。</p>',
                )
                
                # 添加到站点首页
                home_page = self.site.root_page
                home_page.add_child(instance=article)
                
                # 创建修订版本并发布
                revision = article.save_revision()
                revision.publish()
                
                self.stdout.write(f'✅ 成功创建文章: {article.title}')
                success_count += 1
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'❌ 创建文章失败 {item["title"]}: {str(e)}')
                )
                error_count += 1
        
        # 统计结果
        self.stdout.write(
            self.style.SUCCESS(
                f'📊 导入完成！成功: {success_count}条，失败: {error_count}条'
            )
        )
