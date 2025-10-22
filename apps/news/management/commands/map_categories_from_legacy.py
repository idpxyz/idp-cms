"""
根据源数据（旧库）按“标题 + 发布时间”查回 cate_id，并将文章挂到已构建的 Category。

实现要点：
- 通过 SSH 到旧主机（默认 121.41.73.49），在旧 MySQL 容器内执行 SQL
- 用标题精确匹配 + 发布时间 ± 窗口（默认 300 秒）锁定 cate_id
- 将 cate_id 映射到本地 Category（按同名/同 slug），找不到则可选自动创建

使用示例：
  python manage.py map_categories_from_legacy --dry-run --limit 50
  python manage.py map_categories_from_legacy --channel society --limit 500
  python manage.py map_categories_from_legacy --time-window 600 --auto-create
"""

from __future__ import annotations

import json
import shlex
import subprocess
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from apps.news.models import ArticlePage
from apps.core.models import Category, Channel


@dataclass
class LegacyDBConfig:
    ssh_user: str = "root"
    ssh_host: str = "121.41.73.49"
    mysql_user: str = "jrhb"
    mysql_pass: str = "6VSPmPbuFGnZO1%C"
    mysql_db: str = "jrhb"


def escape_mysql_string(value: str) -> str:
    if value is None:
        return ""
    # 简单转义，避免打断 SQL
    return (
        value.replace("\\", "\\\\")
        .replace("'", "\\'")
        .replace('"', '\\"')
    )


