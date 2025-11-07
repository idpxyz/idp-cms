#!/bin/bash
###############################################################################
# 恶意IP分析工具
# 用途：分析nginx日志，识别可疑/恶意IP
###############################################################################

LOG_FILE="/var/log/nginx/8.133.22.7-access.log"
LINES=5000  # 分析最近的行数

echo "=================================================="
echo "🕵️  恶意IP分析报告"
echo "=================================================="
echo "分析最近 $LINES 条日志..."
echo ""

# 1. 请求频率最高的IP（可能的攻击者）
echo "📊 1. 请求频率最高的Top 20 IP（可能的攻击源）"
echo "----------------------------------------"
tail -$LINES $LOG_FILE | awk '{print $1}' | sort | uniq -c | sort -rn | head -20 | while read count ip; do
    # 计算每秒请求数
    rate=$(echo "scale=2; $count / 60" | bc)
    if (( $(echo "$rate > 10" | bc -l) )); then
        flag="🚨 高频"
    elif (( $(echo "$rate > 5" | bc -l) )); then
        flag="⚠️  可疑"
    else
        flag="✓"
    fi
    printf "%-6s %s  %15s  (%.1f req/min)\n" "$count" "$flag" "$ip" "$rate"
done

# 2. 被阻止的IP（403 Forbidden）
echo ""
echo "🚫 2. 被识别为爬虫的IP（403错误）"
echo "----------------------------------------"
BLOCKED_COUNT=$(tail -$LINES $LOG_FILE | grep ' 403 ' | wc -l)
if [ $BLOCKED_COUNT -gt 0 ]; then
    echo "被阻止请求总数: $BLOCKED_COUNT"
    tail -$LINES $LOG_FILE | grep ' 403 ' | awk '{print $1}' | sort | uniq -c | sort -rn | head -10 | while read count ip; do
        printf "%-6s %s\n" "$count" "$ip"
    done
else
    echo "✅ 无IP被阻止"
fi

# 3. 触发速率限制的IP（429错误）
echo ""
echo "⚠️  3. 触发速率限制的IP（429错误）"
echo "----------------------------------------"
RATE_LIMIT_COUNT=$(tail -$LINES $LOG_FILE | grep ' 429 ' | wc -l)
if [ $RATE_LIMIT_COUNT -gt 0 ]; then
    echo "触发速率限制总数: $RATE_LIMIT_COUNT"
    tail -$LINES $LOG_FILE | grep ' 429 ' | awk '{print $1}' | sort | uniq -c | sort -rn | head -10 | while read count ip; do
        printf "%-6s %s\n" "$count" "$ip"
    done
else
    echo "✅ 无IP触发速率限制"
fi

# 4. 请求404最多的IP（可能在扫描）
echo ""
echo "🔍 4. 404错误最多的IP（可能在扫描漏洞）"
echo "----------------------------------------"
tail -$LINES $LOG_FILE | grep ' 404 ' | awk '{print $1}' | sort | uniq -c | sort -rn | head -10 | while read count ip; do
    if [ $count -gt 50 ]; then
        flag="🚨 高度可疑"
    elif [ $count -gt 20 ]; then
        flag="⚠️  可疑"
    else
        flag="✓"
    fi
    printf "%-6s %s  %s\n" "$count" "$flag" "$ip"
done

# 5. 识别爬虫User-Agent的IP
echo ""
echo "🤖 5. 使用爬虫User-Agent的IP"
echo "----------------------------------------"
BOT_PATTERNS="bot|crawl|spider|scrape|slurp|scan|curl|wget|python|go-http"
BOT_IPS=$(tail -$LINES $LOG_FILE | grep -iE "$BOT_PATTERNS" | awk '{print $1}' | sort | uniq -c | sort -rn | head -10)
if [ -n "$BOT_IPS" ]; then
    echo "$BOT_IPS" | while read count ip; do
        printf "%-6s %s\n" "$count" "$ip"
    done
else
    echo "✅ 未检测到明显的爬虫"
fi

