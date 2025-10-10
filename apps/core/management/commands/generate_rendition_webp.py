"""
批量为现有的 Renditions 生成 WebP 副本

这个命令用于处理历史数据，为所有已存在的 renditions 生成 WebP 版本。
主要用于 Wagtail 编辑器中插入的图片（使用 rendition 路径）。
"""

from django.core.management.base import BaseCommand
from wagtail.images import get_image_model
from apps.core.tasks.media_tasks import generate_rendition_webp_copy

Image = get_image_model()
Rendition = Image.get_rendition_model()


class Command(BaseCommand):
    help = '批量为现有的 renditions 生成 WebP 副本'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            help='限制处理的 rendition 数量',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='演习模式，不实际生成文件',
        )

    def handle(self, *args, **options):
        limit = options['limit']
        dry_run = options['dry_run']

        self.stdout.write(self.style.SUCCESS('开始为 renditions 生成 WebP...'))

        # 查询所有非 WebP 的 renditions
        queryset = Rendition.objects.filter(
            file__regex=r'\.(jpg|jpeg|png|JPG|JPEG|PNG)$'
        )

        if limit:
            queryset = queryset[:limit]
            self.stdout.write(f"处理限制为 {limit} 个 renditions")

        total = queryset.count()
        self.stdout.write(f"找到 {total} 个需要处理的 renditions")

        success_count = 0
        skip_count = 0
        fail_count = 0

        for i, rendition in enumerate(queryset, 1):
            self.stdout.write(f"\n处理 {i}/{total}: {rendition.file.name}")

            if dry_run:
                self.stdout.write(self.style.WARNING(f"  [演习] 将生成 WebP"))
                success_count += 1
                continue

            try:
                webp_path = generate_rendition_webp_copy(rendition)
                if webp_path:
                    self.stdout.write(self.style.SUCCESS(f"  ✓ 已生成: {webp_path}"))
                    success_count += 1
                else:
                    self.stdout.write(self.style.WARNING(f"  - 跳过（已存在或无需处理）"))
                    skip_count += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  ✗ 失败: {e}"))
                fail_count += 1

        self.stdout.write("\n" + "=" * 80)
        self.stdout.write(self.style.SUCCESS('批量处理完成'))
        self.stdout.write("=" * 80)
        self.stdout.write(f"总处理数: {total}")
        self.stdout.write(self.style.SUCCESS(f"成功生成: {success_count}"))
        self.stdout.write(self.style.WARNING(f"跳过: {skip_count}"))
        self.stdout.write(self.style.ERROR(f"失败: {fail_count}"))
        self.stdout.write("=" * 80)

