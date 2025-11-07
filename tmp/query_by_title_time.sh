#!/bin/sh
set -e

TITLE="$1"
TS="$2"
WINDOW="${3:-7200}"
MODE="${4:-like}"  # like|eq

# 找到旧库 MySQL 容器
# 旧机镜像字段可能是哈希，这里用容器名匹配
CID=$(docker ps --format '{{.ID}} {{.Names}}' | awk '$2=="mysql"{print $1; exit}')
if [ -z "$CID" ]; then
  echo "no mysql container" >&2
  exit 1
fi

# 时间窗口 ±WINDOW 秒（默认2小时）
LOW=$((TS-WINDOW))
HIGH=$((TS+WINDOW))

# SQL 字符串中转义单引号
ESC=$(printf %s "$TITLE" | sed "s/'/''/g")
if [ "$MODE" = "like" ]; then
  COND="a.title LIKE '%${ESC}%'"
else
  COND="a.title='${ESC}'"
fi

SQL="SELECT a.title, a.cate_id, c.name, DATE_FORMAT(a.add_time,'%Y-%m-%d %H:%i:%s') \
FROM article a LEFT JOIN category c ON c.id=a.cate_id \
WHERE a.status=1 AND ${COND} \
AND a.add_time BETWEEN FROM_UNIXTIME(${LOW}) AND FROM_UNIXTIME(${HIGH}) \
ORDER BY ABS(UNIX_TIMESTAMP(a.add_time)-${TS}) LIMIT 3;"

echo "$SQL" | docker exec -i "$CID" \
  mysql -ujrhb -p'6VSPmPbuFGnZO1%C' jrhb \
  --default-character-set=utf8mb4 --skip-column-names


