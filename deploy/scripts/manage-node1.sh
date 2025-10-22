#!/bin/bash

################################################################################
# Node1 服务管理脚本 - 统一管理工具
# 
# 功能：部署、日志、重启、备份、健康检查等所有运维操作
# 服务器: 121.40.167.71
################################################################################

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
PROJECT_ROOT="/opt/idp-cms"
ENV_FILE=".env.node1"
COMPOSE_FILE="infra/production/docker-compose-ha-node1.yml"
INFRA_COMPOSE_FILE="infra/production/docker-compose-ha-infra.yml"

# 帮助信息
show_help() {
    cat << EOF
${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}
${BLUE}║            Node1 服务管理工具 v2.0                           ║${NC}
${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}

${GREEN}📦 部署相关:${NC}
  deploy                    完整部署
  deploy --no-cache         强制重建所有镜像
  rebuild-frontend          快速重建前端
  rebuild-backend           快速重建后端

${GREEN}🔧 服务管理:${NC}
  status                    查看所有服务状态
  restart <service>         重启服务 (frontend|authoring|celery|all)
  stop <service>            停止服务
  start <service>           启动服务

${GREEN}📊 日志管理:${NC}
  logs <service> [lines]    查看日志 (frontend|authoring|celery|all)
  logs frontend 100         查看前端最后100行日志
  logs-follow <service>     实时跟踪日志

${GREEN}💾 数据库操作:${NC}
  migrate                   运行数据库迁移
  makemigrations            创建迁移文件
  shell                     进入 Django shell
  dbshell                   进入数据库 shell

${GREEN}🗑️ 缓存管理:${NC}
  clear-cache               清除 Redis 缓存
  clear-static              清除静态文件并重新收集

${GREEN}🏥 健康检查:${NC}
  health                    检查所有服务健康状态
  ps                        查看容器详细状态

${GREEN}🧹 清理操作:${NC}
  clean                     清理未使用的镜像和容器
  prune                     深度清理（包括未使用的 volumes）

${GREEN}💿 备份恢复:${NC}
  backup                    备份数据库和媒体文件
  list-backups              列出所有备份
  restore <file>            从备份恢复

${GREEN}⚙️ 环境管理:${NC}
  env-check                 检查环境变量配置
  env-show                  显示当前环境变量
  
${GREEN}⚡ 性能优化:${NC}
  optimize                  优化数据库和缓存
  rebuild-index             重建 OpenSearch 索引

${YELLOW}示例:${NC}
  $0 status                 查看状态
  $0 logs frontend 50       查看前端最后50行日志
  $0 restart authoring      重启后端
  $0 migrate                运行迁移
  $0 backup                 执行备份

EOF
}

# 打印带颜色的消息
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# 进入项目目录
cd "$PROJECT_ROOT" || { print_error "无法进入项目目录: $PROJECT_ROOT"; exit 1; }

# 命令处理
COMMAND="${1:-help}"
SERVICE="${2:-}"
PARAM="${3:-}"

