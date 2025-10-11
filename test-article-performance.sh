#!/bin/bash

# 文章页面性能测试脚本
# 用于验证性能优化效果

echo "================================"
echo "文章页面性能测试"
echo "================================"
echo ""

# 配置
BASE_URL="${1:-http://localhost:3001}"
TEST_SLUG="${2:-test-article}"
ITERATIONS="${3:-5}"

echo "测试配置："
echo "  基础URL: $BASE_URL"
echo "  测试文章: $TEST_SLUG"
echo "  测试次数: $ITERATIONS"
echo ""

# 创建临时curl格式文件
CURL_FORMAT=$(mktemp)
cat > "$CURL_FORMAT" << 'EOF'
时间分析（秒）:
  DNS解析:        %{time_namelookup}s
  TCP连接:        %{time_connect}s
  开始传输:        %{time_starttransfer}s
  总时间:          %{time_total}s
  
响应信息:
  HTTP状态码:      %{http_code}
  下载大小:        %{size_download} bytes
EOF

echo "================================"
echo "1. 测试API响应时间"
echo "================================"

API_URL="$BASE_URL/api/articles/$TEST_SLUG"
echo "API URL: $API_URL"
echo ""

total_time=0
success_count=0

for i in $(seq 1 $ITERATIONS); do
  echo "第 $i 次测试..."
  
  # 使用curl测试，捕获时间
  response=$(curl -w "@$CURL_FORMAT" -o /dev/null -s "$API_URL" 2>&1)
  
  # 提取总时间
  time=$(echo "$response" | grep "总时间" | awk '{print $2}' | sed 's/s//')
  status=$(echo "$response" | grep "HTTP状态码" | awk '{print $2}')
  
  echo "  状态: $status, 时间: ${time}s"
  
  if [ "$status" = "200" ]; then
    total_time=$(echo "$total_time + $time" | bc)
    success_count=$((success_count + 1))
  fi
  
  sleep 0.5
done

if [ $success_count -gt 0 ]; then
  avg_time=$(echo "scale=3; $total_time / $success_count" | bc)
  echo ""
  echo "API测试结果："
  echo "  成功次数: $success_count/$ITERATIONS"
  echo "  平均响应时间: ${avg_time}s"
  echo ""
else
  echo "  警告: 所有请求都失败了！"
  echo ""
fi

echo "================================"
echo "2. 测试页面加载时间"
echo "================================"

PAGE_URL="$BASE_URL/portal/article/$TEST_SLUG"
echo "页面 URL: $PAGE_URL"
echo ""

total_time=0
success_count=0

for i in $(seq 1 $ITERATIONS); do
  echo "第 $i 次测试..."
  
  response=$(curl -w "@$CURL_FORMAT" -o /dev/null -s "$PAGE_URL" 2>&1)
  
  time=$(echo "$response" | grep "总时间" | awk '{print $2}' | sed 's/s//')
  status=$(echo "$response" | grep "HTTP状态码" | awk '{print $2}')
  
  echo "  状态: $status, 时间: ${time}s"
  
  if [ "$status" = "200" ]; then
    total_time=$(echo "$total_time + $time" | bc)
    success_count=$((success_count + 1))
  fi
  
  sleep 0.5
done

if [ $success_count -gt 0 ]; then
  avg_time=$(echo "scale=3; $total_time / $success_count" | bc)
  echo ""
  echo "页面测试结果："
  echo "  成功次数: $success_count/$ITERATIONS"
  echo "  平均加载时间: ${avg_time}s"
  echo ""
else
  echo "  警告: 所有请求都失败了！"
  echo ""
fi

echo "================================"
echo "3. 性能评估"
echo "================================"

if [ $success_count -gt 0 ]; then
  # 将字符串转换为数字进行比较
  if (( $(echo "$avg_time < 1.0" | bc -l) )); then
    echo "✅ 优秀！页面加载时间 < 1秒"
  elif (( $(echo "$avg_time < 2.0" | bc -l) )); then
    echo "✅ 良好！页面加载时间在 1-2 秒之间"
  elif (( $(echo "$avg_time < 3.0" | bc -l) )); then
    echo "⚠️  一般，页面加载时间在 2-3 秒之间"
  else
    echo "❌ 较慢，页面加载时间 > 3 秒，需要进一步优化"
  fi
else
  echo "❌ 无法评估，所有测试都失败了"
fi

echo ""
echo "================================"
echo "4. 建议"
echo "================================"

if [ $success_count -gt 0 ]; then
  if (( $(echo "$avg_time > 2.0" | bc -l) )); then
    echo "性能仍然较慢，建议："
    echo "  1. 检查后端API响应时间"
    echo "  2. 检查数据库查询性能"
    echo "  3. 考虑使用CDN缓存"
    echo "  4. 启用HTTP/2或HTTP/3"
    echo "  5. 使用Streaming SSR（参考 page-streaming.tsx）"
  else
    echo "性能良好！可选的进一步优化："
    echo "  1. 启用CDN缓存提升全球访问速度"
    echo "  2. 使用图片优化减少带宽使用"
    echo "  3. 实施Service Worker缓存策略"
  fi
else
  echo "测试失败，请检查："
  echo "  1. 服务是否正常运行？"
  echo "  2. URL配置是否正确？"
  echo "  3. 网络连接是否正常？"
  echo ""
  echo "尝试手动测试："
  echo "  curl -I $PAGE_URL"
fi

echo ""

# 清理
rm -f "$CURL_FORMAT"

echo "================================"
echo "测试完成"
echo "================================"