class Command(BaseCommand):
    help = "从旧库回溯 cate_id 并将文章挂到本地 Category（标题+发布时间匹配）。"

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="试运行，不写库")
        parser.add_argument("--limit", type=int, default=None, help="最多处理的文章数量")
        parser.add_argument("--channel", type=str, default=None, help="仅处理指定频道 slug 的文章")
        parser.add_argument("--time-window", type=int, default=300, help="发布时间匹配窗口（秒）")
        parser.add_argument("--auto-create", action="store_true", help="找不到同名 Category 时自动创建")

    def handle(self, *args, **options):
        self.dry_run: bool = options["dry_run"]
        self.limit: int | None = options["limit"]
        self.channel_slug: str | None = options["channel"]
        self.time_window_s: int = options["time_window"]
        self.auto_create: bool = options["auto_create"]

        self.legacy = LegacyDBConfig()

        self.stdout.write(self.style.SUCCESS("开始回填分类（源数据 cate_id → 本地 Category）"))
        if self.dry_run:
            self.stdout.write(self.style.WARNING("模式：试运行（不写库）"))

        # 选择待处理文章：尚未挂分类
        qs = ArticlePage.objects.live().filter(categories__isnull=True).select_related("channel").distinct()
        if self.channel_slug:
            try:
                channel = Channel.objects.get(slug=self.channel_slug)
                qs = qs.filter(channel=channel)
                self.stdout.write(f"限定频道：{self.channel_slug}")
            except Channel.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"频道不存在：{self.channel_slug}"))
                return

        total = qs.count()
        if self.limit:
            qs = qs[: self.limit]
        self.stdout.write(f"待处理文章：{qs.count()}（总计：{total}）")

        mapped = 0
        not_found_legacy = 0
        created_categories = 0
        skipped_no_time = 0

        # 缓存已存在分类：按 slug 与 name 双键
        slug_to_category: dict[str, Category] = {c.slug: c for c in Category.objects.all()}
        name_to_category: dict[str, Category] = {c.name: c for c in Category.objects.all()}

        for art in qs.iterator():
            if not art.first_published_at:
                skipped_no_time += 1
                continue

            title = (art.title or "").strip()
            if not title:
                not_found_legacy += 1
                continue

            ts = int(art.first_published_at.replace(tzinfo=timezone.utc).timestamp())
            cate = self.lookup_legacy_cate_id_by_title_time(title, ts, self.time_window_s)
            if not cate:
                not_found_legacy += 1
                continue

            cate_id = cate.get("cate_id")
            cate_name = cate.get("cate_name") or cate.get("name") or ""
            if not cate_id:
                not_found_legacy += 1
                continue

            # 将旧分类名映射到本地 Category
            target_cat = self.resolve_local_category(cate_name, slug_to_category, name_to_category)
            if not target_cat and self.auto_create:
                target_cat = self.create_local_category(cate_name)
                if target_cat:
                    slug_to_category[target_cat.slug] = target_cat
                    name_to_category[target_cat.name] = target_cat
                    created_categories += 1

            if not target_cat:
                not_found_legacy += 1
                continue

            if self.dry_run:
                mapped += 1
                continue

            with transaction.atomic():
                art.categories.add(target_cat)
                mapped += 1

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"完成：挂载 {mapped} 篇"))
        self.stdout.write(f"未匹配到旧分类/时间：{not_found_legacy}")
        self.stdout.write(f"缺少发布时间跳过：{skipped_no_time}")
        if self.auto_create:
            self.stdout.write(f"新建分类：{created_categories}")

    # ---- 辅助方法 ----
    def lookup_legacy_cate_id_by_title_time(self, title: str, unix_ts: int, window_s: int) -> dict | None:
        title_escaped = escape_mysql_string(title)
        sql = (
            "SELECT a.id, a.cate_id, c.name AS cate_name "
            "FROM article a LEFT JOIN category c ON c.id=a.cate_id "
            f"WHERE a.status=1 AND a.title='{title_escaped}' "
            f"AND a.add_time BETWEEN FROM_UNIXTIME({unix_ts - window_s}) AND FROM_UNIXTIME({unix_ts + window_s}) "
            "ORDER BY ABS(UNIX_TIMESTAMP(a.add_time) - {ts}) LIMIT 1;"
        ).format(ts=unix_ts)

        out = self.exec_legacy_mysql(sql)
        # 期望返回：id\tcate_id\tcate_name
        line = out.strip().splitlines()
        if not line:
            return None
        parts = line[0].split("\t")
        if len(parts) < 2:
            return None
        return {
            "id": parts[0],
            "cate_id": parts[1],
            "cate_name": parts[2] if len(parts) > 2 else "",
        }

    def exec_legacy_mysql(self, sql: str) -> str:
        # 构造通过 SSH 进入旧主机、再进入旧 MySQL 容器执行 SQL 的命令
        # 参考现有 batch_import_fast.sh 的做法
        # 注意：awk 的花括号需要双层括号以避免 Python 格式化误判
        escaped_sql = sql.replace('"', '\\"')
        mysql_cmd = (
            "docker exec $(docker ps | grep mysql | awk '{{print $1}}') "
            f"mysql -u{self.legacy.mysql_user} -p'{self.legacy.mysql_pass}' {self.legacy.mysql_db} "
            f"--default-character-set=utf8mb4 --skip-column-names -e \"{escaped_sql}\""
        )

        cmd = f"ssh {self.legacy.ssh_user}@{self.legacy.ssh_host} {shlex.quote(mysql_cmd)}"
        result = subprocess.run(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if result.returncode != 0:
            # 打印一行简短错误，继续流程
            self.stdout.write(self.style.WARNING(f"旧库查询失败: {result.stderr.strip()}"))
            return ""
        return result.stdout or ""

    def resolve_local_category(
        self,
        legacy_name: str,
        slug_to_category: dict[str, Category],
        name_to_category: dict[str, Category],
    ) -> Category | None:
        name = (legacy_name or "").strip()
        if not name:
            return None
        slug = slugify(name)
        if slug in slug_to_category:
            return slug_to_category[slug]
        if name in name_to_category:
            return name_to_category[name]
        return None

    def create_local_category(self, name: str) -> Category | None:
        n = (name or "").strip()
        if not n:
            return None
        slug = slugify(n) or "category"
        cat, _ = Category.objects.get_or_create(slug=slug, defaults={"name": n})
        return cat


