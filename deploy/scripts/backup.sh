#!/bin/bash

###############################################################################
# 自动备份脚本
# 备份数据库、媒体文件和配置
###############################################################################

set -e

# 配置
BACKUP_DIR="${BACKUP_DIR:-./backups}"
COMPOSE_FILE="${COMPOSE_FILE:-infra/production/docker-compose.yml}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
BACKUP_NAME="${BACKUP_NAME:-cms}"

# 颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 创建备份目录
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CURRENT_BACKUP_DIR="$BACKUP_DIR/$BACKUP_NAME-$TIMESTAMP"
mkdir -p "$CURRENT_BACKUP_DIR"

echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║          💾 自动备份系统                                              ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "备份目录: $CURRENT_BACKUP_DIR"
echo ""

# 1. 备份 PostgreSQL 数据库
backup_database() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}1️⃣  备份 PostgreSQL 数据库${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    local db_file="$CURRENT_BACKUP_DIR/database.sql"
    
    echo "📦 导出数据库..."
    if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U postgres cms > "$db_file" 2>/dev/null; then
        local size=$(du -h "$db_file" | cut -f1)
        echo -e "${GREEN}✅ 数据库备份完成: $size${NC}"
        
        # 压缩数据库备份
        echo "🗜️  压缩数据库备份..."
        gzip -f "$db_file"
        local compressed_size=$(du -h "$db_file.gz" | cut -f1)
        echo -e "${GREEN}✅ 压缩完成: $compressed_size${NC}"
    else
        echo -e "${YELLOW}⚠️  数据库备份失败${NC}"
        return 1
    fi
    
    echo ""
}

# 2. 备份媒体文件
backup_media() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}2️⃣  备份媒体文件${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # 获取 media 卷的挂载点
    local media_path="media"
    if [ -d "$media_path" ]; then
        echo "📦 打包媒体文件..."
        tar -czf "$CURRENT_BACKUP_DIR/media.tar.gz" "$media_path" 2>/dev/null
        
        local size=$(du -h "$CURRENT_BACKUP_DIR/media.tar.gz" | cut -f1)
        echo -e "${GREEN}✅ 媒体文件备份完成: $size${NC}"
    else
        echo -e "${YELLOW}⚠️  未找到媒体文件目录${NC}"
    fi
    
    echo ""
}

# 3. 备份配置文件
backup_configs() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}3️⃣  备份配置文件${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    local config_dir="$CURRENT_BACKUP_DIR/configs"
    mkdir -p "$config_dir"
    
    echo "📦 复制配置文件..."
    
    # 备份环境变量文件
    [ -f .env.core ] && cp .env.core "$config_dir/"
    [ -f .env.features ] && cp .env.features "$config_dir/"
    [ -f .env.development ] && cp .env.development "$config_dir/"
    [ -f .env.production ] && cp .env.production "$config_dir/"
    
    # 备份 Docker Compose 配置
    [ -d infra ] && cp -r infra "$config_dir/"
    
    # 备份 Nginx 配置（如果存在）
    if [ -f /etc/nginx/sites-available/*.conf ]; then
        mkdir -p "$config_dir/nginx"
        cp /etc/nginx/sites-available/*.conf "$config_dir/nginx/" 2>/dev/null || true
    fi
    
    # 打包配置
    cd "$CURRENT_BACKUP_DIR"
    tar -czf configs.tar.gz configs
    rm -rf configs
    cd - > /dev/null
    
    local size=$(du -h "$CURRENT_BACKUP_DIR/configs.tar.gz" | cut -f1)
    echo -e "${GREEN}✅ 配置文件备份完成: $size${NC}"
    
    echo ""
}

# 4. 创建备份元信息
create_manifest() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}4️⃣  创建备份清单${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    local manifest="$CURRENT_BACKUP_DIR/MANIFEST.txt"
    
    cat > "$manifest" << EOF
备份清单
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

备份时间: $(date '+%Y-%m-%d %H:%M:%S')
主机名: $HOSTNAME
备份名称: $BACKUP_NAME

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
文件列表:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF
    
    ls -lh "$CURRENT_BACKUP_DIR" | tail -n +2 >> "$manifest"
    
    echo ""
    cat >> "$manifest" << EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
恢复说明:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 恢复数据库:
   gunzip database.sql.gz
   docker compose exec -T postgres psql -U postgres cms < database.sql

2. 恢复媒体文件:
   tar -xzf media.tar.gz

3. 恢复配置:
   tar -xzf configs.tar.gz
   cp -r configs/* /path/to/project/

EOF
    
    echo -e "${GREEN}✅ 备份清单创建完成${NC}"
    echo ""
}

# 5. 清理旧备份
cleanup_old_backups() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}5️⃣  清理旧备份${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    echo "🗑️  删除 $RETENTION_DAYS 天前的备份..."
    
    local deleted_count=0
    while IFS= read -r -d '' backup_dir; do
        rm -rf "$backup_dir"
        ((deleted_count++))
        echo "  已删除: $(basename "$backup_dir")"
    done < <(find "$BACKUP_DIR" -maxdepth 1 -type d -name "$BACKUP_NAME-*" -mtime +$RETENTION_DAYS -print0)
    
    if [ $deleted_count -eq 0 ]; then
        echo "  没有需要清理的旧备份"
    else
        echo -e "${GREEN}✅ 已清理 $deleted_count 个旧备份${NC}"
    fi
    
    echo ""
}

# 6. 显示备份统计
show_statistics() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📊 备份统计${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    local total_size=$(du -sh "$CURRENT_BACKUP_DIR" | cut -f1)
    local backup_count=$(find "$BACKUP_DIR" -maxdepth 1 -type d -name "$BACKUP_NAME-*" | wc -l)
    local total_backup_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "0")
    
    echo "  本次备份大小: $total_size"
    echo "  备份总数: $backup_count"
    echo "  备份总大小: $total_backup_size"
    echo "  保留天数: $RETENTION_DAYS 天"
    echo ""
    
    echo "最近的备份:"
    ls -lt "$BACKUP_DIR" | grep "^d" | head -5 | awk '{printf "  • %s %s %s\n", $6, $7, $9}'
    echo ""
}

# 主函数
main() {
    local start_time=$(date +%s)
    
    # 执行备份
    backup_database || true
    backup_media || true
    backup_configs || true
    create_manifest
    cleanup_old_backups
    show_statistics
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}✅ 备份完成！${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "备份位置: $CURRENT_BACKUP_DIR"
    echo "耗时: ${duration}s"
    echo ""
    echo "恢复命令:"
    echo "  ./restore.sh $CURRENT_BACKUP_DIR"
    echo ""
}

# 帮助信息
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    cat << 'EOF'
用法: ./backup.sh [选项]

选项:
  --help, -h              显示此帮助信息

环境变量:
  BACKUP_DIR              备份目录（默认: ./backups）
  COMPOSE_FILE           Docker Compose 配置文件
  RETENTION_DAYS         保留天数（默认: 7）
  BACKUP_NAME            备份名称前缀（默认: cms）

示例:
  # 默认备份
  ./backup.sh

  # 自定义备份目录
  BACKUP_DIR=/mnt/backups ./backup.sh

  # 保留 30 天的备份
  RETENTION_DAYS=30 ./backup.sh

  # 设置定时备份（每天凌晨 2 点）
  crontab -e
  0 2 * * * cd /opt/idp-cms && ./backup.sh >> /var/log/cms-backup.log 2>&1

EOF
    exit 0
fi

# 运行主函数
main

