#!/usr/bin/env python3
"""
导入Hero轮播数据 - 将mock数据写入数据库

用法：
  python manage.py import_hero_data                    # 导入所有hero数据
  python manage.py import_hero_data --site=aivoya.com  # 导入到指定站点
  python manage.py import_hero_data --replace          # 清除现有hero数据后导入
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
from datetime import datetime
import random


class Command(BaseCommand):
    help = "导入Hero轮播数据到数据库，包括下载和处理图片"

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
            help='清除现有hero数据后导入新数据',
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
            self.style.SUCCESS(f'🚀 开始导入Hero轮播数据到站点: {self.site_hostname}')
        )
        
        try:
            # 获取目标站点
            self.site = Site.objects.get(hostname=self.site_hostname)
            self.stdout.write(f'✅ 找到目标站点: {self.site.site_name}')
            
            # 获取站点根页面
            self.root_page = self.site.root_page
            self.stdout.write(f'📄 站点根页面: {self.root_page.title}')
            
            # 清除现有hero数据（如果指定）
            if self.replace:
                self.clear_existing_hero_data()
            
            # 导入hero数据
            self.import_hero_items()
            
        except Site.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'❌ 站点 "{self.site_hostname}" 不存在')
            )
            return
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ 导入过程中出错: {str(e)}')
            )
            raise

    def clear_existing_hero_data(self):
        """清除现有的hero数据"""
        if self.dry_run:
            hero_count = ArticlePage.objects.filter(is_hero=True).count()
            self.stdout.write(f'🔍 [预览] 将删除 {hero_count} 条现有hero数据')
            return
        
        deleted_count, _ = ArticlePage.objects.filter(is_hero=True).delete()
        self.stdout.write(f'🗑️ 删除了 {deleted_count} 条现有hero数据')

    def download_image(self, url, filename_prefix="hero"):
        """下载图片并返回Django File对象"""
        self.stdout.write(f'📥 正在下载图片: {url}')
        
        try:
            response = requests.get(url, timeout=30, stream=True)
            response.raise_for_status()
            
            # 创建临时文件
            suffix = '.jpg'  # picsum返回的是jpg格式
            temp_file = tempfile.NamedTemporaryFile(
                suffix=suffix, 
                prefix=f'{filename_prefix}_',
                delete=False
            )
            
            # 下载图片内容
            for chunk in response.iter_content(chunk_size=8192):
                temp_file.write(chunk)
            
            temp_file.close()
            
            # 创建Django File对象
            with open(temp_file.name, 'rb') as f:
                django_file = File(f, name=f"{filename_prefix}_{random.randint(1000, 9999)}{suffix}")
                file_copy = django_file.read()
            
            # 清理临时文件
            os.unlink(temp_file.name)
            
            # 重新创建File对象用于上传
            temp_file2 = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
            temp_file2.write(file_copy)
            temp_file2.close()
            
            return temp_file2.name, f"{filename_prefix}_{random.randint(1000, 9999)}{suffix}"
            
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(f'⚠️ 图片下载失败 ({url}): {str(e)}')
            )
            return None, None

    def create_wagtail_image(self, image_path, filename, title="Hero轮播图"):
        """创建Wagtail图片对象"""
        if self.dry_run:
            self.stdout.write(f'🔍 [预览] 将创建Wagtail图片: {title}')
            return None
        
        CustomImage = get_image_model()
        
        try:
            with open(image_path, 'rb') as f:
                wagtail_image = CustomImage(
                    title=title,
                    file=ImageFile(f, name=filename)
                )
                wagtail_image.save()
            
            # 清理临时文件
            os.unlink(image_path)
            
            self.stdout.write(f'🖼️ 创建Wagtail图片成功: {wagtail_image.title} (ID: {wagtail_image.id})')
            return wagtail_image
            
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(f'⚠️ 创建Wagtail图片失败: {str(e)}')
            )
            # 清理临时文件
            if os.path.exists(image_path):
                os.unlink(image_path)
            return None

    def get_or_create_channel(self, channel_data):
        """获取或创建频道"""
        if not channel_data:
            return None
        
        try:
            channel, created = Channel.objects.get_or_create(
                slug=channel_data['slug'],
                defaults={
                    'name': channel_data['name'],
                    'is_active': True,
                    'order': 0
                }
            )
            
            # 确保频道关联到当前站点
            if not channel.sites.filter(id=self.site.id).exists():
                channel.sites.add(self.site)
            
            if created:
                self.stdout.write(f'📂 创建新频道: {channel.name}')
            
            return channel
            
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(f'⚠️ 频道创建失败: {str(e)}')
            )
            return None

    def import_hero_items(self):
        """导入hero数据项"""
        # Hero mock数据
        hero_items = [
            {
                'id': '1',
                'title': '重大突发：全球科技峰会在北京召开，探讨人工智能未来发展方向',
                'excerpt': '来自全球50多个国家的科技领袖齐聚北京，共同探讨人工智能、量子计算等前沿技术的发展趋势和应用前景。',
                'image_url': 'https://picsum.photos/1200/600?random=1',
                'author': '科技日报',
                'source': '新华社',
                'channel': {'id': 'tech', 'name': '科技', 'slug': 'tech'},
                'slug': 'global-tech-summit-beijing-2024',
                'tags': ['科技', '人工智能', '峰会'],
            },
            {
                'id': '2',
                'title': '经济新动向：央行宣布新一轮货币政策调整，支持实体经济发展',
                'excerpt': '中国人民银行今日宣布调整货币政策工具，通过定向降准等措施，进一步支持小微企业和实体经济发展。',
                'image_url': 'https://picsum.photos/1200/600?random=2',
                'author': '财经记者',
                'source': '财经日报',
                'channel': {'id': 'finance', 'name': '财经', 'slug': 'finance'},
                'slug': 'pboc-monetary-policy-adjustment-2024',
                'tags': ['经济', '货币政策', '央行'],
            },
            {
                'id': '3',
                'title': '地球美景：探索我们美丽的蓝色星球，感受自然的壮丽与神奇',
                'excerpt': '从太空俯瞰地球，感受这颗蓝色星球的壮丽景色。海洋、陆地、云层交相辉映，展现出大自然的无穷魅力和生命的奇迹。',
                'image_url': 'https://picsum.photos/1200/600?random=3',
                'author': '科学记者',
                'source': '自然地理',
                'channel': {'id': 'science', 'name': '科学', 'slug': 'science'},
                'slug': 'earth-beauty-from-space',
                'tags': ['科学', '地球', '自然'],
            },
            {
                'id': '4',
                'title': '文化传承：传统工艺与现代设计的完美融合，非遗文化焕发新活力',
                'excerpt': '在数字化时代，传统非物质文化遗产通过与现代设计理念的结合，展现出了全新的魅力和生命力。',
                'image_url': 'https://picsum.photos/1200/600?random=4',
                'author': '文化记者',
                'source': '文化日报',
                'channel': {'id': 'culture', 'name': '文化', 'slug': 'culture'},
                'slug': 'traditional-crafts-modern-design-integration',
                'tags': ['文化', '非遗', '传统工艺'],
            },
            {
                'id': '5',
                'title': '国际关注：全球气候变化大会达成重要共识，各国承诺减排目标',
                'excerpt': '在最新的气候变化大会上，各国代表就减排目标和绿色发展路径达成重要共识，为全球应对气候变化注入新动力。',
                'image_url': 'https://picsum.photos/1200/600?random=5',
                'author': '环境记者',
                'source': '环球时报',
                'channel': {'id': 'international', 'name': '国际', 'slug': 'international'},
                'slug': 'global-climate-summit-consensus-2024',
                'tags': ['国际', '气候变化', '环保'],
            },
        ]
        
        success_count = 0
        
        for i, item in enumerate(hero_items, 1):
            self.stdout.write(f'\n📝 处理第 {i}/{len(hero_items)} 条Hero数据: {item["title"][:30]}...')
            
            try:
                # 1. 下载并创建图片
                cover_image = None
                if item.get('image_url'):
                    image_path, filename = self.download_image(
                        item['image_url'], 
                        f"hero_{item['id']}"
                    )
                    if image_path and filename:
                        cover_image = self.create_wagtail_image(
                            image_path, 
                            filename,
                            f"Hero轮播图 - {item['title'][:20]}"
                        )
                
                # 2. 创建或获取频道
                channel = self.get_or_create_channel(item.get('channel'))
                
                # 3. 创建文章页面
                if not self.dry_run:
                    article = ArticlePage(
                        title=item['title'],
                        excerpt=item['excerpt'],
                        body=f"<p>{item['excerpt']}</p>",  # 简单的body内容
                        cover=cover_image,
                        channel=channel,
                        author_name=item.get('author', ''),
                        slug=item['slug'],
                        is_hero=True,  # 关键：标记为hero
                        is_featured=True,  # 同时标记为推荐
                        weight=100 - i,  # 权重递减
                        publish_at=timezone.now(),
                        source_type='internal',
                    )
                    
                    # 添加到站点根页面下
                    self.root_page.add_child(instance=article)
                    
                    # 添加标签
                    if item.get('tags'):
                        for tag_name in item['tags']:
                            article.tags.add(tag_name)
                    
                    # 发布文章
                    article.save_revision().publish()
                    
                    self.stdout.write(
                        self.style.SUCCESS(f'✅ 成功创建Hero文章: {article.title} (ID: {article.id})')
                    )
                else:
                    self.stdout.write(f'🔍 [预览] 将创建Hero文章: {item["title"]}')
                
                success_count += 1
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'❌ 创建Hero文章失败: {str(e)}')
                )
                continue
        
        # 总结
        self.stdout.write(f'\n🎉 Hero数据导入完成!')
        self.stdout.write(f'📊 成功导入: {success_count}/{len(hero_items)} 条数据')
        
        if not self.dry_run:
            self.stdout.write(f'🌐 站点: {self.site.site_name} ({self.site.hostname})')
            self.stdout.write(f'📍 访问前端查看效果')
        else:
            self.stdout.write('💡 这是预览模式，没有实际创建数据。去掉 --dry-run 参数来执行导入。')
