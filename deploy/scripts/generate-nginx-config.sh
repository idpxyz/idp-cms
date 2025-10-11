#!/bin/bash

###############################################################################
# Nginx 配置文件生成脚本
# 自动生成站点的 Nginx 反向代理配置
###############################################################################

set -e

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║          🌐 Nginx 配置生成器                                          ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# 交互式输入
read -p "📝 域名 (例如: aivoya.travel): " DOMAIN
read -p "📝 是否添加 www 子域名？(yes/no): " ADD_WWW
read -p "📝 前端端口 (默认: 3001): " FRONTEND_PORT
FRONTEND_PORT=${FRONTEND_PORT:-3001}
read -p "📝 后端端口 (默认: 8000): " BACKEND_PORT
BACKEND_PORT=${BACKEND_PORT:-8000}
read -p "📝 是否启用 SSL？(yes/no): " ENABLE_SSL

# 构建域名列表
if [ "$ADD_WWW" = "yes" ]; then
    DOMAINS="$DOMAIN www.$DOMAIN"
    SERVER_NAME="$DOMAIN www.$DOMAIN"
else
    DOMAINS="$DOMAIN"
    SERVER_NAME="$DOMAIN"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 配置摘要"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "域名:        $SERVER_NAME"
echo "前端端口:    $FRONTEND_PORT"
echo "后端端口:    $BACKEND_PORT"
echo "启用 SSL:    $ENABLE_SSL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 生成配置文件名
CONFIG_FILE="nginx-${DOMAIN}.conf"

# 生成基础 HTTP 配置
cat > "$CONFIG_FILE" << EOF
###############################################################################
# Nginx 配置 - $DOMAIN
# 生成时间: $(date '+%Y-%m-%d %H:%M:%S')
###############################################################################

# HTTP 配置
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_NAME;

    # 日志配置
    access_log /var/log/nginx/${DOMAIN}-access.log;
    error_log /var/log/nginx/${DOMAIN}-error.log;

    # 客户端上传大小限制
    client_max_body_size 100M;

EOF

if [ "$ENABLE_SSL" = "yes" ]; then
    # 如果启用 SSL，HTTP 重定向到 HTTPS
    cat >> "$CONFIG_FILE" << 'EOF'
    # Let's Encrypt 验证路径
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # 重定向到 HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS 配置
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name SERVER_NAME_PLACEHOLDER;

    # SSL 证书配置
    ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/chain.pem;

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 日志配置
    access_log /var/log/nginx/DOMAIN_PLACEHOLDER-ssl-access.log;
    error_log /var/log/nginx/DOMAIN_PLACEHOLDER-ssl-error.log;

    # 客户端上传大小限制
    client_max_body_size 100M;

EOF
    # 替换占位符
    sed -i "s/SERVER_NAME_PLACEHOLDER/$SERVER_NAME/g" "$CONFIG_FILE"
    sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" "$CONFIG_FILE"
else
    # 如果不启用 SSL，直接配置代理
    echo "" >> "$CONFIG_FILE"
fi

# 添加代理配置（HTTP 或 HTTPS）
cat >> "$CONFIG_FILE" << EOF
    # 根路径 - 前端
    location / {
        proxy_pass http://localhost:$FRONTEND_PORT;
        proxy_http_version 1.1;
        
        # 基础代理头
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        
        # WebSocket 支持
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # 缓存配置
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }

    # API 路径 - 后端
    location /api/ {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # API 超时配置（可能需要更长）
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Django Admin - 后端
    location /admin/ {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # 静态文件 - 后端
    location /static/ {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        
        proxy_set_header Host \$host;
        
        # 静态文件缓存
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 媒体文件 - 后端
    location /media/ {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        
        proxy_set_header Host \$host;
        
        # 媒体文件缓存
        expires 7d;
        add_header Cache-Control "public";
    }

    # Next.js 静态资源
    location /_next/static/ {
        proxy_pass http://localhost:$FRONTEND_PORT;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # 健康检查
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

echo "✅ Nginx 配置文件已生成：$CONFIG_FILE"
echo ""

# 生成安装说明
INSTALL_SCRIPT="install-nginx-${DOMAIN}.sh"

cat > "$INSTALL_SCRIPT" << EOF
#!/bin/bash
# Nginx 配置安装脚本 - $DOMAIN

set -e

echo "🚀 安装 Nginx 配置..."
echo ""

# 复制配置文件
sudo cp $CONFIG_FILE /etc/nginx/sites-available/${DOMAIN}

# 创建软链接
sudo ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/${DOMAIN}

# 测试配置
echo "🔍 测试 Nginx 配置..."
sudo nginx -t

if [ \$? -eq 0 ]; then
    echo ""
    echo "✅ 配置测试通过！"
    echo ""
    read -p "是否重启 Nginx？(yes/no): " RESTART
    
    if [ "\$RESTART" = "yes" ]; then
        echo "🔄 重启 Nginx..."
        sudo systemctl reload nginx
        echo "✅ Nginx 已重启！"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🎉 安装完成！"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "📝 下一步："
EOF

if [ "$ENABLE_SSL" = "yes" ]; then
    cat >> "$INSTALL_SCRIPT" << 'EOF'
        echo "   1. 确保 DNS 已解析到此服务器"
        echo "   2. 运行 SSL 配置脚本："
        echo "      ./setup-ssl-DOMAIN_PLACEHOLDER.sh"
EOF
    sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" "$INSTALL_SCRIPT"
else
    cat >> "$INSTALL_SCRIPT" << 'EOF'
        echo "   访问：http://DOMAIN_PLACEHOLDER"
EOF
    sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" "$INSTALL_SCRIPT"
fi

cat >> "$INSTALL_SCRIPT" << 'EOF'
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
EOF

chmod +x "$INSTALL_SCRIPT"

echo "✅ 安装脚本已生成：$INSTALL_SCRIPT"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 生成的文件"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  • $CONFIG_FILE         - Nginx 配置文件"
echo "  • $INSTALL_SCRIPT - 安装脚本"
echo ""
echo "🚀 下一步："
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  1. 检查配置文件："
echo "     cat $CONFIG_FILE"
echo ""
echo "  2. 安装配置："
echo "     ./$INSTALL_SCRIPT"
echo ""

if [ "$ENABLE_SSL" = "yes" ]; then
    echo "  3. 配置 SSL："
    echo "     ./setup-ssl.sh $DOMAINS"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

