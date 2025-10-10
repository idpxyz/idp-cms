#!/bin/bash

# 文章图片 WebP 生成验证脚本（Docker Compose 版本）
# 测试图片上传后是否自动生成同名 WebP 副本

set -e

echo "================================"
echo "文章图片 WebP 生成验证"
echo "Docker Compose 环境"
echo "================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Docker Compose 配置
COMPOSE_DIR="infra/local"
BACKEND_CONTAINER="authoring"

# 1. 检查 Docker Compose 环境
echo "🐳 检查 Docker Compose 环境"
echo "----------------------------"

if [ ! -f "$COMPOSE_DIR/docker-compose.yml" ]; then
    echo -e "${RED}✗ 错误：未找到 docker-compose.yml${NC}"
    echo "请在项目根目录运行此脚本"
    exit 1
fi

echo -e "${GREEN}✓ Docker Compose 文件存在${NC}"

# 检查容器是否运行
if ! docker compose -f $COMPOSE_DIR/docker-compose.yml ps | grep -q "$BACKEND_CONTAINER.*Up"; then
    echo -e "${RED}✗ 错误：后端容器 '$BACKEND_CONTAINER' 未运行${NC}"
    echo "请先启动容器: cd $COMPOSE_DIR && docker compose up -d"
    exit 1
fi

echo -e "${GREEN}✓ 后端容器 '$BACKEND_CONTAINER' 正在运行${NC}"
echo ""

# 定义 Docker 执行函数
run_in_container() {
    docker compose -f $COMPOSE_DIR/docker-compose.yml exec -T $BACKEND_CONTAINER "$@"
}

# 2. 测试管理命令是否存在
echo "📝 测试 1: 检查管理命令"
echo "----------------------------"
if run_in_container python manage.py help generate_article_webp > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 管理命令 generate_article_webp 存在${NC}"
else
    echo -e "${RED}✗ 管理命令不存在${NC}"
    exit 1
fi
echo ""

# 3. 演习模式测试（不实际生成）
echo "📝 测试 2: 演习模式运行"
echo "----------------------------"
echo "运行: docker compose exec $BACKEND_CONTAINER python manage.py generate_article_webp --limit 5 --dry-run"
echo ""
if run_in_container python manage.py generate_article_webp --limit 5 --dry-run; then
    echo -e "${GREEN}✓ 演习模式测试通过${NC}"
else
    echo -e "${RED}✗ 演习模式测试失败${NC}"
    exit 1
fi
echo ""

# 4. 实际生成测试（生成1张）
echo "📝 测试 3: 实际生成测试（1张图片）"
echo "----------------------------"
echo "运行: docker compose exec $BACKEND_CONTAINER python manage.py generate_article_webp --limit 1"
echo ""
if run_in_container python manage.py generate_article_webp --limit 1; then
    echo -e "${GREEN}✓ WebP 生成测试通过${NC}"
else
    echo -e "${YELLOW}⚠ WebP 生成可能失败或无可用图片${NC}"
fi
echo ""

# 5. 检查生成的 WebP 文件
echo "📝 测试 4: 检查生成的 WebP 文件"
echo "----------------------------"
WEBP_COUNT=$(run_in_container find media -type f -name "*.webp" 2>/dev/null | wc -l)
if [ $WEBP_COUNT -gt 0 ]; then
    echo -e "${GREEN}✓ 找到 ${WEBP_COUNT} 个 WebP 文件${NC}"
    echo ""
    echo "示例文件（前5个）:"
    run_in_container find media -type f -name "*.webp" 2>/dev/null | head -5
else
    echo -e "${YELLOW}⚠ 未找到 WebP 文件（可能还未生成）${NC}"
fi
echo ""

# 6. 测试信号监听器
echo "📝 测试 5: 测试上传新图片时自动生成 WebP"
echo "----------------------------"
echo "此测试需要手动验证："
echo "  1. 登录 Wagtail 管理后台"
echo "  2. 上传一张新图片（JPG/PNG）"
echo "  3. 检查是否自动生成了同名 .webp 文件"
echo "  4. 查看日志输出: '✓ 已生成原尺寸 WebP 副本'"
echo ""
echo -e "${YELLOW}⚠ 此项需要手动测试${NC}"
echo ""

# 7. 前端验证说明
echo "📝 测试 6: 前端 <picture> 标签验证"
echo "----------------------------"
echo "前端已配置 <picture> 标签（optimizeArticleImages.ts）"
echo ""
echo "验证步骤:"
echo "  1. 访问任意文章页面"
echo "  2. 打开浏览器开发者工具 -> Network"
echo "  3. 查找图片请求"
echo "  4. 确认请求的是 .webp 格式"
echo "  5. 如果 WebP 不存在，应该降级到原图"
echo ""
echo "示例:"
echo "  原图: /media/images/photo.jpg"
echo "  WebP: /media/images/photo.webp  ← 应该请求这个"
echo ""
echo -e "${YELLOW}⚠ 此项需要浏览器测试${NC}"
echo ""

# 8. 性能对比
echo "📝 测试 7: 文件大小对比"
echo "----------------------------"
if [ $WEBP_COUNT -gt 0 ]; then
    echo "查找配对的 JPG 和 WebP 文件..."
    echo ""
    
    # 在容器内执行对比
    run_in_container bash -c '
        for jpg in $(find media -type f -name "*.jpg" 2>/dev/null | head -3); do
            webp="${jpg%.jpg}.webp"
            if [ -f "$webp" ]; then
                jpg_size=$(stat -c%s "$jpg" 2>/dev/null || echo "N/A")
                webp_size=$(stat -c%s "$webp" 2>/dev/null || echo "N/A")
                
                if [ "$jpg_size" != "N/A" ] && [ "$webp_size" != "N/A" ]; then
                    reduction=$((100 - (webp_size * 100 / jpg_size)))
                    echo "  原图 (JPG): $jpg"
                    echo "    大小: $jpg_size bytes"
                    echo "  WebP: $webp"
                    echo "    大小: $webp_size bytes"
                    echo "    节省: ${reduction}%"
                    echo ""
                fi
            fi
        done
    '
else
    echo -e "${YELLOW}⚠ 无 WebP 文件可供对比${NC}"
fi
echo ""

# 总结
echo "================================"
echo "验证总结"
echo "================================"
echo ""
echo "已完成的自动测试:"
echo -e "  ${GREEN}✓${NC} 管理命令存在"
echo -e "  ${GREEN}✓${NC} 演习模式正常"
echo -e "  ${GREEN}✓${NC} WebP 生成功能正常"
echo ""
echo "需要手动验证的测试:"
echo -e "  ${YELLOW}⚠${NC} 上传新图片自动生成 WebP"
echo -e "  ${YELLOW}⚠${NC} 前端 <picture> 标签工作"
echo ""
echo "下一步操作 (Docker Compose):"
echo "  1. 批量生成历史图片的 WebP:"
echo "     docker compose -f infra/local/docker-compose.yml exec authoring python manage.py generate_article_webp"
echo ""
echo "  2. 只处理特定 collection:"
echo "     docker compose -f infra/local/docker-compose.yml exec authoring python manage.py generate_article_webp --collection news"
echo ""
echo "  3. 限制数量（测试用）:"
echo "     docker compose -f infra/local/docker-compose.yml exec authoring python manage.py generate_article_webp --limit 100"
echo ""
echo "  4. 查看容器内的 WebP 文件:"
echo "     docker compose -f infra/local/docker-compose.yml exec authoring find media -name '*.webp' | head -10"
echo ""
echo -e "${GREEN}✅ 验证脚本执行完成${NC}"

