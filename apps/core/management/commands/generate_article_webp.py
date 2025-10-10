"""
管理命令：批量为文章图片生成同名 WebP 副本

用法:
    python manage.py generate_article_webp              # 处理所有图片
    python manage.py generate_article_webp --limit 100  # 只处理100张
    python manage.py generate_article_webp --collection news  # 只处理特定collection
    python manage.py generate_article_webp --dry-run    # 只显示统计，不实际生成
"""

from django.core.management.base import BaseCommand
from wagtail.images import get_image_model
from wagtail.models import Collection
from apps.core.tasks.media_tasks import generate_original_size_webp_sync
from django.db.models import Q
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "批量为文章图片生成同名 WebP 副本（用于前端 <picture> 标签优化）"

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='限制处理的图片数量'
        )
        parser.add_argument(
            '--collection',
            type=str,
            default=None,
            help='只处理特定 collection 的图片（按 slug 匹配）'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='只显示统计信息，不实际生成 WebP'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='强制重新生成已存在的 WebP 文件'
        )
        parser.add_argument(
            '--skip-existing',
            action='store_true',
            default=True,
            help='跳过已有 WebP 文件的图片（默认）'
        )

    def handle(self, *args, **options):
        limit = options['limit']
        collection_slug = options['collection']
        dry_run = options['dry_run']
        force = options['force']
        skip_existing = options['skip_existing'] and not force

        ImageModel = get_image_model()

        # 构建查询
        queryset = ImageModel.objects.all()

        # 过滤 collection
        if collection_slug:
            try:
                collection = Collection.objects.get(
                    Q(name__icontains=collection_slug) | Q(slug__icontains=collection_slug)
                )
                queryset = queryset.filter(collection=collection)
                self.stdout.write(
                    self.style.SUCCESS(f"✓ 只处理 collection: {collection.name}")
                )
            except Collection.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f"✗ Collection '{collection_slug}' 不存在")
                )
                return
            except Collection.MultipleObjectsReturned:
                collections = Collection.objects.filter(
                    Q(name__icontains=collection_slug) | Q(slug__icontains=collection_slug)
                )
                self.stdout.write(
                    self.style.ERROR(f"✗ 找到多个匹配的 collection:")
                )
                for c in collections:
                    self.stdout.write(f"  - {c.name} (slug: {c.slug if hasattr(c, 'slug') else 'N/A'})")
                return

        # 只处理 JPG/PNG 图片
        queryset = queryset.filter(
            Q(file__iendswith='.jpg') |
            Q(file__iendswith='.jpeg') |
            Q(file__iendswith='.png') |
            Q(file__iendswith='.JPG') |
            Q(file__iendswith='.JPEG') |
            Q(file__iendswith='.PNG')
        ).order_by('-created_at')

        # 应用限制
        if limit:
            queryset = queryset[:limit]

        total_images = queryset.count()

        self.stdout.write("=" * 80)
        self.stdout.write(self.style.WARNING(f"📊 批量生成 WebP 副本"))
        self.stdout.write("=" * 80)
        self.stdout.write(f"总图片数: {total_images}")
        self.stdout.write(f"Collection: {collection_slug or '全部'}")
        self.stdout.write(f"限制数量: {limit or '无限制'}")
        self.stdout.write(f"模式: {'🔍 演习模式（不实际生成）' if dry_run else '🚀 实际生成'}")
        self.stdout.write(f"跳过已存在: {'是' if skip_existing else '否'}")
        self.stdout.write("=" * 80)

        if dry_run:
            self.stdout.write(
                self.style.WARNING("\n⚠️ 演习模式：只显示统计，不实际生成 WebP\n")
            )

        # 统计
        processed_count = 0
        success_count = 0
        skipped_count = 0
        failed_count = 0

        for image in queryset.iterator():
            processed_count += 1

            try:
                # 显示进度
                if processed_count % 10 == 0 or processed_count == total_images:
                    self.stdout.write(
                        f"\r处理进度: {processed_count}/{total_images} "
                        f"(成功: {success_count}, 跳过: {skipped_count}, 失败: {failed_count})",
                        ending=''
                    )
                    self.stdout.flush()

                if dry_run:
                    # 演习模式：只统计
                    self.stdout.write(
                        f"\n  {processed_count}. [{image.id}] {image.title} - {image.file.name}"
                    )
                    success_count += 1
                    continue

                # 实际生成 WebP
                result = generate_original_size_webp_sync(image)

                if result:
                    success_count += 1
                    if processed_count <= 10 or processed_count % 50 == 0:
                        self.stdout.write(
                            f"\n  ✓ [{image.id}] {image.title}"
                        )
                        self.stdout.write(f"    原图: {image.file.name}")
                        self.stdout.write(f"    WebP: {result}")
                elif result is None and skip_existing:
                    # None 可能表示已存在或跳过
                    skipped_count += 1
                else:
                    failed_count += 1
                    self.stdout.write(
                        f"\n  ✗ [{image.id}] {image.title} - 生成失败"
                    )

            except Exception as e:
                failed_count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f"\n  ✗ [{image.id}] {image.title} - 错误: {e}"
                    )
                )
                logger.error(f"处理图片 {image.id} 失败: {e}")

        # 最终统计
        self.stdout.write("\n\n" + "=" * 80)
        self.stdout.write(self.style.SUCCESS("✅ 批量处理完成"))
        self.stdout.write("=" * 80)
        self.stdout.write(f"总处理数: {processed_count}")
        self.stdout.write(self.style.SUCCESS(f"成功生成: {success_count}"))
        self.stdout.write(self.style.WARNING(f"跳过: {skipped_count}"))
        if failed_count > 0:
            self.stdout.write(self.style.ERROR(f"失败: {failed_count}"))
        else:
            self.stdout.write(f"失败: {failed_count}")
        self.stdout.write("=" * 80)

        if not dry_run:
            self.stdout.write("\n" + self.style.SUCCESS("🎉 WebP 生成任务完成！"))
            self.stdout.write("\n验证生成的 WebP 文件:")
            self.stdout.write("  1. 检查文件系统: ls -lh media/*/images/*.webp")
            self.stdout.write("  2. 测试前端访问: curl https://your-site.com/media/.../xxx.webp")
            self.stdout.write("  3. 检查文章页面，图片应该自动使用 WebP 格式")

