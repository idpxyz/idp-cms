#!/bin/bash

###############################################################################
# 数据恢复脚本
# 从备份恢复数据库、媒体文件和配置
###############################################################################

set -e

# 配置
COMPOSE_FILE="${COMPOSE_FILE:-infra/production/docker-compose.yml}"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║          🔄 数据恢复系统                                              ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# 检查参数
if [ "$#" -lt 1 ]; then
    echo "用法: $0 <backup_directory>"
    echo ""
    echo "示例:"
    echo "  $0 backups/cms-20251011_143025"
    echo ""
    echo "可用的备份:"
    if [ -d "backups" ]; then
        ls -lt backups/ | grep "^d" | head -5 | awk '{printf "  • %s %s %s\n", $6, $7, $9}'
    fi
    echo ""
    exit 1
fi

BACKUP_DIR="$1"

# 检查备份目录
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}❌ 错误：备份目录不存在: $BACKUP_DIR${NC}"
    exit 1
fi

echo "备份目录: $BACKUP_DIR"
echo ""

# 显示备份信息
if [ -f "$BACKUP_DIR/MANIFEST.txt" ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📋 备份信息${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    head -n 10 "$BACKUP_DIR/MANIFEST.txt"
    echo ""
fi

# 警告信息
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}⚠️  警告：此操作将覆盖当前数据！${NC}"
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "恢复内容:"
echo "  • 数据库"
echo "  • 媒体文件"
echo "  • 配置文件"
echo ""
read -p "确认继续？输入 'yes' 继续: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ 已取消"
    exit 0
fi

echo ""

# 1. 恢复数据库
restore_database() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}1️⃣  恢复数据库${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    if [ ! -f "$BACKUP_DIR/database.sql.gz" ] && [ ! -f "$BACKUP_DIR/database.sql" ]; then
        echo -e "${YELLOW}⚠️  未找到数据库备份文件${NC}"
        return 1
    fi
    
    # 解压数据库备份
    if [ -f "$BACKUP_DIR/database.sql.gz" ]; then
        echo "📦 解压数据库备份..."
        gunzip -c "$BACKUP_DIR/database.sql.gz" > /tmp/restore_db.sql
    else
        cp "$BACKUP_DIR/database.sql" /tmp/restore_db.sql
    fi
    
    # 备份当前数据库
    echo "💾 备份当前数据库（以防万一）..."
    docker compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U postgres cms > "/tmp/current_db_backup_$(date +%Y%m%d_%H%M%S).sql" 2>/dev/null || true
    
    # 恢复数据库
    echo "🔄 恢复数据库..."
    
    # 断开所有连接
    docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U postgres << 'EOF'
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'cms'
  AND pid <> pg_backend_pid();
EOF
    
    # 删除并重建数据库
    docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS cms;"
    docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U postgres -c "CREATE DATABASE cms;"
    
    # 导入数据
    docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U postgres cms < /tmp/restore_db.sql
    
    # 清理
    rm -f /tmp/restore_db.sql
    
    echo -e "${GREEN}✅ 数据库恢复完成${NC}"
    echo ""
}

# 2. 恢复媒体文件
restore_media() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}2️⃣  恢复媒体文件${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    if [ ! -f "$BACKUP_DIR/media.tar.gz" ]; then
        echo -e "${YELLOW}⚠️  未找到媒体文件备份${NC}"
        return 1
    fi
    
    # 备份当前媒体文件
    if [ -d "media" ]; then
        echo "💾 备份当前媒体文件..."
        mv media "media_backup_$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
    fi
    
    # 解压媒体文件
    echo "📦 解压媒体文件..."
    tar -xzf "$BACKUP_DIR/media.tar.gz"
    
    echo -e "${GREEN}✅ 媒体文件恢复完成${NC}"
    echo ""
}

# 3. 恢复配置文件
restore_configs() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}3️⃣  恢复配置文件${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    if [ ! -f "$BACKUP_DIR/configs.tar.gz" ]; then
        echo -e "${YELLOW}⚠️  未找到配置文件备份${NC}"
        return 1
    fi
    
    echo "📦 解压配置文件..."
    tar -xzf "$BACKUP_DIR/configs.tar.gz" -C /tmp/
    
    # 备份当前配置
    echo "💾 备份当前配置..."
    mkdir -p "config_backup_$(date +%Y%m%d_%H%M%S)"
    cp .env.* "config_backup_$(date +%Y%m%d_%H%M%S)/" 2>/dev/null || true
    
    # 恢复配置
    echo "🔄 恢复配置文件..."
    cp -r /tmp/configs/* ./ 2>/dev/null || true
    
    # 清理
    rm -rf /tmp/configs
    
    echo -e "${GREEN}✅ 配置文件恢复完成${NC}"
    echo ""
}

# 4. 重启服务
restart_services() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}4️⃣  重启服务${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    read -p "是否重启服务？(yes/no): " RESTART
    
    if [ "$RESTART" = "yes" ]; then
        echo "🔄 重启服务..."
        docker compose -f "$COMPOSE_FILE" restart
        
        echo ""
        echo "⏳ 等待服务启动..."
        sleep 10
        
        # 检查服务状态
        docker compose -f "$COMPOSE_FILE" ps
        
        echo ""
        echo -e "${GREEN}✅ 服务已重启${NC}"
    fi
    
    echo ""
}

# 主函数
main() {
    local start_time=$(date +%s)
    
    # 执行恢复
    restore_database || echo -e "${YELLOW}⚠️  数据库恢复失败或跳过${NC}"
    restore_media || echo -e "${YELLOW}⚠️  媒体文件恢复失败或跳过${NC}"
    restore_configs || echo -e "${YELLOW}⚠️  配置文件恢复失败或跳过${NC}"
    restart_services
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}✅ 恢复完成！${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "恢复时间: ${duration}s"
    echo ""
    echo "📝 下一步:"
    echo "  1. 检查服务状态: docker compose ps"
    echo "  2. 查看日志: docker compose logs -f"
    echo "  3. 访问网站验证功能"
    echo ""
}

# 运行主函数
main

