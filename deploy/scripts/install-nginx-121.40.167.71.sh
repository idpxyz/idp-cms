#!/bin/bash
# Nginx 配置安装脚本 - 121.40.167.71

set -e

echo "🚀 安装 Nginx 配置..."
echo ""

# 复制配置文件
sudo cp nginx-121.40.167.71.conf /etc/nginx/sites-available/121.40.167.71

# 创建软链接
sudo ln -sf /etc/nginx/sites-available/121.40.167.71 /etc/nginx/sites-enabled/121.40.167.71

# 测试配置
echo "🔍 测试 Nginx 配置..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 配置测试通过！"
    echo ""
    read -p "是否重启 Nginx？(yes/no): " RESTART
    
    if [ "$RESTART" = "yes" ]; then
        echo "🔄 重启 Nginx..."
        sudo systemctl reload nginx
        echo "✅ Nginx 已重启！"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🎉 安装完成！"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "📝 下一步："
        echo "   访问：http://121.40.167.71"
        echo ""
    else
        echo "⚠️  请手动重启 Nginx："
        echo "   sudo systemctl reload nginx"
    fi
else
    echo ""
    echo "❌ 配置测试失败！"
    echo "   请检查配置文件并修复错误"
    exit 1
fi
