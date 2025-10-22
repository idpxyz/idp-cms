"""
Dry-run: 从导出的 TSV(title,unix_ts,region_slug) 试配新库文章，仅统计与示例，不写库。

用法：
  python manage.py dry_map_region_from_tsv --file=/app/tmp/region_articles_sample.tsv --limit=1000 --time-window=7200
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.news.models import ArticlePage
from apps.core.models import Category


@dataclass
class Row:
    title: str
    ts: int
    region_slug: str


class Command(BaseCommand):
    help = "Dry-run: map TSV(title,unix_ts,region_slug) to articles by title+time window, only statistics."

    def add_arguments(self, parser):
        parser.add_argument("--file", required=True, help="TSV path: title\tunix_ts\tregion_slug")
        parser.add_argument("--limit", type=int, default=None)
        parser.add_argument("--time-window", type=int, default=7200)

    def handle(self, *args, **options):
        tsv_path = Path(options["file"]).resolve()
        if not tsv_path.exists():
            raise CommandError(f"TSV not found: {tsv_path}")

        time_window = int(options["time_window"])  # seconds
        limit = options["limit"]

        rows: list[Row] = []
        with tsv_path.open("r", encoding="utf-8") as f:
            reader = csv.reader(f, delimiter="\t")
            for i, r in enumerate(reader):
                if not r or len(r) < 3:
                    continue
                try:
                    title = r[0].strip()
                    ts = int(r[1])
                    region_slug = r[2].strip()
                except Exception:
                    continue
                rows.append(Row(title=title, ts=ts, region_slug=region_slug))
                if limit and len(rows) >= limit:
                    break

        # 预取 region 分类
        slug_to_cat: dict[str, Category] = {c.slug: c for c in Category.objects.all()}

        matched = 0
        unmatched = 0
        samples: list[str] = []

        for row in rows:
            # 时间窗口
            center = datetime.fromtimestamp(row.ts, tz=timezone.utc)
            start = center - timedelta(seconds=time_window)
            end = center + timedelta(seconds=time_window)

            qs = (
                ArticlePage.objects.live()
                .filter(title=row.title, first_published_at__range=(start, end))
                .values("id", "title", "first_published_at")
            )
            if qs.exists():
                matched += 1
                if len(samples) < 10:
                    samples.append(f"HIT | {row.region_slug} | {row.title}")
            else:
                unmatched += 1
                if len(samples) < 10:
                    samples.append(f"MISS| {row.region_slug} | {row.title}")

        self.stdout.write(self.style.SUCCESS("Dry-run mapping result"))
        self.stdout.write(f"source_rows={len(rows)}")
        self.stdout.write(f"matched={matched}")
        self.stdout.write(f"unmatched={unmatched}")
        self.stdout.write("--- samples ---")
        for s in samples:
            self.stdout.write(s)


