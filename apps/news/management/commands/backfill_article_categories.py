"""
批量回填文章分类：
按“频道 → 分类”规则，将没有分类的文章挂到与其频道同名（slug 相同）的分类；
若分类不存在则自动创建。

使用：
  python manage.py backfill_article_categories --dry-run
  python manage.py backfill_article_categories --limit 500
  python manage.py backfill_article_categories --channel society
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from apps.news.models import ArticlePage
from apps.core.models import Category, Channel


class Command(BaseCommand):
    help = "为没有分类的文章按频道规则批量回填分类（若无分类则创建）。"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="试运行，不写入数据库",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="最大处理文章数量",
        )
        parser.add_argument(
            "--channel",
            type=str,
            default=None,
            help="仅处理指定频道 slug 的文章",
        )

    def handle(self, *args, **options):
        dry_run: bool = options["dry_run"]
        limit: int | None = options["limit"]
        channel_slug: str | None = options["channel"]

        self.stdout.write(self.style.SUCCESS("开始回填文章分类（频道 → 分类）"))
        if dry_run:
            self.stdout.write(self.style.WARNING("模式：试运行（不写库）"))

        # 仅处理没有任何分类的文章
        qs = ArticlePage.objects.live().filter(categories__isnull=True)
        if channel_slug:
            try:
                channel = Channel.objects.get(slug=channel_slug)
                qs = qs.filter(channel=channel)
                self.stdout.write(f"限定频道：{channel_slug}")
            except Channel.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"频道不存在：{channel_slug}"))
                return

        qs = qs.select_related("channel").distinct()
        total = qs.count()
        if limit:
            qs = qs[:limit]
        self.stdout.write(f"待处理文章：{qs.count()}（总计：{total}）")

        updated = 0
        skipped = 0

        # 缓存已创建/已存在的分类
        slug_to_category: dict[str, Category] = {}

        for art in qs.iterator():
            if not art.channel:
                skipped += 1
                continue

            base_slug = art.channel.slug or slugify(art.channel.name or "general")
            if not base_slug:
                base_slug = "general"

            # 获取或创建分类：名称优先用频道名，slug 用频道 slug
            cat = slug_to_category.get(base_slug)
            if not cat:
                cat, _ = Category.objects.get_or_create(
                    slug=base_slug,
                    defaults={
                        "name": art.channel.name or base_slug,
                    },
                )
                slug_to_category[base_slug] = cat

            if dry_run:
                updated += 1
                continue

            with transaction.atomic():
                # set 会覆盖；为安全起见改用 add（单分类策略亦可 set([cat])）
                art.categories.add(cat)
                updated += 1

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"回填完成：更新 {updated} 篇，跳过 {skipped} 篇"))
        if dry_run:
            self.stdout.write(self.style.WARNING("提示：移除 --dry-run 后实际写入数据库"))


