#!/bin/bash

###############################################################################
# SSL 自动配置脚本
# 使用 Let's Encrypt 自动申请和配置 SSL 证书
###############################################################################

set -e

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║          🔒 SSL 证书自动配置                                          ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# 检查参数
if [ "$#" -lt 1 ]; then
    echo "用法: $0 <domain1> [domain2] [domain3] ..."
    echo ""
    echo "示例:"
    echo "  $0 aivoya.travel www.aivoya.travel"
    echo ""
    exit 1
fi

DOMAINS=("$@")
PRIMARY_DOMAIN="${DOMAINS[0]}"

echo "📋 域名列表："
for domain in "${DOMAINS[@]}"; do
    echo "  • $domain"
done
echo ""

# 询问 email
read -p "📧 输入管理员邮箱 (用于证书通知): " EMAIL

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 环境检查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查 certbot 是否安装
if ! command -v certbot &> /dev/null; then
    echo "⚠️  Certbot 未安装"
    read -p "是否自动安装 Certbot？(yes/no): " INSTALL_CERTBOT
    
    if [ "$INSTALL_CERTBOT" = "yes" ]; then
        echo "📦 安装 Certbot..."
        sudo apt update
        sudo apt install -y certbot python3-certbot-nginx
        echo "✅ Certbot 安装完成"
    else
        echo "❌ 请先安装 Certbot："
        echo "   sudo apt install certbot python3-certbot-nginx"
        exit 1
    fi
else
    echo "✅ Certbot 已安装"
fi

# 检查 Nginx 是否运行
if ! systemctl is-active --quiet nginx; then
    echo "⚠️  Nginx 未运行"
    read -p "是否启动 Nginx？(yes/no): " START_NGINX
    
    if [ "$START_NGINX" = "yes" ]; then
        sudo systemctl start nginx
        echo "✅ Nginx 已启动"
    else
        echo "❌ 请先启动 Nginx"
        exit 1
    fi
else
    echo "✅ Nginx 正在运行"
fi

# 检查域名解析
echo ""
echo "🔍 检查 DNS 解析..."
for domain in "${DOMAINS[@]}"; do
    if host "$domain" &> /dev/null; then
        IP=$(host "$domain" | grep "has address" | awk '{print $4}' | head -1)
        echo "  ✅ $domain → $IP"
    else
        echo "  ⚠️  $domain - 未解析或解析失败"
        echo "     请确保 DNS 已正确配置！"
    fi
done

echo ""
read -p "继续申请证书？(yes/no): " CONTINUE
if [ "$CONTINUE" != "yes" ]; then
    echo "❌ 已取消"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔒 申请 SSL 证书"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 构建 certbot 命令
CERTBOT_CMD="sudo certbot --nginx"
CERTBOT_CMD="$CERTBOT_CMD --email $EMAIL"
CERTBOT_CMD="$CERTBOT_CMD --agree-tos"
CERTBOT_CMD="$CERTBOT_CMD --no-eff-email"
CERTBOT_CMD="$CERTBOT_CMD --redirect"

# 添加所有域名
for domain in "${DOMAINS[@]}"; do
    CERTBOT_CMD="$CERTBOT_CMD -d $domain"
done

echo "📝 执行命令："
echo "   $CERTBOT_CMD"
echo ""

# 执行 certbot
if eval "$CERTBOT_CMD"; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ SSL 证书配置成功！"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📁 证书位置："
    echo "   /etc/letsencrypt/live/$PRIMARY_DOMAIN/"
    echo ""
    echo "📝 证书信息："
    sudo certbot certificates -d "$PRIMARY_DOMAIN"
    echo ""
    
    # 检查自动续期
    echo "🔄 检查自动续期配置..."
    if systemctl list-timers | grep -q certbot; then
        echo "✅ 自动续期已配置（systemd timer）"
        systemctl list-timers | grep certbot
    elif crontab -l 2>/dev/null | grep -q certbot; then
        echo "✅ 自动续期已配置（crontab）"
        crontab -l | grep certbot
    else
        echo "⚠️  未检测到自动续期配置"
        echo ""
        read -p "是否添加自动续期 cron 任务？(yes/no): " ADD_CRON
        
        if [ "$ADD_CRON" = "yes" ]; then
            # 添加每天检查续期的 cron 任务
            (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
            echo "✅ 已添加自动续期 cron 任务（每天凌晨3点检查）"
        fi
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 完成！"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🌐 现在可以通过 HTTPS 访问："
    for domain in "${DOMAINS[@]}"; do
        echo "   https://$domain"
    done
    echo ""
    echo "📝 管理命令："
    echo "   查看证书：   sudo certbot certificates"
    echo "   续期测试：   sudo certbot renew --dry-run"
    echo "   手动续期：   sudo certbot renew"
    echo "   撤销证书：   sudo certbot revoke --cert-path /etc/letsencrypt/live/$PRIMARY_DOMAIN/cert.pem"
    echo ""
    
    # 测试 HTTPS 访问
    echo "🔍 测试 HTTPS 访问..."
    if curl -s -o /dev/null -w "%{http_code}" "https://$PRIMARY_DOMAIN" | grep -q "200\|301\|302"; then
        echo "✅ HTTPS 访问正常"
    else
        echo "⚠️  HTTPS 访问测试失败，请检查配置"
    fi
    
else
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "❌ SSL 证书配置失败"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🔧 故障排查："
    echo "   1. 检查 DNS 是否正确解析到此服务器"
    echo "   2. 检查防火墙是否开放 80 和 443 端口"
    echo "   3. 检查 Nginx 配置是否正确"
    echo "   4. 查看详细错误日志：/var/log/letsencrypt/letsencrypt.log"
    echo ""
    exit 1
fi

echo ""

