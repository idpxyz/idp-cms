#!/bin/bash
#
# 从远程MySQL服务器导出文章数据
#
# 使用方法:
#   ./scripts/export_articles_from_mysql.sh
#   ./scripts/export_articles_from_mysql.sh --limit 100  # 只导出100条用于测试

set -e

# 配置
REMOTE_HOST="121.41.73.49"
REMOTE_USER="root"
MYSQL_USER="jrhb"
MYSQL_PASS="6VSPmPbuFGnZO1%C"
MYSQL_DB="jrhb"
CONTAINER_NAME="mysql"

# 导出目录
EXPORT_DIR="data/migration/exports"
mkdir -p "$EXPORT_DIR"

# 时间戳
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 解析参数
LIMIT=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --limit)
            LIMIT="LIMIT $2"
            shift 2
            ;;
        *)
            echo "未知参数: $1"
            exit 1
            ;;
    esac
done

echo "========================================="
echo "从远程MySQL导出文章数据"
echo "========================================="
echo "服务器: $REMOTE_HOST"
echo "数据库: $MYSQL_DB"
echo "导出目录: $EXPORT_DIR"
if [ -n "$LIMIT" ]; then
    echo "限制条数: $LIMIT"
fi
echo "========================================="

# 1. 导出文章基本信息和详细内容（JOIN）
echo ""
echo "[1/4] 正在导出文章数据（含内容）..."
ssh $REMOTE_USER@$REMOTE_HOST "docker exec $CONTAINER_NAME mysql -u $MYSQL_USER -p'$MYSQL_PASS' $MYSQL_DB -e \"
SELECT 
    a.id,
    a.title,
    a.seo_title,
    a.seo_keys,
    a.seo_desc,
    a.cate_id,
    a.author,
    a.status,
    a.type,
    a.url,
    a.video,
    a.img,
    a.hits,
    a.likes,
    a.dislikes,
    a.is_recommend,
    a.is_top,
    a.is_bold,
    a.color,
    a.tags,
    a.fromlink,
    a.fromurl,
    a.add_time,
    a.last_time,
    a.ordid,
    a.tpl,
    ai.info as content
FROM article a
LEFT JOIN article_info ai ON a.id = ai.article_id
WHERE a.status = 1
ORDER BY a.id DESC
$LIMIT
\" --batch --raw" > "$EXPORT_DIR/articles_raw_$TIMESTAMP.tsv"

echo "✓ 导出完成: articles_raw_$TIMESTAMP.tsv"

# 2. 转换TSV为JSON
echo ""
echo "[2/4] 正在转换为JSON格式..."
python3 << 'PYTHON_SCRIPT' > "$EXPORT_DIR/articles_$TIMESTAMP.json"
import sys
import csv
import json
from pathlib import Path

# 读取TSV文件
tsv_file = list(Path("$EXPORT_DIR").glob("articles_raw_*.tsv"))[-1]

with open(tsv_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f, delimiter='\t')
    articles = []
    
    for row in reader:
        # 处理None值和类型转换
        article = {}
        for key, value in row.items():
            if value == 'NULL' or value == '\\N':
                article[key] = None
            else:
                article[key] = value
        articles.append(article)

# 输出JSON
print(json.dumps(articles, ensure_ascii=False, indent=2))

PYTHON_SCRIPT

echo "✓ 转换完成: articles_$TIMESTAMP.json"

# 3. 导出分类数据
echo ""
echo "[3/4] 正在导出分类数据..."
ssh $REMOTE_USER@$REMOTE_HOST "docker exec $CONTAINER_NAME mysql -u $MYSQL_USER -p'$MYSQL_PASS' $MYSQL_DB -e \"
SELECT 
    id,
    name,
    pid as parent_id,
    ordid as order_num,
    url
FROM category
ORDER BY ordid, id
\" --batch --raw" | python3 -c "
import sys
import csv
import json

reader = csv.DictReader(sys.stdin, delimiter='\t')
categories = [dict(row) for row in reader]
print(json.dumps(categories, ensure_ascii=False, indent=2))
" > "$EXPORT_DIR/categories_$TIMESTAMP.json"

echo "✓ 导出完成: categories_$TIMESTAMP.json"

# 4. 导出标签数据（如果有tags表）
echo ""
echo "[4/4] 正在导出标签数据..."
ssh $REMOTE_USER@$REMOTE_HOST "docker exec $CONTAINER_NAME mysql -u $MYSQL_USER -p'$MYSQL_PASS' $MYSQL_DB -e \"
SELECT DISTINCT tags FROM article WHERE tags IS NOT NULL AND tags != ''
\" --batch --raw" | tail -n +2 | python3 -c "
import sys
import json

all_tags = set()
for line in sys.stdin:
    tags = line.strip()
    if tags:
        # 分割标签
        for tag in tags.replace('，', ',').split(','):
            tag = tag.strip()
            if tag:
                all_tags.add(tag)

tags_list = sorted(list(all_tags))
print(json.dumps(tags_list, ensure_ascii=False, indent=2))
" > "$EXPORT_DIR/tags_$TIMESTAMP.json"

echo "✓ 导出完成: tags_$TIMESTAMP.json"

# 5. 创建最新链接
echo ""
echo "创建软链接..."
ln -sf "articles_$TIMESTAMP.json" "$EXPORT_DIR/articles.json"
ln -sf "categories_$TIMESTAMP.json" "$EXPORT_DIR/categories.json"
ln -sf "tags_$TIMESTAMP.json" "$EXPORT_DIR/tags.json"

# 6. 统计信息
echo ""
echo "========================================="
echo "导出完成！"
echo "========================================="
echo "文件列表:"
ls -lh "$EXPORT_DIR"/articles_$TIMESTAMP.json
ls -lh "$EXPORT_DIR"/categories_$TIMESTAMP.json
ls -lh "$EXPORT_DIR"/tags_$TIMESTAMP.json

# 统计记录数
ARTICLE_COUNT=$(python3 -c "import json; print(len(json.load(open('$EXPORT_DIR/articles_$TIMESTAMP.json'))))")
CATEGORY_COUNT=$(python3 -c "import json; print(len(json.load(open('$EXPORT_DIR/categories_$TIMESTAMP.json'))))")
TAG_COUNT=$(python3 -c "import json; print(len(json.load(open('$EXPORT_DIR/tags_$TIMESTAMP.json'))))")

echo ""
echo "统计信息:"
echo "  文章数: $ARTICLE_COUNT"
echo "  分类数: $CATEGORY_COUNT"
echo "  标签数: $TAG_COUNT"
echo ""
echo "下一步："
echo "  python manage.py import_old_articles --test --limit=10"
echo "========================================="

