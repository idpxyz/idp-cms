#!/bin/bash
#
# 测试封面图提取功能
#

API_BASE="${1:-http://8.133.22.7}"

echo "======================================"
echo "测试封面图提取功能"
echo "API: $API_BASE"
echo "======================================"
echo ""

# 测试目标文章
SLUG="chen-mo-de-rong-223603"

echo "1. 测试文章详情 API"
echo "   文章: $SLUG"
echo "--------------------------------------"
curl -s "$API_BASE/api/articles/$SLUG" | jq '{
  title: .data.title,
  image_url: .data.image_url,
  cover: .data.cover,
  has_content: (.data.content | length > 0)
}'
echo ""

echo "2. 测试门户聚合 API"
echo "--------------------------------------"
curl -s "$API_BASE:8000/api/portal/articles/?site=localhost&size=3" | jq '.items[] | {
  title: .title[:50],
  cover_url: .cover_url,
  has_cover: (.cover_url != "" and .cover_url != null)
}'
echo ""

echo "3. 测试前端 News API"
echo "--------------------------------------"
curl -s "$API_BASE/api/news?size=3" | jq '.data[] | {
  title: .title[:50],
  image_url: .image_url,
  has_image: (.image_url != "" and .image_url != null)
}'
echo ""

echo "======================================"
echo "测试完成"
echo "======================================"

