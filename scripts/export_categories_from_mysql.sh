#!/bin/bash
#
# 从旧MySQL数据库导出分类数据
#

# 配置
MYSQL_HOST="121.41.73.49"
MYSQL_USER="jrhb"
MYSQL_PASS="6VSPmPbuFGnZO1%C"
MYSQL_DB="jrhb"
OUTPUT_DIR="data/migration/exports"

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

echo "=========================================="
echo "从MySQL导出分类数据"
echo "=========================================="
echo "服务器: $MYSQL_HOST"
echo "数据库: $MYSQL_DB"
echo ""

# 导出分类数据
echo "[1/1] 导出分类表 (category)..."
ssh root@$MYSQL_HOST "docker exec  \$(docker ps | grep mysql | awk '{print \$1}') mysql -u$MYSQL_USER -p'$MYSQL_PASS' $MYSQL_DB --default-character-set=utf8mb4 -e \"
SELECT 
  id,
  name,
  pid,
  ordid
FROM category
ORDER BY id;
\" --skip-column-names" | awk -F'\t' '
BEGIN {
  print "["
  first = 1
}
{
  if (!first) print ","
  first = 0
  printf "  {\"id\": %d, \"name\": \"%s\", \"pid\": %s, \"ordid\": %d}",
    $1, $2, ($3 == "NULL" || $3 == "" ? "null" : $3), $4
}
END {
  print ""
  print "]"
}
' > "$OUTPUT_DIR/categories.json"

if [ $? -eq 0 ]; then
    echo "✅ 分类数据导出成功"
    echo "文件: $OUTPUT_DIR/categories.json"
    echo ""
    
    # 统计
    COUNT=$(grep -o '"id":' "$OUTPUT_DIR/categories.json" | wc -l)
    SIZE=$(du -h "$OUTPUT_DIR/categories.json" | cut -f1)
    
    echo "统计信息:"
    echo "  分类数量: $COUNT"
    echo "  文件大小: $SIZE"
else
    echo "❌ 导出失败"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ 导出完成!"
echo "=========================================="
echo ""
echo "下一步:"
echo "  python scripts/generate_mapping_complete.py"

