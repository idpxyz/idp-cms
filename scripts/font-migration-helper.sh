#!/bin/bash

# 🔤 字体迁移助手脚本
# 帮助识别需要迁移到统一字体系统的文件

echo "🔍 字体迁移助手 - 扫描需要迁移的组件..."
echo "=================================================="

# 定义字体类映射
declare -A font_mappings=(
    ["text-xs"]="news-meta-small"
    ["text-sm"]="news-meta"
    ["text-base"]="news-excerpt"
    ["text-lg.*font-semibold"]="news-title-small"
    ["text-xl.*font-semibold"]="news-title-medium"
    ["text-xl.*font-bold"]="section-title"
    ["text-2xl.*font-bold"]="news-title-large"
    ["text-3xl.*font-bold"]="page-title"
)

# 扫描目录
SCAN_DIR="/opt/idp-cms/sites/app/portal"

echo "📊 扫描结果："
echo

# 找出包含硬编码字体样式的文件
echo "1️⃣ 包含硬编码字体样式的文件："
find "$SCAN_DIR" -name "*.tsx" -o -name "*.ts" | while read -r file; do
    if grep -l "text-\(xs\|sm\|base\|lg\|xl\|2xl\|3xl\)" "$file" >/dev/null 2>&1; then
        count=$(grep -c "text-\(xs\|sm\|base\|lg\|xl\|2xl\|3xl\)" "$file")
        echo "   📄 $(basename "$file") ($count 处)"
    fi
done

echo
echo "2️⃣ 具体字体样式使用统计："

# 统计各种字体大小的使用频率
for size in xs sm base lg xl 2xl 3xl; do
    count=$(find "$SCAN_DIR" -name "*.tsx" -exec grep -h "text-$size" {} \; | wc -l)
    if [ "$count" -gt 0 ]; then
        echo "   🔤 text-$size: $count 次使用"
    fi
done

echo
echo "3️⃣ 建议迁移优先级："
echo "   🔥 高优先级（用户常见）："
echo "      - ChannelStrip.tsx ✅ 已完成"
echo "      - HeroCarousel.tsx"  
echo "      - TopStoriesGrid.tsx"
echo
echo "   📋 中优先级（重要功能）："
echo "      - MostReadModule.tsx"
echo "      - BreakingTicker.tsx"
echo "      - InfiniteNewsList.tsx"
echo
echo "   ⚙️  低优先级（导航和辅助）："
echo "      - MegaMenu.tsx"
echo "      - MobileChannelMenu.tsx"
echo "      - 其他小组件"

echo
echo "💡 迁移提示："
echo "   - 使用统一字体类替换硬编码样式"
echo "   - 测试每个组件的视觉效果"
echo "   - 可以渐进式迁移，不需要一次性完成"
echo
echo "📚 参考文档: /opt/idp-cms/docs/font-system-guide.md"
echo "=================================================="
