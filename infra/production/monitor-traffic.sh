#!/bin/bash
###############################################################################
# Nginx 流量监控脚本
# 用途：实时监控访问流量、识别爬虫、统计被阻止的请求
###############################################################################

LOG_FILE="/var/log/nginx/8.133.22.7-access.log"
ERROR_LOG="/var/log/nginx/8.133.22.7-error.log"

echo "=================================================="
echo "🔍 Nginx 流量监控"
echo "=================================================="

# 1. 当前连接统计
echo ""
echo "📊 当前连接统计："
echo "----------------------------------------"
TOTAL_CONN=$(netstat -an | grep ':80 ' | wc -l)
ESTABLISHED=$(netstat -an | grep ':80 ' | grep ESTABLISHED | wc -l)
echo "总连接数: $TOTAL_CONN"
echo "活跃连接: $ESTABLISHED"

# 2. 最近1分钟访问量
echo ""
echo "📈 最近1分钟访问统计："
echo "----------------------------------------"
RECENT_COUNT=$(tail -1000 $LOG_FILE | wc -l)
echo "请求总数: $RECENT_COUNT"

# 3. Top 10 访问IP
echo ""
echo "🌐 Top 10 访问IP："
echo "----------------------------------------"
tail -1000 $LOG_FILE | awk '{print $1}' | sort | uniq -c | sort -rn | head -10 | while read count ip; do
    printf "%-6s %s\n" "$count" "$ip"
done

# 4. Top 10 User-Agent
echo ""
echo "🤖 Top 10 User-Agent："
echo "----------------------------------------"
tail -1000 $LOG_FILE | awk -F'"' '{print $6}' | sort | uniq -c | sort -rn | head -10 | while read count agent; do
    printf "%-6s %s\n" "$count" "${agent:0:60}"
done

# 5. 状态码统计
echo ""
echo "📋 HTTP 状态码统计："
echo "----------------------------------------"
tail -1000 $LOG_FILE | awk '{print $9}' | sort | uniq -c | sort -rn | while read count code; do
    case $code in
        200) status="✅ 成功" ;;
        301|302) status="↪️  重定向" ;;
        403) status="🚫 禁止访问" ;;
        404) status="❌ 未找到" ;;
        429) status="⚠️  速率限制" ;;
        500|502|503) status="💥 服务器错误" ;;
        *) status="" ;;
    esac
    printf "%-6s %s %s\n" "$count" "$code" "$status"
done

# 6. 最频繁访问的路径
echo ""
echo "📁 Top 10 访问路径："
echo "----------------------------------------"
tail -1000 $LOG_FILE | awk '{print $7}' | sort | uniq -c | sort -rn | head -10 | while read count path; do
    printf "%-6s %s\n" "$count" "${path:0:70}"
done

# 7. 检测可疑爬虫
echo ""
echo "🕷️  检测到的爬虫："
echo "----------------------------------------"
BOT_PATTERNS="bot|crawl|spider|scrape|slurp|scan|curl|wget|python|go-http"
BOT_COUNT=$(tail -1000 $LOG_FILE | grep -iE "$BOT_PATTERNS" | wc -l)
if [ $BOT_COUNT -gt 0 ]; then
    echo "爬虫请求数: $BOT_COUNT"
    tail -1000 $LOG_FILE | grep -iE "$BOT_PATTERNS" | awk -F'"' '{print $6}' | sort | uniq -c | sort -rn | head -5 | while read count agent; do
        printf "  %-6s %s\n" "$count" "${agent:0:60}"
    done
else
    echo "未检测到明显的爬虫请求"
fi

# 8. 速率限制日志（429错误）
echo ""
echo "⚠️  速率限制触发："
echo "----------------------------------------"
LIMIT_COUNT=$(tail -1000 $LOG_FILE | grep ' 429 ' | wc -l)
if [ $LIMIT_COUNT -gt 0 ]; then
    echo "触发次数: $LIMIT_COUNT"
    tail -1000 $LOG_FILE | grep ' 429 ' | awk '{print $1}' | sort | uniq -c | sort -rn | head -5 | while read count ip; do
        printf "  %-6s %s\n" "$count" "$ip"
    done
else
    echo "未触发速率限制"
fi

# 9. 错误日志摘要
echo ""
echo "💥 最近错误："
echo "----------------------------------------"
if [ -f "$ERROR_LOG" ]; then
    ERROR_COUNT=$(tail -100 $ERROR_LOG | grep -i error | wc -l)
    if [ $ERROR_COUNT -gt 0 ]; then
        echo "错误数量: $ERROR_COUNT"
        tail -100 $ERROR_LOG | grep -i error | tail -3 | while read line; do
            echo "  ${line:0:100}"
        done
    else
        echo "✅ 无严重错误"
    fi
else
    echo "错误日志不存在"
fi

echo ""
echo "=================================================="
echo "监控时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=================================================="
echo ""
echo "💡 实时监控命令:"
echo "   watch -n 5 bash $0"
echo ""
echo "💡 查看实时日志:"
echo "   tail -f $LOG_FILE"
echo ""

