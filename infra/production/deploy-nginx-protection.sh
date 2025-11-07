#!/bin/bash
###############################################################################
# Nginx 防护配置部署脚本
# 用途：部署速率限制、防爬虫、DDoS防护配置
###############################################################################

set -e

echo "=================================================="
echo "🛡️  部署Nginx防护配置"
echo "=================================================="

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
    echo "❌ 请使用root用户运行此脚本"
    exit 1
fi

# 1. 备份现有配置
echo ""
echo "📦 步骤 1/5: 备份现有配置..."
BACKUP_DIR="/root/nginx-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp /etc/nginx/nginx.conf "$BACKUP_DIR/"
cp /etc/nginx/sites-available/default "$BACKUP_DIR/"
echo "✅ 备份保存到: $BACKUP_DIR"

# 2. 在nginx.conf的http块中添加速率限制配置
echo ""
echo "🔧 步骤 2/5: 配置速率限制..."

# 检查是否已存在速率限制配置
if grep -q "limit_req_zone" /etc/nginx/nginx.conf; then
    echo "⚠️  速率限制配置已存在，跳过"
else
    # 在http块开始后添加配置
    sed -i '/^http {/a\
    # 🛡️ 速率限制和防爬虫配置\
    include /etc/nginx/conf.d/rate-limit.conf;' /etc/nginx/nginx.conf
    
    # 复制速率限制配置
    cat > /etc/nginx/conf.d/rate-limit.conf << 'EOFRATE'
# 速率限制区域定义
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;
limit_req_zone $binary_remote_addr zone=static_limit:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=admin_limit:10m rate=5r/s;
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

# 爬虫User-Agent黑名单
map $http_user_agent $is_bad_bot {
    default 0;
    ~*MJ12bot 1;
    ~*AhrefsBot 1;
    ~*SemrushBot 1;
    ~*DotBot 1;
    ~*rogerbot 1;
    ~*BLEXBot 1;
    ~*YandexBot 1;
    ~*MegaIndex 1;
    ~*linkdexbot 1;
    ~*CCBot 1;
    ~*spbot 1;
    ~*Go-http-client 1;
    ~*python-requests 1;
    "" 1;
}

# 限制请求方法
map $request_method $not_allowed_method {
    default 0;
    ~*(PUT|DELETE|TRACE|OPTIONS|CONNECT) 1;
}
EOFRATE
    
    echo "✅ 速率限制配置已添加"
fi

# 3. 更新站点配置
echo ""
echo "🔧 步骤 3/5: 更新站点配置..."
cat > /etc/nginx/sites-available/default << 'EOFSITE'
###############################################################################
# Nginx 站点配置 - 带防护
###############################################################################

server {
    listen 80;
    listen [::]:80;
    server_name 8.133.22.7;

    access_log /var/log/nginx/8.133.22.7-access.log;
    error_log /var/log/nginx/8.133.22.7-error.log;

    client_max_body_size 100M;

    # 🛡️ 防护：阻止恶意爬虫
    if ($is_bad_bot) {
        return 403;
    }

    # 🛡️ 防护：限制请求方法
    if ($not_allowed_method) {
        return 405;
    }

    # 🛡️ 连接限制：每个IP最多10个并发
    limit_conn conn_limit 10;

    # Django Admin
    location /admin/ {
        limit_req zone=admin_limit burst=10 nodelay;
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API接口
    location ~ ^/api/ {
        limit_req zone=api_limit burst=30 nodelay;
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态文件
    location /static/ {
        limit_req zone=static_limit burst=200 nodelay;
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 媒体文件
    location /media/ {
        limit_req zone=static_limit burst=200 nodelay;
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        expires 7d;
        add_header Cache-Control "public";
    }

    # Next.js 静态资源
    location /_next/static/ {
        limit_req zone=static_limit burst=200 nodelay;
        proxy_pass http://localhost:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # 健康检查
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # 阻止访问敏感文件
    location ~ /\. {
        deny all;
    }

    # 根路径
    location / {
        limit_req zone=general_limit burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }
}
EOFSITE

echo "✅ 站点配置已更新"

# 4. 测试配置
echo ""
echo "🧪 步骤 4/5: 测试Nginx配置..."
if nginx -t; then
    echo "✅ Nginx配置测试通过"
else
    echo "❌ Nginx配置测试失败，正在恢复备份..."
    cp "$BACKUP_DIR/nginx.conf" /etc/nginx/nginx.conf
    cp "$BACKUP_DIR/default" /etc/nginx/sites-available/default
    echo "⚠️  已恢复备份配置"
    exit 1
fi

# 5. 重载Nginx
echo ""
echo "🔄 步骤 5/5: 重载Nginx..."
systemctl reload nginx
echo "✅ Nginx已重载"

echo ""
echo "=================================================="
echo "✅ 防护配置部署完成！"
echo "=================================================="
echo ""
echo "📊 配置详情："
echo "   • 管理后台限制：5请求/秒"
echo "   • API接口限制：20请求/秒"
echo "   • 静态文件限制：100请求/秒"
echo "   • 普通页面限制：10请求/秒"
echo "   • 并发连接限制：10连接/IP"
echo "   • 已阻止常见恶意爬虫"
echo ""
echo "📁 备份位置：$BACKUP_DIR"
echo ""
echo "💡 测试命令："
echo "   curl -I http://8.133.22.7/admin/"
echo "   ab -n 100 -c 10 http://8.133.22.7/"
echo ""

