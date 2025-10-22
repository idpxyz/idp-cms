#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import csv
import json
from pathlib import Path

LEGACY_TSV = Path("/opt/idp-cms/data/migration/legacy_categories.tsv")
OUTPUT_JSON = Path("/opt/idp-cms/data/migration/legacy_category_region_mapping.json")

# 新库已存在的地域分类 slug 对照
REGION_KEYWORDS = [
    ("神农架", "shennongjia"),
    ("黄冈", "huanggang"),
    ("黄石", "huangshi"),
    ("咸宁", "xianning"),
    ("孝感", "xiaogan"),
    ("鄂州", "ezhou"),
    ("荆门", "jingmen"),
    ("荆州", "jingzhou"),
    ("宜昌", "yichang"),
    ("襄阳", "xiangyang"),
    ("恩施", "enshi"),
    ("随州", "suizhou"),
    ("天门", "tianmen"),
    ("潜江", "qianjiang"),
    ("仙桃", "xiantao"),
    ("十堰", "shiyan"),
    ("武汉", "wuhan"),
    ("湖北", "hubei"),
    ("全国", "national"),
]

# 归入“湖北”的常见区域栏目名
FALLBACK_HUBEI = ["荆楚各地", "观楚台", "中部之声"]


def suggest_region_slug(name: str) -> tuple[str | None, str]:
    n = (name or "").strip()
    if not n:
        return None, "empty-name"

    # 直接关键词命中（城市/区域）
    for kw, slug in REGION_KEYWORDS:
        if kw in n:
            return slug, f"kw:{kw}"

    # 常见栏目名归入湖北
    for kw in FALLBACK_HUBEI:
        if kw in n:
            return "hubei", f"fallback-hubei:{kw}"

    # 站点/栏目的常见后缀与地域词结合时，尝试截取地域词
    # 示例：十堰网站/十堰文化/十堰网视/十堰风情/美在十堰
    for kw, slug in REGION_KEYWORDS:
        for suffix in ["网站", "文化", "网视", "风情", "幻灯片", "市", "风采", "人物", "新闻", "频道"]:
            if kw + suffix in n or ("美在" + kw) in n or (kw in n and suffix in n):
                return slug, f"compound:{kw}+{suffix}"

    return None, "unmapped"


def main():
    rows = []
    with LEGACY_TSV.open("r", encoding="utf-8") as f:
        reader = csv.reader(f, delimiter="\t")
        for rid, row in enumerate(reader):
            if not row:
                continue
            try:
                old_id = int(row[0])
                old_name = row[1]
                pid = int(row[2]) if len(row) > 2 and row[2] != "" else 0
            except Exception:
                # 跳过异常行
                continue
            slug, reason = suggest_region_slug(old_name)
            rows.append({
                "old_id": old_id,
                "old_name": old_name,
                "pid": pid,
                "suggested_region_slug": slug,
                "reason": reason,
            })

    # 输出整体统计
    total = len(rows)
    mapped = sum(1 for r in rows if r["suggested_region_slug"])
    print(f"total={total}, mapped={mapped}, unmapped={total-mapped}")

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_JSON.open("w", encoding="utf-8") as f:
        json.dump({
            "summary": {"total": total, "mapped": mapped, "unmapped": total - mapped},
            "mapping": rows,
        }, f, ensure_ascii=False, indent=2)

    print(f"written: {OUTPUT_JSON}")


if __name__ == "__main__":
    main()


