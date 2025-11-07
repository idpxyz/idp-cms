#!/bin/bash
###############################################################################
# 自动清理连接脚本
# 用途：当连接数超过阈值时，自动重启nginx
# 建议：通过cron每5分钟执行一次
###############################################################################

# 配置
MAX_CONNECTIONS=100  # 活跃连接阈值
LOG_FILE="/var/log/nginx-auto-clean.log"

# 获取当前活跃连接数
CURRENT_CONN=$(netstat -an | grep ':80 ' | grep ESTABLISHED | wc -l)

# 记录日志函数
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# 检查连接数
if [ $CURRENT_CONN -gt $MAX_CONNECTIONS ]; then
    log_message "⚠️  警告：活跃连接数过高 ($CURRENT_CONN > $MAX_CONNECTIONS)"
    
    # 记录Top 5 IP
    log_message "Top 5 连接IP:"
    netstat -an | grep ':80 ' | grep ESTABLISHED | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -rn | head -5 | while read count ip; do
        log_message "  $count 连接 <- $ip"
    done
    
    # 重启nginx
    log_message "🔄 执行: systemctl restart nginx"
    systemctl restart nginx
    
    if [ $? -eq 0 ]; then
        sleep 2
        NEW_CONN=$(netstat -an | grep ':80 ' | grep ESTABLISHED | wc -l)
        log_message "✅ Nginx重启成功，新连接数: $NEW_CONN"
    else
        log_message "❌ Nginx重启失败"
    fi
else
    log_message "✅ 正常：活跃连接数 $CURRENT_CONN (阈值: $MAX_CONNECTIONS)"
fi

