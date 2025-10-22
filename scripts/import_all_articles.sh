#!/bin/bash
#
# 自动化分批导入所有文章
#

set -e

BATCH_SIZE=10000
OLD_HOST="root@121.41.73.49"
NEW_HOST="root@8.133.22.7"

echo "==============================================="
echo "📊 开始分批导入全部文章"
echo "==============================================="
echo ""

# 获取总数
echo "查询文章总数..."
TOTAL=$(ssh ${OLD_HOST} "docker exec \$(docker ps | grep mysql | awk '{print \$1}') mysql -ujrhb -p'6VSPmPbuFGnZO1%C' jrhb -sN -e 'SELECT COUNT(*) FROM article WHERE status = 1;'")
echo "✓ 总文章数: ${TOTAL}"

# 计算批次
BATCHES=$(( ($TOTAL + $BATCH_SIZE - 1) / $BATCH_SIZE ))
echo "✓ 分 ${BATCHES} 批处理"
echo ""

# 循环处理每批
for ((i=0; i<$BATCHES; i++)); do
    OFFSET=$(( $i * $BATCH_SIZE ))
    BATCH=$(( $i + 1 ))
    
    echo "======== 批次 ${BATCH}/${BATCHES} ========"
    
    # 1. 导出TSV
    echo "[1/4] 导出批次 ${BATCH}..."
    ssh ${OLD_HOST} "docker exec \$(docker ps | grep mysql | awk '{print \$1}') mysql -ujrhb -p'6VSPmPbuFGnZO1%C' jrhb --default-character-set=utf8mb4 --skip-column-names -e \"
SELECT 
  a.id, a.title, a.cate_id, a.img, a.add_time, a.last_time,
  a.author, a.tags, a.status, a.fromurl, a.seo_title, a.seo_desc, a.seo_keys, i.info
FROM article a
LEFT JOIN article_info i ON a.id = i.article_id
WHERE a.status = 1
ORDER BY a.add_time DESC
LIMIT ${BATCH_SIZE} OFFSET ${OFFSET};
\"" > data/migration/exports/batch_${BATCH}.tsv
    
    # 2. 转换JSON
    echo "[2/4] 转换JSON..."
    python3 scripts/tsv_to_json.py data/migration/exports/batch_${BATCH}.tsv data/migration/exports/batch_${BATCH}.json
    
    # 3. 上传
    echo "[3/4] 上传到远程服务器..."
    scp data/migration/exports/batch_${BATCH}.json ${NEW_HOST}:/opt/idp-cms/data/migration/exports/
    
    # 4. 导入
    echo "[4/4] 导入到新系统..."
    ssh ${NEW_HOST} "cd /opt/idp-cms && docker compose -f infra/production/docker-compose-ha-node1.yml exec authoring python manage.py import_old_articles --file=data/migration/exports/batch_${BATCH}.json --batch-size=500 --skip-inline-images"
    
    # 清理
    rm -f data/migration/exports/batch_${BATCH}.{tsv,json}
    ssh ${NEW_HOST} "rm -f /opt/idp-cms/data/migration/exports/batch_${BATCH}.json"
    
    echo "✅ 批次 ${BATCH}/${BATCHES} 完成"
    echo ""
done

echo "==============================================="
echo "✅ 全部导入完成！"
echo "==============================================="

