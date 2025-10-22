#!/bin/bash
#
# 分批导出和导入文章脚本
# 
# 用法: ./batch_export_import.sh
#

set -e

# 配置
OLD_MYSQL_HOST="121.41.73.49"
OLD_MYSQL_USER="jrhb"
OLD_MYSQL_PASS="6VSPmPbuFGnZO1%C"
OLD_MYSQL_DB="jrhb"

BATCH_SIZE=20000  # 每批文章数
EXPORT_DIR="data/migration/exports"
REMOTE_HOST="root@8.133.22.7"
REMOTE_DIR="/opt/idp-cms"

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}开始分批导出和导入文章${NC}"
echo -e "${GREEN}============================================================${NC}"

# 获取总文章数
echo -e "${YELLOW}查询文章总数...${NC}"
TOTAL=$(ssh root@${OLD_MYSQL_HOST} "docker exec \$(docker ps | grep mysql | awk '{print \$1}') mysql -u${OLD_MYSQL_USER} -p'${OLD_MYSQL_PASS}' ${OLD_MYSQL_DB} -sN -e 'SELECT COUNT(*) FROM article WHERE status = 1;'")

echo -e "${GREEN}总文章数: ${TOTAL}${NC}"

# 计算批次数
BATCHES=$(( ($TOTAL + $BATCH_SIZE - 1) / $BATCH_SIZE ))
echo -e "${GREEN}将分 ${BATCHES} 批处理，每批 ${BATCH_SIZE} 篇${NC}"
echo ""

# 分批处理
for ((i=0; i<$BATCHES; i++)); do
    OFFSET=$(( $i * $BATCH_SIZE ))
    BATCH_NUM=$(( $i + 1 ))
    
    echo -e "${YELLOW}======== 批次 ${BATCH_NUM}/${BATCHES} ========${NC}"
    echo -e "${YELLOW}偏移量: ${OFFSET}, 数量: ${BATCH_SIZE}${NC}"
    
    # 1. 导出到本地
    echo -e "${YELLOW}[1/${BATCHES}] 导出批次 ${BATCH_NUM}...${NC}"
    ssh root@${OLD_MYSQL_HOST} "docker exec \$(docker ps | grep mysql | awk '{print \$1}') mysql -u${OLD_MYSQL_USER} -p'${OLD_MYSQL_PASS}' ${OLD_MYSQL_DB} --default-character-set=utf8mb4 -e \"
SELECT 
  a.id,
  a.title,
  a.cate_id,
  a.img,
  a.add_time,
  a.last_time,
  a.author,
  a.tags,
  a.status,
  a.fromurl,
  a.seo_title,
  a.seo_desc,
  a.seo_keys,
  i.info
FROM article a
LEFT JOIN article_info i ON a.id = i.article_id
WHERE a.status = 1
ORDER BY a.add_time DESC
LIMIT ${BATCH_SIZE} OFFSET ${OFFSET};
\" --skip-column-names" > ${EXPORT_DIR}/articles_batch_${BATCH_NUM}.tsv
    
    # 2. 转换为JSON
    echo -e "${YELLOW}[2/${BATCHES}] 转换为JSON...${NC}"
    python3 scripts/tsv_to_json.py ${EXPORT_DIR}/articles_batch_${BATCH_NUM}.tsv ${EXPORT_DIR}/articles_batch_${BATCH_NUM}.json
    
    # 3. 上传到远程服务器
    echo -e "${YELLOW}[3/${BATCHES}] 上传到远程服务器...${NC}"
    scp ${EXPORT_DIR}/articles_batch_${BATCH_NUM}.json ${REMOTE_HOST}:${REMOTE_DIR}/data/migration/exports/
    
    # 4. 在远程服务器导入
    echo -e "${YELLOW}[4/${BATCHES}] 远程导入...${NC}"
    ssh ${REMOTE_HOST} "cd ${REMOTE_DIR} && docker compose -f infra/production/docker-compose-ha-node1.yml exec authoring python manage.py import_old_articles --input-file=data/migration/exports/articles_batch_${BATCH_NUM}.json --batch-size=1000"
    
    # 清理临时文件
    rm -f ${EXPORT_DIR}/articles_batch_${BATCH_NUM}.tsv
    
    echo -e "${GREEN}✅ 批次 ${BATCH_NUM}/${BATCHES} 完成${NC}"
    echo ""
done

echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}✅ 全部导入完成！${NC}"
echo -e "${GREEN}============================================================${NC}"

