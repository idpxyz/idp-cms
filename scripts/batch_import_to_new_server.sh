#!/bin/bash
#
# 批量导入文章到新服务器 8.133.22.7
# 100篇/批，从老数据库 121.41.73.49 导入到新服务器
#

set -e

# 配置
OLD_HOST="root@121.41.73.49"
NEW_HOST="root@8.133.22.7"
MYSQL_USER="jrhb"
MYSQL_PASS="6VSPmPbuFGnZO1%C"
MYSQL_DB="jrhb"
BATCH_SIZE=100   # 每批100篇文章
TOTAL=166358     # 总文章数
START_BATCH=1    # 从第几批开始（用于断点续传）

# 计算总批次
BATCHES=$(( ($TOTAL + $BATCH_SIZE - 1) / $BATCH_SIZE ))

echo "==============================================="
echo "📦 批量导入到新服务器 8.133.22.7"
echo "==============================================="
echo ""
echo "总文章数: ${TOTAL}"
echo "批次大小: ${BATCH_SIZE}"
echo "总批次数: ${BATCHES}"
echo "开始批次: ${START_BATCH}"
echo ""
echo "按 Ctrl+C 取消，任意键继续..."
read -n 1 -s

# 创建日志文件
LOG_FILE="data/migration/logs/import_to_new_$(date +%Y%m%d_%H%M%S).log"
echo "日志文件: ${LOG_FILE}"

for ((i=$START_BATCH-1; i<$BATCHES; i++)); do
    OFFSET=$(( $i * $BATCH_SIZE ))
    BATCH=$(( $i + 1 ))
    
    echo "" | tee -a "${LOG_FILE}"
    echo "======== 批次 ${BATCH}/${BATCHES} (偏移: ${OFFSET}) ========" | tee -a "${LOG_FILE}"
    
    # 1. 导出TSV
    echo "[1/4] 从老数据库导出..." | tee -a "${LOG_FILE}"
    ssh ${OLD_HOST} "docker exec \$(docker ps | grep mysql | awk '{print \$1}') mysql -u${MYSQL_USER} -p'${MYSQL_PASS}' ${MYSQL_DB} --default-character-set=utf8mb4 -N -r -e \"
SELECT 
  a.id, a.title, a.cate_id, a.img, a.add_time, a.last_time,
  a.author, a.tags, a.status, a.fromurl, a.seo_title, a.seo_desc, a.seo_keys, i.info
FROM article a
LEFT JOIN article_info i ON a.id = i.article_id
WHERE a.status = 1
ORDER BY a.id ASC
LIMIT ${BATCH_SIZE} OFFSET ${OFFSET}
\"" > /tmp/batch_${BATCH}.tsv 2>/dev/null
    
    if [ ! -s /tmp/batch_${BATCH}.tsv ]; then
        echo "⚠️  批次 ${BATCH} 导出为空，可能已完成所有数据" | tee -a "${LOG_FILE}"
        break
    fi
    
    # 2. 转换为JSON
    echo "[2/4] 转换为JSON..." | tee -a "${LOG_FILE}"
    python3 scripts/tsv_to_json.py /tmp/batch_${BATCH}.tsv /tmp/batch_${BATCH}.json > /dev/null 2>&1
    
    # 3. 上传到新服务器
    echo "[3/4] 上传到新服务器..." | tee -a "${LOG_FILE}"
    scp -q /tmp/batch_${BATCH}.json ${NEW_HOST}:/opt/idp-cms/data/migration/exports/batch_${BATCH}.json 2>/dev/null
    
    # 4. 在新服务器上导入
    echo "[4/4] 导入到新系统..." | tee -a "${LOG_FILE}"
    ssh ${NEW_HOST} "cd /opt/idp-cms && docker compose -f infra/production/docker-compose-ha-node1.yml exec -T authoring python manage.py import_old_articles \
        --file=data/migration/exports/batch_${BATCH}.json \
        --batch-size=${BATCH_SIZE} \
        --skip-inline-images" 2>&1 | tee -a "${LOG_FILE}"
    
    # 5. 清理临时文件
    rm -f /tmp/batch_${BATCH}.{tsv,json}
    ssh ${NEW_HOST} "rm -f /opt/idp-cms/data/migration/exports/batch_${BATCH}.json" 2>/dev/null
    
    # 显示进度
    IMPORTED=$(( ($i + 1) * $BATCH_SIZE ))
    if [ $IMPORTED -gt $TOTAL ]; then
        IMPORTED=$TOTAL
    fi
    PROGRESS=$(( ($IMPORTED * 100) / $TOTAL ))
    echo "" | tee -a "${LOG_FILE}"
    echo "✅ 批次 ${BATCH}/${BATCHES} 完成 | 已导入: ${IMPORTED}/${TOTAL} (${PROGRESS}%)" | tee -a "${LOG_FILE}"
    echo "" | tee -a "${LOG_FILE}"
    
    # 每10批休息一下
    if [ $(( $BATCH % 10 )) -eq 0 ]; then
        echo "⏸️  已完成${BATCH}批，休息5秒..." | tee -a "${LOG_FILE}"
        sleep 5
    fi
done

echo "" | tee -a "${LOG_FILE}"
echo "===============================================" | tee -a "${LOG_FILE}"
echo "✅ 批量导入完成！" | tee -a "${LOG_FILE}"
echo "===============================================" | tee -a "${LOG_FILE}"
echo "" | tee -a "${LOG_FILE}"
echo "📊 统计信息请查看日志: ${LOG_FILE}" | tee -a "${LOG_FILE}"

