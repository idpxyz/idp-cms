"""
从旧MySQL数据库导入文章到Wagtail CMS

使用方法：
    # 测试模式：导入前10条
    python manage.py import_old_articles --test --limit=10

    # 正式导入：分批处理
    python manage.py import_old_articles --batch-size=1000

    # 从指定位置继续
    python manage.py import_old_articles --start-from=5000
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.utils.text import slugify
from django.db import transaction
from django.core.files.base import ContentFile
from apps.news.models import ArticlePage
from apps.core.models import Channel, Category
from apps.media.models import CustomImage
from wagtail.models import Page, Site
import json
import requests
import os
from datetime import datetime
from pathlib import Path
import re
from bs4 import BeautifulSoup
import time


class Command(BaseCommand):
    help = '从旧MySQL数据库导入文章到Wagtail'

    def __init__(self):
        super().__init__()
        self.stats = {
            'total': 0,
            'success': 0,
            'skipped': 0,
            'failed': 0,
            'cover_images_downloaded': 0,
            'cover_images_failed': 0,
            'inline_images_downloaded': 0,
            'inline_images_failed': 0,
        }
        self.category_mapping = {}  # 将在prepare_environment中加载

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default='data/migration/exports/articles.json',
            help='导入的JSON文件路径'
        )
        parser.add_argument(
            '--limit',
            type=int,
            help='限制导入数量（用于测试）'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='批处理大小'
        )
        parser.add_argument(
            '--start-from',
            type=int,
            default=0,
            help='从第N条开始导入（用于断点续传）'
        )
        parser.add_argument(
            '--test',
            action='store_true',
            help='测试模式（默认只导入10条）'
        )
        parser.add_argument(
            '--skip-images',
            action='store_true',
            help='跳过所有图片下载'
        )
        parser.add_argument(
            '--skip-inline-images',
            action='store_true',
            help='跳过正文图片下载（仅下载封面图）'
        )
        parser.add_argument(
            '--old-site-url',
            type=str,
            default='http://www.hubeitoday.com.cn',
            help='旧站点URL（用于拼接相对路径图片）'
        )
        parser.add_argument(
            '--channel-slug',
            type=str,
            default='news',
            help='目标频道的slug'
        )

    def handle(self, *args, **options):
        self.options = options
        
        # 测试模式
        if options['test'] and not options.get('limit'):
            options['limit'] = 10

        # 检查文件是否存在
        file_path = Path(options['file'])
        if not file_path.exists():
            raise CommandError(f'文件不存在: {file_path}')

        self.stdout.write(self.style.SUCCESS(f'开始导入文章从: {file_path}'))
        
        # 准备导入环境
        self.prepare_environment()

        # 读取数据
        self.stdout.write('读取数据文件...')
        with open(file_path, 'r', encoding='utf-8') as f:
            articles = json.load(f)

        self.stats['total'] = len(articles)
        
        # 应用限制
        start = options['start_from']
        end = start + options['limit'] if options.get('limit') else len(articles)
        articles_to_import = articles[start:end]

        self.stdout.write(self.style.SUCCESS(
            f'准备导入 {len(articles_to_import)} 篇文章 '
            f'(总数: {self.stats["total"]}, 范围: {start}-{end})'
        ))

        # 开始导入
        start_time = time.time()
        
        for i, old_article in enumerate(articles_to_import, start=1):
            self.import_article(old_article, i, len(articles_to_import))

        # 输出统计
        elapsed = time.time() - start_time
        self.print_statistics(elapsed)

    def prepare_environment(self):
        """准备导入环境"""
        # 获取站点和父页面
        try:
            self.site = Site.objects.get(is_default_site=True)
            self.parent_page = self.site.root_page
        except Site.DoesNotExist:
            raise CommandError('找不到默认站点')

        # 加载分类映射表
        mapping_file = Path('data/migration/category_mapping_complete.json')
        if mapping_file.exists():
            with open(mapping_file, 'r', encoding='utf-8') as f:
                mapping_data = json.load(f)
                self.category_mapping = mapping_data.get('mapping', {})
            self.stdout.write(f'已加载分类映射表: {len(self.category_mapping)} 个分类')
        else:
            self.stdout.write(self.style.WARNING(
                '警告: 未找到分类映射表，将使用默认频道'
            ))

        # 缓存所有频道
        self.channels_cache = {ch.id: ch for ch in Channel.objects.all()}
        self.stdout.write(f'已缓存 {len(self.channels_cache)} 个频道')

        # 获取默认频道（用于未映射的分类）
        channel_slug = self.options.get('channel_slug', 'society')
        try:
            self.default_channel = Channel.objects.get(slug=channel_slug)
            self.stdout.write(f'默认频道: {self.default_channel.name}')
        except Channel.DoesNotExist:
            self.stdout.write(self.style.WARNING(
                f'频道 "{channel_slug}" 不存在，将使用第一个频道'
            ))
            self.default_channel = Channel.objects.first()
            if not self.default_channel:
                raise CommandError('数据库中没有任何频道，请先创建频道')

        # 创建图片保存目录
        self.image_dir = Path('data/migration/images')
        self.image_dir.mkdir(parents=True, exist_ok=True)

        # 创建日志目录
        self.log_dir = Path('data/migration/logs')
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        self.error_log = self.log_dir / f'errors_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'

    def get_channel_for_category(self, cate_id):
        """根据旧分类ID获取对应的新频道"""
        if not cate_id:
            return self.default_channel
        
        # 查找映射
        cate_id_str = str(cate_id)
        if cate_id_str in self.category_mapping:
            target_channel_id = self.category_mapping[cate_id_str].get('target_channel_id')
            if target_channel_id and target_channel_id in self.channels_cache:
                return self.channels_cache[target_channel_id]
        
        # 未找到映射，使用默认频道
        return self.default_channel

    def import_article(self, old_article, index, total):
        """导入单篇文章"""
        article_id = old_article.get('id', 'unknown')
        
        try:
            # 生成slug
            slug = self.generate_slug(old_article)

            # 检查是否已存在
            if ArticlePage.objects.filter(slug=slug).exists():
                self.stats['skipped'] += 1
                self.stdout.write(self.style.WARNING(
                    f'[{index}/{total}] 跳过已存在: {slug}'
                ))
                return

            # 使用事务
            with transaction.atomic():
                # 根据分类ID获取频道
                cate_id = old_article.get('cate_id')
                target_channel = self.get_channel_for_category(cate_id)

                # 下载图片
                cover_image = None
                if not self.options['skip_images'] and old_article.get('img'):
                    cover_image = self.download_and_create_image(
                        old_article['img'],
                        old_article.get('title', 'Untitled')
                    )

                # 处理正文内容
                body_html = old_article.get('info', '') or old_article.get('content', '')
                body_richtext = self.convert_html_to_richtext(body_html)

                # 创建文章页面
                article = ArticlePage(
                    title=self.clean_text(old_article.get('title', 'Untitled')),
                    slug=slug,
                    excerpt=self.clean_text(old_article.get('seo_desc', ''))[:500],
                    body=body_richtext,
                    cover=cover_image,
                    channel=target_channel,  # 使用映射后的频道
                    author_name=self.clean_text(old_article.get('author', ''))[:64],
                    has_video=bool(old_article.get('video')),
                    meta_keywords=self.clean_text(old_article.get('seo_keys', ''))[:255],
                    seo_title=self.clean_text(
                        old_article.get('seo_title') or old_article.get('title', '')
                    ),
                    search_description=self.clean_text(old_article.get('seo_desc', ''))[:300],
                    external_url=old_article.get('fromurl', ''),
                    first_published_at=self.parse_timestamp(old_article.get('add_time')),
                    last_published_at=self.parse_timestamp(old_article.get('last_time')),
                    live=(old_article.get('status') == 1 or old_article.get('status') == '1'),
                )

                # 添加到页面树
                self.parent_page.add_child(instance=article)

                # 处理标签
                if old_article.get('tags'):
                    self.add_tags(article, old_article['tags'])

                # 保存
                article.save_revision().publish() if article.live else article.save_revision()

                self.stats['success'] += 1
                self.stdout.write(self.style.SUCCESS(
                    f'[{index}/{total}] ✓ 导入成功: {article.title[:50]}'
                ))

        except Exception as e:
            self.stats['failed'] += 1
            error_msg = f'导入失败 [ID: {article_id}]: {str(e)}'
            self.stdout.write(self.style.ERROR(f'[{index}/{total}] ✗ {error_msg}'))
            
            # 记录错误日志
            with open(self.error_log, 'a', encoding='utf-8') as f:
                f.write(f'{datetime.now().isoformat()}: {error_msg}\n')
                f.write(f'  数据: {json.dumps(old_article, ensure_ascii=False)}\n\n')

    def generate_slug(self, article):
        """生成唯一的slug"""
        # 优先使用URL中的slug
        if article.get('url'):
            url = article['url'].strip('/')
            slug = url.split('/')[-1]
            slug = slug.split('.')[0]  # 移除扩展名
            # 清理slug
            slug = re.sub(r'[^\w\s-]', '', slug).strip().lower()
            slug = re.sub(r'[-\s]+', '-', slug)
        else:
            # 从标题生成
            slug = slugify(article.get('title', 'article'))

        # 使用ID作为后缀确保唯一性
        if article.get('id'):
            slug = f"{slug}-{article['id']}"

        # 确保唯一性
        base_slug = slug
        counter = 1
        while ArticlePage.objects.filter(slug=slug).exists():
            slug = f'{base_slug}-{counter}'
            counter += 1

        return slug[:255]  # Django slug字段通常限制255字符

    def download_and_create_image(self, image_url, title, image_type='cover'):
        """下载图片并创建CustomImage
        
        Args:
            image_url: 图片URL（相对或绝对路径）
            title: 图片标题
            image_type: 图片类型（'cover'封面或'inline'正文）
        """
        if not image_url:
            return None

        # 处理相对路径
        if not image_url.startswith('http'):
            # 跳过占位图
            if 'placeholder' in image_url.lower():
                return None
            # 拼接完整URL
            old_site_url = self.options.get('old_site_url', 'http://www.hubeitoday.com.cn')
            image_url = old_site_url.rstrip('/') + '/' + image_url.lstrip('/')

        try:
            # 下载图片
            response = requests.get(image_url, timeout=15)
            response.raise_for_status()

            # 检查文件大小（最大10MB）
            content_length = len(response.content)
            if content_length > 10 * 1024 * 1024:
                raise Exception(f'图片过大: {content_length / 1024 / 1024:.1f}MB')

            # 获取文件名
            filename = os.path.basename(image_url.split('?')[0])
            if not filename or len(filename) > 100:
                ext = 'jpg'
                if 'image/png' in response.headers.get('Content-Type', ''):
                    ext = 'png'
                filename = f'{image_type}_{int(time.time())}_{hash(image_url) % 10000}.{ext}'

            # 创建CustomImage
            image = CustomImage(
                title=title[:100],
            )
            image.file.save(
                filename,
                ContentFile(response.content),
                save=True
            )

            # 更新统计
            if image_type == 'cover':
                self.stats['cover_images_downloaded'] += 1
            else:
                self.stats['inline_images_downloaded'] += 1
            
            return image

        except Exception as e:
            # 更新失败统计
            if image_type == 'cover':
                self.stats['cover_images_failed'] += 1
            else:
                self.stats['inline_images_failed'] += 1
                
            self.stdout.write(self.style.WARNING(
                f'  {image_type}图片下载失败: {image_url[:50]}... - {str(e)}'
            ))
            return None

    def convert_html_to_richtext(self, html):
        """转换HTML为Wagtail RichText格式并处理图片"""
        if not html:
            return ''

        try:
            # 使用BeautifulSoup清理HTML
            soup = BeautifulSoup(html, 'html.parser')
            
            # 移除script和style标签
            for tag in soup(['script', 'style']):
                tag.decompose()

            # 处理正文图片（如果未跳过）
            if not self.options.get('skip_images') and not self.options.get('skip_inline_images'):
                for img_tag in soup.find_all('img'):
                    old_src = img_tag.get('src')
                    if not old_src:
                        continue
                    
                    # 下载图片并替换URL
                    new_image = self.download_and_create_image(
                        old_src,
                        'inline-image',
                        image_type='inline'
                    )
                    
                    if new_image:
                        # 替换为新的图片URL
                        img_tag['src'] = new_image.file.url
                        # 保留或添加alt属性
                        if not img_tag.get('alt'):
                            img_tag['alt'] = ''
                    else:
                        # 下载失败，保留原URL
                        # 如果是相对路径，转换为绝对路径
                        if not old_src.startswith('http'):
                            old_site_url = self.options.get('old_site_url', 'http://www.hubeitoday.com.cn')
                            img_tag['src'] = old_site_url.rstrip('/') + '/' + old_src.lstrip('/')

            # 获取清理后的HTML
            cleaned_html = str(soup)
            
            return cleaned_html
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'  HTML转换警告: {str(e)}'))
            return html

    def add_tags(self, article, tags_string):
        """添加标签"""
        try:
            # 分割标签字符串
            tags = [t.strip() for t in re.split(r'[,，;；]', tags_string) if t.strip()]
            
            # 添加标签
            for tag_name in tags[:10]:  # 限制最多10个标签
                article.tags.add(tag_name)
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'  标签添加失败: {str(e)}'))

    def clean_text(self, text):
        """清理文本"""
        if not text:
            return ''
        
        # 移除特殊字符
        text = str(text).strip()
        # 移除null字符
        text = text.replace('\x00', '')
        
        return text

    def parse_timestamp(self, timestamp):
        """时间戳转datetime"""
        if not timestamp:
            return timezone.now()
        
        try:
            # 尝试转换为整数时间戳
            ts = int(timestamp)
            # 检查是否是毫秒时间戳
            if ts > 10000000000:
                ts = ts / 1000
            return datetime.fromtimestamp(ts, tz=timezone.utc)
        except (ValueError, TypeError, OSError):
            return timezone.now()

    def print_statistics(self, elapsed):
        """打印统计信息"""
        self.stdout.write('\n' + '=' * 80)
        self.stdout.write(self.style.SUCCESS('📊 导入完成！'))
        self.stdout.write('=' * 80)
        
        # 文章统计
        self.stdout.write('\n📄 文章统计:')
        total = self.stats["success"] + self.stats["failed"] + self.stats["skipped"]
        self.stdout.write(f'  总计:         {total}')
        self.stdout.write(self.style.SUCCESS(f'  ✓ 成功:      {self.stats["success"]}'))
        self.stdout.write(self.style.WARNING(f'  ⊘ 跳过:      {self.stats["skipped"]}'))
        self.stdout.write(self.style.ERROR(f'  ✗ 失败:      {self.stats["failed"]}'))
        
        # 图片统计
        self.stdout.write('\n📸 图片统计:')
        cover_total = self.stats["cover_images_downloaded"] + self.stats["cover_images_failed"]
        inline_total = self.stats["inline_images_downloaded"] + self.stats["inline_images_failed"]
        
        self.stdout.write(f'  封面图片:')
        self.stdout.write(f'    ✓ 成功:    {self.stats["cover_images_downloaded"]}')
        self.stdout.write(f'    ✗ 失败:    {self.stats["cover_images_failed"]}')
        if cover_total > 0:
            success_rate = (self.stats["cover_images_downloaded"] / cover_total) * 100
            self.stdout.write(f'    成功率:    {success_rate:.1f}%')
        
        self.stdout.write(f'  正文图片:')
        self.stdout.write(f'    ✓ 成功:    {self.stats["inline_images_downloaded"]}')
        self.stdout.write(f'    ✗ 失败:    {self.stats["inline_images_failed"]}')
        if inline_total > 0:
            success_rate = (self.stats["inline_images_downloaded"] / inline_total) * 100
            self.stdout.write(f'    成功率:    {success_rate:.1f}%')
        
        # 时间统计
        self.stdout.write('\n⏱️  时间统计:')
        self.stdout.write(f'  总用时:       {elapsed:.2f} 秒 ({elapsed/60:.1f} 分钟)')
        
        if self.stats['success'] > 0:
            avg_time = elapsed / self.stats['success']
            self.stdout.write(f'  平均速度:     {avg_time:.2f} 秒/篇')
        
        # 错误日志
        if self.stats['failed'] > 0:
            self.stdout.write('\n' + self.style.WARNING(f'⚠️  错误日志: {self.error_log}'))
        
        self.stdout.write('\n' + '=' * 80)

