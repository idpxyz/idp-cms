#!/bin/bash

echo "========================================"
echo "📊 推荐Feed诊断工具"
echo "========================================"
echo ""

# 1. 检查Django Feed API
echo "1️⃣ 检查Django Feed API（后端）"
echo "----------------------------------------"
curl -s "http://localhost:8000/api/feed/?size=20&channel=recommend&site=localhost" \
  -H "X-Session-ID: debug-session" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    items = data.get('items', [])
    debug = data.get('debug', {})
    
    print(f'✅ 返回文章数: {len(items)}')
    print(f'📊 OpenSearch统计:')
    print(f'  - total_hits: {debug.get(\"opensearch_stats\", {}).get(\"total_hits\", \"N/A\")}')
    print(f'  - returned_hits: {debug.get(\"opensearch_stats\", {}).get(\"returned_hits\", \"N/A\")}')
    print(f'  - candidates_count: {debug.get(\"opensearch_stats\", {}).get(\"candidates_count\", \"N/A\")}')
    print(f'  - ranked_count: {debug.get(\"opensearch_stats\", {}).get(\"ranked_count\", \"N/A\")}')
    print(f'🎯 推荐策略: {debug.get(\"strategy_type\", \"N/A\")}')
    print(f'👤 用户类型: {debug.get(\"user_type\", \"N/A\")}')
    print(f'📦 频道: {debug.get(\"channels\", [])}')
    print(f'⏰ 时间窗口: {debug.get(\"hours\", \"N/A\")} 小时')
    print(f'🔄 有下一页: {bool(data.get(\"next_cursor\"))}')
    
    if items:
        print(f'\\n📰 前5篇文章:')
        for i, item in enumerate(items[:5], 1):
            print(f'  {i}. {item.get(\"title\", \"无标题\")} (ID: {item.get(\"id\", \"N/A\")})')
    else:
        print('\\n❌ 没有返回任何文章！')
except Exception as e:
    print(f'❌ 解析失败: {e}')
"
echo ""

# 2. 检查Next.js Feed API (前端)
echo "2️⃣ 检查Next.js Feed API（前端代理）"
echo "----------------------------------------"
curl -s "http://localhost:3000/api/feed?size=20&channel=recommend" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    items = data.get('items', [])
    
    print(f'✅ 返回文章数: {len(items)}')
    print(f'✅ 数据项: {len(data.get(\"data\", []))}')
    print(f'🔄 有下一页: {bool(data.get(\"next_cursor\"))}')
    
    if items:
        print(f'\\n📰 前5篇文章:')
        for i, item in enumerate(items[:5], 1):
            print(f'  {i}. {item.get(\"title\", \"无标题\")}')
except Exception as e:
    print(f'❌ 解析失败: {e}')
"
echo ""

# 3. 检查OpenSearch索引
echo "3️⃣ 检查OpenSearch索引状态"
echo "----------------------------------------"
curl -s "http://localhost:9200/_cat/indices/articles_*?v&h=index,docs.count,store.size" 2>/dev/null || echo "⚠️ OpenSearch未响应"
echo ""

# 4. 检查数据库文章数量
echo "4️⃣ 检查数据库文章数量"
echo "----------------------------------------"
docker exec ha-postgres psql -U news -d news_cms -c "
SELECT 
  COUNT(*) as total_articles,
  COUNT(*) FILTER (WHERE live = true) as live_articles,
  COUNT(*) FILTER (WHERE live = true AND first_published_at > NOW() - INTERVAL '24 hours') as recent_24h,
  COUNT(*) FILTER (WHERE live = true AND first_published_at > NOW() - INTERVAL '7 days') as recent_7days
FROM wagtailcore_page 
WHERE content_type_id IN (
  SELECT id FROM django_content_type WHERE model = 'articlepage'
);" 2>/dev/null || echo "⚠️ 数据库查询失败"

echo ""
echo "========================================"
echo "✅ 诊断完成"
echo "========================================"

