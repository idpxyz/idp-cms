#!/bin/bash

###############################################################################
# HTTPS 证书配置脚本（Let's Encrypt）
###############################################################################

echo "🔒 配置 HTTPS 证书..."
echo ""
echo "⚠️ 请确认："
echo "   1. DNS 已完全生效（www.hubeitoday.com.cn 和 hubeitoday.com.cn 都能访问）"
echo "   2. 服务器 80 端口可以从外网访问"
echo ""
read -p "确认继续？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消"
    exit 1
fi

# 安装 certbot（如果未安装）
if ! command -v certbot &> /dev/null; then
    echo "📦 安装 certbot..."
    apt update
    apt install -y certbot python3-certbot-nginx
fi

# 获取证书
echo "🔐 获取 SSL 证书..."
certbot --nginx \
    -d hubeitoday.com.cn \
    -d www.hubeitoday.com.cn \
    --non-interactive \
    --agree-tos \
    --email admin@hubeitoday.com.cn \
    --redirect

echo ""
echo "✅ HTTPS 配置完成！"
echo ""
echo "🌐 您的网站现在支持 HTTPS："
echo "   https://hubeitoday.com.cn"
echo "   https://www.hubeitoday.com.cn"
echo ""
echo "🔄 证书会自动续期"

