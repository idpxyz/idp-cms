#!/bin/bash
###############################################################################
# IP封禁管理工具
# 用途：方便地添加、删除、查看被封禁的IP
###############################################################################

BLOCKED_FILE="/etc/nginx/conf.d/blocked-ips.conf"
LOG_FILE="/var/log/nginx-ip-blocks.log"

# 记录日志
log_action() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# 显示当前被封禁的IP
show_blocked() {
    echo "=================================================="
    echo "🚫 当前被封禁的IP列表"
    echo "=================================================="
    if [ -f "$BLOCKED_FILE" ]; then
        grep "^deny" "$BLOCKED_FILE" | awk '{print $2}' | tr -d ';' | nl
    else
        echo "无封禁IP"
    fi
    echo ""
}

# 添加IP到封禁列表
add_ip() {
    local ip=$1
    local reason=$2
    
    if [ -z "$ip" ]; then
        echo "❌ 错误：请提供IP地址"
        echo "用法: $0 add IP地址 [原因]"
        return 1
    fi
    
    # 检查IP格式
    if ! [[ $ip =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        echo "❌ 错误：无效的IP地址格式"
        return 1
    fi
    
    # 检查是否已存在
    if grep -q "deny $ip" "$BLOCKED_FILE" 2>/dev/null; then
        echo "⚠️  IP $ip 已在封禁列表中"
        return 0
    fi
    
    # 添加到文件
    if [ -n "$reason" ]; then
        echo "# $reason" >> "$BLOCKED_FILE"
    fi
    echo "deny $ip;" >> "$BLOCKED_FILE"
    
    # 测试nginx配置
    if nginx -t 2>/dev/null; then
        systemctl reload nginx
        echo "✅ IP $ip 已添加到封禁列表"
        log_action "封禁IP: $ip - 原因: ${reason:-无}"
    else
        # 回滚
        sed -i "/deny $ip;/d" "$BLOCKED_FILE"
        echo "❌ 添加失败：nginx配置测试未通过"
        return 1
    fi
}

# 从封禁列表移除IP
remove_ip() {
    local ip=$1
    
    if [ -z "$ip" ]; then
        echo "❌ 错误：请提供IP地址"
        echo "用法: $0 remove IP地址"
        return 1
    fi
    
    if ! grep -q "deny $ip" "$BLOCKED_FILE" 2>/dev/null; then
        echo "⚠️  IP $ip 不在封禁列表中"
        return 0
    fi
    
    # 移除IP及其注释
    sed -i "/deny $ip;/d" "$BLOCKED_FILE"
    
    # 测试并重载
    if nginx -t 2>/dev/null; then
        systemctl reload nginx
        echo "✅ IP $ip 已从封禁列表移除"
        log_action "解除封禁: $ip"
    else
        echo "❌ 移除失败：nginx配置测试未通过"
        return 1
    fi
}

# 批量添加IP
batch_add() {
    local file=$1
    
    if [ ! -f "$file" ]; then
        echo "❌ 错误：文件不存在: $file"
        return 1
    fi
    
    echo "📝 批量添加IP..."
    local count=0
    while IFS= read -r ip; do
        # 跳过空行和注释
        [[ -z "$ip" || "$ip" =~ ^# ]] && continue
        
        if add_ip "$ip" "批量添加" >/dev/null 2>&1; then
            ((count++))
            echo "  ✅ $ip"
        else
            echo "  ❌ $ip (失败)"
        fi
    done < "$file"
    
    echo "完成：添加了 $count 个IP"
}

# 显示帮助
show_help() {
    echo "=================================================="
    echo "🛡️  IP封禁管理工具"
    echo "=================================================="
    echo ""
    echo "用法:"
    echo "  $0 list                    - 查看已封禁的IP"
    echo "  $0 add IP [原因]           - 添加IP到封禁列表"
    echo "  $0 remove IP               - 从封禁列表移除IP"
    echo "  $0 batch 文件路径          - 批量添加IP（每行一个）"
    echo "  $0 log                     - 查看封禁日志"
    echo "  $0 analyze                 - 运行恶意IP分析"
    echo ""
    echo "示例:"
    echo "  $0 add 1.2.3.4 \"DDoS攻击\""
    echo "  $0 remove 1.2.3.4"
    echo "  $0 batch /tmp/bad_ips.txt"
    echo ""
}

# 查看日志
show_log() {
    echo "=================================================="
    echo "📋 IP封禁操作日志"
    echo "=================================================="
    if [ -f "$LOG_FILE" ]; then
        tail -50 "$LOG_FILE"
    else
        echo "暂无日志"
    fi
}

# 主程序
case "$1" in
    list|show)
        show_blocked
        ;;
    add)
        add_ip "$2" "$3"
        ;;
    remove|delete)
        remove_ip "$2"
        ;;
    batch)
        batch_add "$2"
        ;;
    log|logs)
        show_log
        ;;
    analyze)
        /opt/idp-cms/infra/production/analyze-malicious-ips.sh
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        show_help
        ;;
esac

