#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import csv
import json
from pathlib import Path

LEGACY_TSV = Path("/opt/idp-cms/data/migration/legacy_categories.tsv")
INPUT_JSON = Path("/opt/idp-cms/data/migration/legacy_category_region_mapping.json")
OUTPUT_JSON = Path("/opt/idp-cms/data/migration/legacy_category_region_mapping.filled.json")

HUBEI_HINTS = ["湖北", "荆楚", "观楚台", "荆楚各地", "中部之声"]


def load_legacy():
    data = {}
    with LEGACY_TSV.open("r", encoding="utf-8") as f:
        reader = csv.reader(f, delimiter="\t")
        for row in reader:
            if not row:
                continue
            try:
                cid = int(row[0])
                name = row[1]
                pid = int(row[2]) if len(row) > 2 and row[2] != "" else 0
                data[cid] = {"id": cid, "name": name, "pid": pid}
            except Exception:
                continue
    return data


def main():
    legacy = load_legacy()
    m = json.loads(INPUT_JSON.read_text(encoding="utf-8"))
    rows = m.get("mapping", [])

    # 构建父->子列表方便继承传播
    children = {}
    for cid, item in legacy.items():
        children.setdefault(item["pid"], []).append(cid)

    # 先构建已映射集合
    suggested = {r["old_id"]: r["suggested_region_slug"] for r in rows if r.get("suggested_region_slug")}

    updated = 0

    # 规则1：父有映射，子继承
    for r in rows:
        if r.get("suggested_region_slug"):
            continue
        pid = legacy.get(r["old_id"], {}).get("pid", 0)
        if pid and pid in suggested and suggested[pid]:
            r["suggested_region_slug"] = suggested[pid]
            r["reason"] = f"inherit-parent:{pid}"
            suggested[r["old_id"]] = r["suggested_region_slug"]
            updated += 1

    # 规则2：湖北关键词兜底
    for r in rows:
        if r.get("suggested_region_slug"):
            continue
        name = (r.get("old_name") or "").strip()
        if any(h in name for h in HUBEI_HINTS):
            r["suggested_region_slug"] = "hubei"
            r["reason"] = "fallback-hubei:hint"
            updated += 1

    total = len(rows)
    mapped = sum(1 for r in rows if r.get("suggested_region_slug"))
    out = {"summary": {"total": total, "mapped": mapped}, "mapping": rows}
    OUTPUT_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"filled mapped={mapped}/{total} (+{updated} by rules)")
    print(f"written: {OUTPUT_JSON}")


if __name__ == "__main__":
    main()


