#!/bin/bash

echo "================================"
echo "图片优化验证测试"
echo "================================"
echo ""

BASE_URL="${1:-http://localhost:3001}"
TEST_SLUG="${2:-young-students-carry-on-mission-2025}"

echo "测试配置："
echo "  URL: $BASE_URL"
echo "  文章: $TEST_SLUG"
echo ""

echo "================================"
echo "1. 检查HTML中的图片优化属性"
echo "================================"
echo ""

HTML=$(curl -s "$BASE_URL/portal/article/$TEST_SLUG")

echo "检查关键优化属性..."
echo ""

# 检查 quality 属性
if echo "$HTML" | grep -q 'quality.*85'; then
    echo "✅ 图片质量控制: quality=85 (发现)"
else
    echo "❌ 图片质量控制: 未发现"
fi

# 检查 placeholder 属性
if echo "$HTML" | grep -q 'placeholder.*blur'; then
    echo "✅ 模糊占位符: placeholder=\"blur\" (发现)"
else
    echo "❌ 模糊占位符: 未发现"
fi

# 检查 blurDataURL
if echo "$HTML" | grep -q 'blurDataURL'; then
    echo "✅ Blur Data URL: 已设置"
else
    echo "❌ Blur Data URL: 未设置"
fi

# 检查 loading 属性
if echo "$HTML" | grep -q 'loading.*eager'; then
    echo "✅ 加载策略: loading=\"eager\" (发现)"
else
    echo "⚠️  加载策略: 未明确设置"
fi

# 检查 fetchPriority
if echo "$HTML" | grep -q 'fetchPriority.*high'; then
    echo "✅ 获取优先级: fetchPriority=\"high\" (发现)"
else
    echo "⚠️  获取优先级: 未设置"
fi

echo ""
echo "================================"
echo "2. 测试图片响应时间"
echo "================================"
echo ""

# 提取图片URL
IMAGE_URL=$(echo "$HTML" | grep -o 'src="[^"]*\.\(jpg\|png\|webp\|jpeg\)"' | head -1 | sed 's/src="//;s/"//')

if [ -z "$IMAGE_URL" ]; then
    # 尝试提取占位图URL
    IMAGE_URL=$(echo "$HTML" | grep -o 'src="https://picsum[^"]*"' | head -1 | sed 's/src="//;s/"//')
fi

if [ -n "$IMAGE_URL" ]; then
    echo "找到图片URL: $IMAGE_URL"
    echo ""
    
    # 测试图片加载时间
    echo "测试图片加载时间..."
    for i in {1..3}; do
        time_total=$(curl -s -o /dev/null -w "%{time_total}" "$IMAGE_URL" 2>/dev/null)
        size=$(curl -s -o /dev/null -w "%{size_download}" "$IMAGE_URL" 2>/dev/null)
        
        # 转换字节到KB
        size_kb=$(echo "scale=2; $size / 1024" | bc)
        
        echo "  第${i}次: ${time_total}秒, 大小: ${size_kb}KB"
    done
else
    echo "⚠️  未找到图片URL"
fi

echo ""
echo "================================"
echo "3. 检查占位图功能"
echo "================================"
echo ""

# 检查是否使用了占位图服务
if echo "$HTML" | grep -q 'picsum.photos'; then
    echo "✅ 智能占位图: 检测到Picsum占位图服务"
    PLACEHOLDER_URL=$(echo "$HTML" | grep -o 'https://picsum.photos/[^"]*' | head -1)
    echo "   URL: $PLACEHOLDER_URL"
elif echo "$HTML" | grep -q 'placeholder'; then
    echo "⚠️  占位图: 使用了其他占位图方案"
else
    echo "❌ 占位图: 未检测到占位图"
fi

echo ""
echo "================================"
echo "4. 性能优化建议"
echo "================================"
echo ""

# 统计分析
quality_ok=false
blur_ok=false
loading_ok=false

echo "$HTML" | grep -q 'quality.*85' && quality_ok=true
echo "$HTML" | grep -q 'placeholder.*blur' && blur_ok=true
echo "$HTML" | grep -q 'loading.*eager' && loading_ok=true

if [ "$quality_ok" = true ] && [ "$blur_ok" = true ] && [ "$loading_ok" = true ]; then
    echo "🎉 优秀！所有关键优化都已应用"
    echo ""
    echo "已应用的优化:"
    echo "  ✅ 图片质量控制（85%）"
    echo "  ✅ 模糊占位符预览"
    echo "  ✅ 优先加载策略"
    echo ""
    echo "预期效果:"
    echo "  - 带宽减少: 40-60%"
    echo "  - 加载时间: 减少50%+"
    echo "  - 用户体验: 流畅的渐进式加载"
elif [ "$quality_ok" = true ] || [ "$blur_ok" = true ]; then
    echo "⚠️  部分优化已应用，但还有改进空间"
    echo ""
    [ "$quality_ok" = false ] && echo "  ❌ 缺少: 图片质量控制"
    [ "$blur_ok" = false ] && echo "  ❌ 缺少: 模糊占位符"
    [ "$loading_ok" = false ] && echo "  ❌ 缺少: 加载优化"
    echo ""
    echo "建议: 应用完整的图片优化方案"
else
    echo "❌ 图片优化未应用"
    echo ""
    echo "建议:"
    echo "  1. 检查 ArticleStaticLayout.tsx 是否已更新"
    echo "  2. 重启容器: ./apply-optimization.sh"
    echo "  3. 清除浏览器缓存后重新测试"
fi

echo ""
echo "================================"
echo "5. 对比HeroCarousel的优化"
echo "================================"
echo ""

echo "HeroCarousel使用的优化（参考标准）:"
echo "  ✅ quality={75-85}"
echo "  ✅ placeholder=\"blur\""
echo "  ✅ blurDataURL=\"...\""
echo "  ✅ loading=\"eager\""
echo "  ✅ fetchPriority=\"high\""
echo "  ✅ 智能占位图"
echo "  ✅ 响应式sizes"
echo "  ✅ unoptimized for WebP"
echo ""

echo "文章页面当前状态:"
if [ "$quality_ok" = true ]; then
    echo "  ✅ quality 优化"
else
    echo "  ❌ quality 优化"
fi

if [ "$blur_ok" = true ]; then
    echo "  ✅ placeholder 优化"
else
    echo "  ❌ placeholder 优化"
fi

if [ "$loading_ok" = true ]; then
    echo "  ✅ loading 优化"
else
    echo "  ❌ loading 优化"
fi

echo ""
echo "================================"
echo "测试完成"
echo "================================"
echo ""

echo "📚 查看详细文档:"
echo "  cat IMAGE_OPTIMIZATION_APPLIED.md"
echo ""

echo "🔄 重新部署优化:"
echo "  ./apply-optimization.sh"
echo ""

