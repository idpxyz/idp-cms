#!/bin/bash

echo "================================"
echo "应用文章页面性能优化"
echo "================================"
echo ""

# 检查是否在正确的目录
if [ ! -f "infra/local/docker-compose.yml" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

echo "📋 优化内容:"
echo "  ✅ API超时: 3秒 → 1.5秒"
echo "  ✅ 重试次数: 2次 → 1次"
echo "  ✅ 页面超时控制: 1.5秒强制超时"
echo "  ✅ 错误处理: 优雅降级"
echo ""

echo "🔄 重启sites容器以应用优化..."
cd infra/local

# 重启sites容器
docker-compose restart sites

echo ""
echo "⏳ 等待服务启动 (30秒)..."
sleep 5

# 检查容器状态
for i in {1..25}; do
    if docker ps --filter "name=sites" --format "{{.Status}}" | grep -q "healthy"; then
        echo "✅ 服务已就绪！"
        break
    fi
    echo -n "."
    sleep 1
done

echo ""
echo ""

# 简单健康检查
echo "🔍 健康检查..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
    echo "✅ 服务正常运行"
else
    echo "⚠️  服务可能未完全就绪 (HTTP $HTTP_CODE)"
    echo "   建议再等待10-20秒后测试"
fi

echo ""
echo "================================"
echo "应用完成！"
echo "================================"
echo ""
echo "📊 运行性能测试:"
echo "  cd /opt/idp-cms"
echo "  ./test-article-performance.sh http://localhost:3001 young-students-carry-on-mission-2025 5"
echo ""
echo "🌐 浏览器测试:"
echo "  http://localhost:3001/portal/article/young-students-carry-on-mission-2025"
echo ""
echo "📖 查看详细报告:"
echo "  cat PERFORMANCE_TEST_REPORT.md"
echo ""