# 6. 异常请求方法的IP
echo ""
echo "🔐 6. 使用异常HTTP方法的IP（PUT/DELETE等）"
echo "----------------------------------------"
ABNORMAL=$(tail -$LINES $LOG_FILE | grep -E ' "(PUT|DELETE|TRACE|CONNECT|OPTIONS) ' | awk '{print $1}' | sort | uniq -c | sort -rn)
if [ -n "$ABNORMAL" ]; then
    echo "$ABNORMAL" | while read count ip; do
        printf "%-6s %s 🚨\n" "$count" "$ip"
    done
else
    echo "✅ 无异常请求方法"
fi

# 7. 单个IP的详细分析
echo ""
echo "🔬 7. 单个IP详细分析（Top 3可疑IP）"
echo "----------------------------------------"
# 获取前3个最频繁的IP
TOP_IPS=$(tail -$LINES $LOG_FILE | awk '{print $1}' | sort | uniq -c | sort -rn | head -3 | awk '{print $2}')

for ip in $TOP_IPS; do
    echo ""
    echo "IP: $ip"
    echo "  总请求: $(tail -$LINES $LOG_FILE | grep "^$ip " | wc -l)"
    echo "  状态码分布:"
    tail -$LINES $LOG_FILE | grep "^$ip " | awk '{print $9}' | sort | uniq -c | sort -rn | while read count code; do
        printf "    %-6s %s\n" "$count" "$code"
    done
    echo "  User-Agent:"
    tail -$LINES $LOG_FILE | grep "^$ip " | awk -F'"' '{print $6}' | sort | uniq -c | sort -rn | head -1 | while read count agent; do
        printf "    %s\n" "${agent:0:70}"
    done
    echo "  访问的路径（前5）:"
    tail -$LINES $LOG_FILE | grep "^$ip " | awk '{print $7}' | sort | uniq -c | sort -rn | head -5 | while read count path; do
        printf "    %-6s %s\n" "$count" "${path:0:50}"
    done
done

# 8. 建议封禁的IP列表
echo ""
echo "=================================================="
echo "💡 建议采取行动的IP"
echo "=================================================="

# 综合分析：高频+高404+被阻止
echo ""
echo "🚨 高度可疑IP（建议封禁）："
echo "标准: 请求>500次/小时 或 404错误>50次 或 被阻止>10次"
echo "----------------------------------------"

# 高频IP
HIGH_FREQ=$(tail -$LINES $LOG_FILE | awk '{print $1}' | sort | uniq -c | sort -rn | awk '$1>500 {print $2}')

# 高404 IP
HIGH_404=$(tail -$LINES $LOG_FILE | grep ' 404 ' | awk '{print $1}' | sort | uniq -c | sort -rn | awk '$1>50 {print $2}')

# 被阻止IP
BLOCKED=$(tail -$LINES $LOG_FILE | grep ' 403 ' | awk '{print $1}' | sort | uniq -c | sort -rn | awk '$1>10 {print $2}')

# 合并去重
MALICIOUS=$(echo -e "$HIGH_FREQ\n$HIGH_404\n$BLOCKED" | sort | uniq)

if [ -n "$MALICIOUS" ]; then
    for ip in $MALICIOUS; do
        req_count=$(tail -$LINES $LOG_FILE | grep "^$ip " | wc -l)
        error_404=$(tail -$LINES $LOG_FILE | grep "^$ip " | grep ' 404 ' | wc -l)
        blocked=$(tail -$LINES $LOG_FILE | grep "^$ip " | grep ' 403 ' | wc -l)
        printf "%-15s  请求:%-4s  404:%-3s  阻止:%-3s\n" "$ip" "$req_count" "$error_404" "$blocked"
    done
    
    echo ""
    echo "📋 一键封禁命令（复制执行）："
    echo "----------------------------------------"
    for ip in $MALICIOUS; do
        echo "ufw deny from $ip"
    done
else
    echo "✅ 当前无需要封禁的IP"
fi

echo ""
echo "=================================================="
echo "分析完成时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=================================================="
echo ""
echo "💡 建议操作："
echo "1. 查看详细日志: tail -f $LOG_FILE | grep '可疑IP'"
echo "2. 手动封禁IP: ufw deny from IP地址"
echo "3. 查看当前防火墙: ufw status"
echo "4. 定期运行此脚本: watch -n 300 bash $0"
echo ""

