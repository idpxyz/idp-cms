#!/bin/bash

###############################################################################
# Wagtail 站点创建脚本
# 在 Wagtail 数据库中创建新站点
###############################################################################

set -e

# 检查参数
if [ "$#" -ne 3 ]; then
    echo "用法: $0 <site_id> <site_name> <hostname>"
    echo ""
    echo "示例:"
    echo "  $0 aivoya 'AI旅行门户' aivoya.travel"
    echo ""
    exit 1
fi

SITE_ID=$1
SITE_NAME=$2
HOSTNAME=$3

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║          🏗️  创建 Wagtail 站点                                        ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""
echo "站点 ID:   $SITE_ID"
echo "站点名称:  $SITE_NAME"
echo "主机名:    $HOSTNAME"
echo ""

# 检查容器是否运行
if ! docker compose -f infra/production/docker-compose.yml ps | grep -q "authoring"; then
    echo "❌ 错误：authoring 容器未运行"
    echo ""
    echo "请先启动容器："
    echo "  ./start-production.sh"
    echo ""
    exit 1
fi

# 创建临时 Python 脚本
TEMP_SCRIPT="/tmp/create_site_${SITE_ID}.py"

cat > "$TEMP_SCRIPT" << 'PYTHON_SCRIPT'
import sys
from wagtail.models import Site, Page

site_id = sys.argv[1]
site_name = sys.argv[2]
hostname = sys.argv[3]

print(f"🔍 检查站点 {hostname} 是否已存在...")

# 检查站点是否已存在
existing_site = Site.objects.filter(hostname=hostname).first()
if existing_site:
    print(f"⚠️  站点已存在：{existing_site.site_name}")
    print(f"   ID: {existing_site.id}")
    print(f"   主机名: {existing_site.hostname}")
    print(f"   是否为默认站点: {existing_site.is_default_site}")
    sys.exit(0)

print(f"✅ 站点不存在，开始创建...")

# 获取根页面
try:
    root_page = Page.objects.get(id=1)
    print(f"✅ 找到根页面：{root_page.title}")
except Page.DoesNotExist:
    print("❌ 错误：未找到根页面")
    sys.exit(1)

# 创建站点
try:
    new_site = Site.objects.create(
        hostname=hostname,
        site_name=site_name,
        root_page=root_page,
        is_default_site=True,  # 设为默认站点
        port=80
    )
    
    print("")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("✅ 站点创建成功！")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"   ID:              {new_site.id}")
    print(f"   站点名称:        {new_site.site_name}")
    print(f"   主机名:          {new_site.hostname}")
    print(f"   端口:            {new_site.port}")
    print(f"   默认站点:        {new_site.is_default_site}")
    print(f"   根页面:          {new_site.root_page.title}")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("")
    print("📝 下一步：")
    print(f"   1. 访问后台：https://{hostname}/admin/")
    print("   2. 配置站点设置：Settings → Sites → Site Settings")
    print("   3. 创建频道和内容")
    print("")
    
except Exception as e:
    print(f"❌ 错误：创建站点失败")
    print(f"   {str(e)}")
    sys.exit(1)
PYTHON_SCRIPT

echo "🚀 在 Django 容器中执行创建脚本..."
echo ""

# 执行脚本
docker compose -f infra/production/docker-compose.yml exec authoring \
    python manage.py shell <<EOF
$(cat "$TEMP_SCRIPT")
EOF "$SITE_ID" "$SITE_NAME" "$HOSTNAME"

# 清理临时文件
rm -f "$TEMP_SCRIPT"

echo ""
echo "🎉 完成！"
echo ""

