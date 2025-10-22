#!/bin/bash
#
# 快速批量导入（100篇/批）
# 使用TSV导出（快速）+ Python转JSON
#

set -e

OLD_HOST="root@121.41.73.49"
NEW_HOST="root@8.133.22.7"
BATCH_SIZE=100   # 每批100篇，快速看到结果
TOTAL=166358

echo "==============================================="
echo "🚀 快速批量导入（${BATCH_SIZE}篇/批）"
echo "==============================================="
echo ""

BATCHES=$(( ($TOTAL + $BATCH_SIZE - 1) / $BATCH_SIZE ))
echo "✓ 总批次: ${BATCHES}"
echo ""

for ((i=0; i<$BATCHES; i++)); do
    OFFSET=$(( $i * $BATCH_SIZE ))
    BATCH=$(( $i + 1 ))
    
    echo "======== 批次 ${BATCH}/${BATCHES} ========" | tee -a data/migration/logs/fast_import_progress.txt
    
    # 1. 快速导出TSV
    ssh ${OLD_HOST} "docker exec \$(docker ps | grep mysql | awk '{print \$1}') mysql -ujrhb -p'6VSPmPbuFGnZO1%C' jrhb --default-character-set=utf8mb4 --skip-column-names -e \"
SELECT 
  a.id, a.title, a.cate_id, a.img, a.add_time, a.last_time,
  a.author, a.tags, a.status, a.fromurl, a.seo_title, a.seo_desc, a.seo_keys, i.info
FROM article a
LEFT JOIN article_info i ON a.id = i.article_id
WHERE a.status = 1
ORDER BY a.add_time DESC
LIMIT ${BATCH_SIZE} OFFSET ${OFFSET};
\"" > /tmp/batch_${BATCH}.tsv 2>/dev/null
    
    # 2. 本地转JSON
    python3 scripts/tsv_to_json.py /tmp/batch_${BATCH}.tsv /tmp/batch_${BATCH}.json > /dev/null 2>&1
    
    # 3. 上传
    scp -q /tmp/batch_${BATCH}.json ${NEW_HOST}:/opt/idp-cms/data/migration/exports/ 2>/dev/null
    
    # 4. 导入
    ssh ${NEW_HOST} "cd /opt/idp-cms && docker compose -f infra/production/docker-compose-ha-node1.yml exec authoring python manage.py import_old_articles --file=data/migration/exports/batch_${BATCH}.json --batch-size=100 --skip-inline-images 2>&1 | tail -3"
    
    # 5. 清理
    rm -f /tmp/batch_${BATCH}.{tsv,json}
    ssh ${NEW_HOST} "rm -f /opt/idp-cms/data/migration/exports/batch_${BATCH}.json" 2>/dev/null
    
    # 显示进度
    IMPORTED=$(( $i * $BATCH_SIZE ))
    PROGRESS=$(( ($IMPORTED * 100) / $TOTAL ))
    echo "✅ 批次 ${BATCH}/${BATCHES} 完成 | 已导入: ${IMPORTED}/${TOTAL} (${PROGRESS}%)" | tee -a data/migration/logs/fast_import_progress.txt
    echo ""
done

echo "==============================================="
echo "✅ 全部完成！"
echo "==============================================="