case "$COMMAND" in
    # ==================== 部署相关 ====================
    deploy)
        print_info "开始部署..."
        if [ "$SERVICE" = "--no-cache" ]; then
            bash deploy/scripts/deploy-node1-standalone.sh --no-cache
        else
            bash deploy/scripts/deploy-node1-standalone.sh
        fi
        ;;
    
    rebuild-frontend)
        print_info "快速重建前端..."
        bash deploy/scripts/deploy-node1-standalone.sh --rebuild-frontend
        ;;
    
    rebuild-backend)
        print_info "快速重建后端..."
        bash deploy/scripts/deploy-node1-standalone.sh --rebuild-backend
        ;;
    
    # ==================== 代码同步 ====================
    sync)
        REMOTE_USER="root"
        REMOTE_HOST="121.40.167.71"
        REMOTE_PATH="/opt/idp-cms"
        
        TARGET="${SERVICE:-all}"
        
        case "$TARGET" in
            frontend|sites)
                print_info "同步前端代码..."
                rsync -avz --delete \
                    --exclude 'node_modules/' \
                    --exclude '.next/' \
                    --exclude '.git/' \
                    ${PROJECT_ROOT}/sites/ \
                    ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/sites/
                print_success "前端代码已同步"
                ;;
            
            backend|apps)
                print_info "同步后端代码..."
                rsync -avz --delete \
                    --exclude '__pycache__/' \
                    --exclude '*.pyc' \
                    --exclude '.git/' \
                    ${PROJECT_ROOT}/apps/ \
                    ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/apps/
                
                rsync -avz --delete \
                    --exclude '__pycache__/' \
                    --exclude '*.pyc' \
                    ${PROJECT_ROOT}/config/ \
                    ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/config/
                
                print_success "后端代码已同步"
                ;;
            
            all)
                print_info "同步所有代码..."
                
                # 同步前端
                rsync -avz --delete \
                    --exclude 'node_modules/' \
                    --exclude '.next/' \
                    --exclude '.git/' \
                    ${PROJECT_ROOT}/sites/ \
                    ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/sites/
                
                # 同步后端
                rsync -avz --delete \
                    --exclude '__pycache__/' \
                    --exclude '*.pyc' \
                    --exclude '.git/' \
                    ${PROJECT_ROOT}/apps/ \
                    ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/apps/
                
                rsync -avz --delete \
                    --exclude '__pycache__/' \
                    --exclude '*.pyc' \
                    ${PROJECT_ROOT}/config/ \
                    ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/config/
                
                # 同步配置文件
                rsync -avz \
                    ${PROJECT_ROOT}/requirements.txt \
                    ${PROJECT_ROOT}/manage.py \
                    ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/
                
                print_success "所有代码已同步"
                ;;
            
            *)
                print_error "未知目标: $TARGET"
                echo "可用目标: frontend|backend|all"
                exit 1
                ;;
        esac
        
        print_info "提示: 代码已同步，但可能需要重启容器才能生效"
        echo "  前端: ./manage.sh restart frontend"
        echo "  后端: ./manage.sh restart authoring"
        ;;
    
    # ==================== 服务管理 ====================
    status)
        print_info "服务状态:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "NAMES|node1|ha-"
        ;;
    
    ps)
        print_info "容器详细状态:"
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
        ;;
    
    restart)
        if [ -z "$SERVICE" ]; then
            print_error "请指定服务: frontend|authoring|celery|celery-beat|all"
            exit 1
        fi
        
        if [ "$SERVICE" = "all" ]; then
            print_info "重启所有应用服务..."
            docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart
        else
            print_info "重启服务: $SERVICE"
            docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart "$SERVICE"
        fi
        print_success "服务已重启"
        ;;
    
    stop)
        if [ -z "$SERVICE" ]; then
            print_error "请指定服务: frontend|authoring|celery|celery-beat|all"
            exit 1
        fi
        
        if [ "$SERVICE" = "all" ]; then
            docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" stop
        else
            docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" stop "$SERVICE"
        fi
        print_success "服务已停止"
        ;;
    
    start)
        if [ -z "$SERVICE" ]; then
            print_error "请指定服务: frontend|authoring|celery|celery-beat|all"
            exit 1
        fi
        
        if [ "$SERVICE" = "all" ]; then
            docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
        else
            docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d "$SERVICE"
        fi
        print_success "服务已启动"
        ;;
    
    # ==================== 日志管理 ====================
    logs)
        if [ -z "$SERVICE" ]; then
            print_error "请指定服务: frontend|authoring|celery|celery-beat|all"
            exit 1
        fi
        
        LINES="${PARAM:-100}"
        
        if [ "$SERVICE" = "all" ]; then
            print_info "查看所有服务日志（最后 $LINES 行）:"
            docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail="$LINES"
        else
            CONTAINER="node1-${SERVICE}"
            print_info "查看 $SERVICE 日志（最后 $LINES 行）:"
            docker logs --tail="$LINES" "$CONTAINER"
        fi
        ;;
    
    logs-follow)
        if [ -z "$SERVICE" ]; then
            print_error "请指定服务: frontend|authoring|celery|celery-beat|all"
            exit 1
        fi
        
        if [ "$SERVICE" = "all" ]; then
            print_info "实时跟踪所有服务日志:"
            docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f
        else
            CONTAINER="node1-${SERVICE}"
            print_info "实时跟踪 $SERVICE 日志:"
            docker logs -f "$CONTAINER"
        fi
        ;;
    
    # ==================== 数据库操作 ====================
    migrate)
        print_info "运行数据库迁移..."
        docker exec node1-authoring python manage.py migrate
        print_success "迁移完成"
        ;;
    
    makemigrations)
        print_info "创建迁移文件..."
        docker exec node1-authoring python manage.py makemigrations
        print_success "迁移文件已创建"
        ;;
    
    shell)
        print_info "进入 Django shell..."
        docker exec -it node1-authoring python manage.py shell
        ;;
    
    dbshell)
        print_info "进入数据库 shell..."
        docker exec -it ha-postgres psql -U postgres -d idp_cms_prod
        ;;
    
    # ==================== 缓存管理 ====================
    clear-cache)
        print_info "清除 Redis 缓存..."
        docker exec node1-authoring python manage.py shell -c "from django.core.cache import cache; cache.clear(); print('缓存已清除')"
        print_success "Redis 缓存已清除"
        ;;
    
    clear-static)
        print_info "清除并重新收集静态文件..."
        docker exec node1-authoring python manage.py collectstatic --noinput --clear
        print_success "静态文件已更新"
        ;;
    
    # ==================== 健康检查 ====================
    health)
        print_info "检查服务健康状态..."
        echo ""
        
        echo "📦 应用服务:"
        docker ps --format "table {{.Names}}\t{{.Status}}" | grep "node1"
        
        echo ""
        echo "🏗️ 基础设施:"
        docker ps --format "table {{.Names}}\t{{.Status}}" | grep "ha-"
        
        echo ""
        print_info "后端健康检查:"
        curl -s http://localhost:8000/health/ | head -10 || print_warning "后端健康检查失败"
        
        echo ""
        print_info "前端健康检查:"
        curl -s http://localhost:3000/api/health | head -10 || print_warning "前端健康检查失败"
        ;;
    
    # ==================== 清理操作 ====================
    clean)
        print_warning "清理未使用的镜像和容器..."
        docker system prune -f
        print_success "清理完成"
        ;;
    
    prune)
        print_warning "深度清理（包括 volumes）..."
        echo "此操作会删除未使用的 volumes，可能导致数据丢失！"
        read -p "确认继续？(yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            docker system prune -af --volumes
            print_success "深度清理完成"
        else
            print_info "已取消"
        fi
        ;;
    
    # ==================== 备份恢复 ====================
    backup)
        BACKUP_DIR="/opt/idp-cms/backups"
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        BACKUP_FILE="backup_${TIMESTAMP}.tar.gz"
        
        print_info "开始备份..."
        mkdir -p "$BACKUP_DIR"
        
        # 备份数据库
        print_info "备份数据库..."
        docker exec ha-postgres pg_dump -U postgres idp_cms_prod > "$BACKUP_DIR/db_${TIMESTAMP}.sql"
        
        # 备份媒体文件
        print_info "备份媒体文件..."
        tar -czf "$BACKUP_DIR/media_${TIMESTAMP}.tar.gz" -C data media 2>/dev/null || true
        
        # 打包所有备份
        tar -czf "$BACKUP_DIR/$BACKUP_FILE" -C "$BACKUP_DIR" "db_${TIMESTAMP}.sql" "media_${TIMESTAMP}.tar.gz" 2>/dev/null || true
        
        # 清理临时文件
        rm -f "$BACKUP_DIR/db_${TIMESTAMP}.sql" "$BACKUP_DIR/media_${TIMESTAMP}.tar.gz"
        
        print_success "备份完成: $BACKUP_FILE"
        ;;
    
    list-backups)
        BACKUP_DIR="/opt/idp-cms/backups"
        print_info "可用备份:"
        ls -lh "$BACKUP_DIR" 2>/dev/null || print_warning "没有找到备份文件"
        ;;
    
    restore)
        if [ -z "$SERVICE" ]; then
            print_error "请指定备份文件"
            exit 1
        fi
        
        print_warning "从备份恢复会覆盖当前数据！"
        read -p "确认继续？(yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            print_info "已取消"
            exit 0
        fi
        
        # TODO: 实现恢复逻辑
        print_warning "恢复功能正在开发中..."
        ;;
    
    # ==================== 环境管理 ====================
    env-check)
        print_info "检查环境变量配置..."
        
        if [ ! -f "$ENV_FILE" ]; then
            print_error "环境文件不存在: $ENV_FILE"
            exit 1
        fi
        
        print_success "环境文件存在: $ENV_FILE"
        
        # 检查关键变量
        echo ""
        print_info "关键环境变量:"
        grep -E "^(DJANGO_BASE_URL|MEDIA_BASE_URL|PORTAL_SITE|BACKEND_PUBLIC_URL)" "$ENV_FILE" || print_warning "未找到关键变量"
        ;;
    
    env-show)
        print_info "当前环境变量:"
        cat "$ENV_FILE" | grep -v "^#" | grep -v "^$"
        ;;
    
    # ==================== 性能优化 ====================
    optimize)
        print_info "优化数据库和缓存..."
        
        # 清除缓存
        docker exec node1-authoring python manage.py shell -c "from django.core.cache import cache; cache.clear()"
        
        # 优化数据库
        docker exec ha-postgres vacuumdb -U postgres -d idp_cms_prod -z
        
        print_success "优化完成"
        ;;
    
    rebuild-index)
        print_info "重建 OpenSearch 索引..."
        docker exec node1-authoring python manage.py shell -c "
from apps.core.management.commands.setup_sites import Command
cmd = Command()
# TODO: 添加索引重建逻辑
print('索引重建功能开发中...')
"
        ;;
    
    # ==================== 帮助 ====================
    help|--help|-h)
        show_help
        ;;
    
    *)
        print_error "未知命令: $COMMAND"
        echo ""
        show_help
        exit 1
        ;;
esac

