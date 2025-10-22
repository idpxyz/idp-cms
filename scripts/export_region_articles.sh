#!/bin/sh
set -euo pipefail

REGION_IDS_FILE="/root/region_cate_ids.txt"
OUT="/root/region_articles_sample.tsv"

CID=$(docker ps --format '{{.ID}} {{.Names}}' | awk '$2=="mysql"{print $1; exit}')
if [ -z "${CID:-}" ]; then
  echo "no mysql container named mysql" >&2
  exit 1
fi

> "$OUT"
while IFS=$(printf '\t') read -r LEGACY_ID SLUG; do
  [ -n "${LEGACY_ID:-}" ] || continue
  SQL="SELECT a.title, UNIX_TIMESTAMP(a.add_time) AS ts, '"$SLUG"' AS slug \
FROM article a WHERE a.status=1 AND a.cate_id="${LEGACY_ID}" \
ORDER BY a.add_time DESC LIMIT 100;"
  printf "%s\n" "$SQL" | docker exec -i "$CID" \
    mysql -ujrhb -p'6VSPmPbuFGnZO1%C' jrhb \
    --default-character-set=utf8mb4 --skip-column-names \
    >> "$OUT"
done < "$REGION_IDS_FILE"

wc -l "$OUT"
head -n 5 "$OUT" || true
tail -n 5 "$OUT" || true


