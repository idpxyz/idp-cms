#!/bin/bash
# 一键修复并验证 Sitemap

set -e

echo "=========================================="
echo "🔧 Sitemap 修复脚本"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cd /opt/idp-cms

echo "📍 步骤 1/4: 测试 API 连接..."
echo ""

API_TEST=$(curl -s "http://localhost:8000/api/articles?site=localhost&page=1&size=1" | grep -o '"items"' | wc -l)
API_TEST=${API_TEST:-0}

if [ "$API_TEST" -ge "1" ]; then
    echo -e "${GREEN}✅ API 连接正常，可以获取文章${NC}"
else
    echo -e "${RED}❌ API 连接失败${NC}"
    echo "请检查："
    echo "  1. authoring 容器是否运行"
    echo "  2. 数据库中是否有文章数据"
    exit 1
fi

echo ""
echo "📍 步骤 2/4: 重启 sites 容器..."
echo ""

docker compose -f infra/local/docker-compose.yml restart sites

echo -e "${GREEN}✅ sites 容器已重启${NC}"

echo ""
echo "📍 步骤 3/4: 等待服务就绪（30秒）..."
echo ""

for i in {30..1}; do
    echo -ne "\r⏳ 剩余 $i 秒...  "
    sleep 1
done
echo ""

echo ""
echo "📍 步骤 4/4: 验证 sitemap.xml..."
echo ""

SITEMAP_URL_COUNT=$(curl -s http://localhost:3001/portal/sitemap.xml | grep -c "<url>" || echo "0")

echo "Sitemap 包含 $SITEMAP_URL_COUNT 个 URL"

if [ "$SITEMAP_URL_COUNT" -gt "1" ]; then
    echo -e "${GREEN}✅ Sitemap 生成成功！${NC}"
    echo ""
    echo "🎉 修复完成！"
    echo ""
    echo "📊 统计信息："
    echo "  - URL 总数: $SITEMAP_URL_COUNT"
    echo "  - 访问地址: http://localhost:3001/portal/sitemap.xml"
    echo ""
    echo "📝 下一步："
    echo "  1. 在浏览器中打开: http://localhost:3001/portal/sitemap.xml"
    echo "  2. 提交到 Google Search Console"
    echo "  3. 提交到百度站长平台"
else
    echo -e "${YELLOW}⚠️  Sitemap 只包含首页${NC}"
    echo ""
    echo "🔍 排查建议："
    echo "  1. 查看日志:"
    echo "     docker compose -f infra/local/docker-compose.yml logs sites | grep Sitemap"
    echo ""
    echo "  2. 清除缓存后重试:"
    echo "     docker compose -f infra/local/docker-compose.yml exec sites rm -rf .next"
    echo "     docker compose -f infra/local/docker-compose.yml restart sites"
    echo ""
    echo "  3. 查看详细文档:"
    echo "     cat docs/SEO_SITEMAP_TROUBLESHOOTING.md"
fi

echo ""
echo "=========================================="

