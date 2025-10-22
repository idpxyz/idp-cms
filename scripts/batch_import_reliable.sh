#!/bin/bash
#
# 可靠的批量导入方案（无需pymysql）
# 直接在旧MySQL服务器上导出JSON，然后传输并导入
#

set -e

OLD_HOST="root@121.41.73.49"
NEW_HOST="root@8.133.22.7"
BATCH_SIZE=100   # 每批文章数（快速看到结果）
TOTAL=166358     # 总文章数

echo "==============================================="
echo "📦 批量导入全部 ${TOTAL} 篇文章"
echo "==============================================="
echo ""

# 计算批次
BATCHES=$(( ($TOTAL + $BATCH_SIZE - 1) / $BATCH_SIZE ))
echo "✓ 分 ${BATCHES} 批处理（每批 ${BATCH_SIZE} 篇）"
echo ""

for ((i=0; i<$BATCHES; i++)); do
    OFFSET=$(( $i * $BATCH_SIZE ))
    BATCH=$(( $i + 1 ))
    
    echo "======== 批次 ${BATCH}/${BATCHES} (偏移: ${OFFSET}) ========"
    
    # 步骤1：在旧MySQL容器中导出JSON
    echo "[1/4] 导出JSON..."
    ssh ${OLD_HOST} "docker exec \$(docker ps | grep mysql | awk '{print \$1}') mysql -ujrhb -p'6VSPmPbuFGnZO1%C' jrhb --default-character-set=utf8mb4 -e \"
        SELECT JSON_OBJECT(
            'id', a.id,
            'title', a.title,
            'cate_id', a.cate_id,
            'img', a.img,
            'add_time', a.add_time,
            'last_time', a.last_time,
            'author', a.author,
            'tags', a.tags,
            'status', a.status,
            'fromurl', a.fromurl,
            'seo_title', a.seo_title,
            'seo_desc', a.seo_desc,
            'seo_keys', a.seo_keys,
            'info', i.info
        ) as article
        FROM article a
        LEFT JOIN article_info i ON a.id = i.article_id
        WHERE a.status = 1
        ORDER BY a.add_time DESC
        LIMIT ${BATCH_SIZE} OFFSET ${OFFSET};
    \" --skip-column-names --raw" | \
    python3 -c "
import sys, json
articles = []
for line in sys.stdin:
    line = line.strip()
    if line:
        articles.append(json.loads(line))
print(json.dumps(articles, ensure_ascii=False, indent=2))
" > /tmp/batch_${BATCH}.json
    
    echo "[2/4] 上传到新服务器..."
    scp /tmp/batch_${BATCH}.json ${NEW_HOST}:/opt/idp-cms/data/migration/exports/
    
    echo "[3/4] 导入..."
    ssh ${NEW_HOST} "cd /opt/idp-cms && docker compose -f infra/production/docker-compose-ha-node1.yml exec authoring python manage.py import_old_articles --file=data/migration/exports/batch_${BATCH}.json --batch-size=500 --skip-inline-images"
    
    echo "[4/4] 清理..."
    rm -f /tmp/batch_${BATCH}.json
    ssh ${NEW_HOST} "rm -f /opt/idp-cms/data/migration/exports/batch_${BATCH}.json"
    
    echo "✅ 批次 ${BATCH}/${BATCHES} 完成"
    echo ""
done

echo "==============================================="
echo "✅ 全部导入完成！"
echo "==============================================="

