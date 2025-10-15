#!/bin/bash

################################################################################
# SSH 访问配置辅助脚本
################################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVER_IP="121.40.167.71"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           SSH 访问配置辅助工具                                ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"

echo ""
echo -e "${YELLOW}您的 SSH 公钥:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat ~/.ssh/id_ed25519.pub
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo -e "${BLUE}请选择配置方式:${NC}"
echo ""
echo "1. 我有 root 密码 - 自动配置"
echo "2. 手动配置（我有控制台访问）"
echo "3. 使用其他用户名"
echo "4. 取消"
echo ""
read -p "请选择 (1-4): " choice

case $choice in
    1)
        echo ""
        echo "尝试自动配置 SSH 密钥..."
        ssh-copy-id root@$SERVER_IP
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ SSH 密钥配置成功！${NC}"
            echo ""
            echo "测试连接..."
            ssh root@$SERVER_IP "echo '✅ SSH 连接正常！'"
        else
            echo -e "${YELLOW}❌ 配置失败，请尝试其他方式${NC}"
        fi
        ;;
    
    2)
        echo ""
        echo -e "${YELLOW}请按以下步骤手动配置:${NC}"
        echo ""
        echo "1. 复制上面显示的公钥内容"
        echo ""
        echo "2. 登录到服务器 $SERVER_IP（使用控制台或其他方式）"
        echo ""
        echo "3. 在服务器上执行以下命令:"
        echo ""
        echo "   mkdir -p ~/.ssh"
        echo "   echo '$(cat ~/.ssh/id_ed25519.pub)' >> ~/.ssh/authorized_keys"
        echo "   chmod 700 ~/.ssh"
        echo "   chmod 600 ~/.ssh/authorized_keys"
        echo ""
        echo "4. 完成后按回车测试连接..."
        read
        
        echo "测试连接..."
        if ssh -o ConnectTimeout=5 root@$SERVER_IP "echo '✅ SSH 连接正常！'"; then
            echo -e "${GREEN}✅ SSH 配置成功！${NC}"
        else
            echo -e "${YELLOW}❌ 连接失败，请检查配置${NC}"
        fi
        ;;
    
    3)
        echo ""
        read -p "请输入服务器用户名: " username
        
        echo ""
        echo "尝试配置 SSH 密钥..."
        ssh-copy-id $username@$SERVER_IP
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ SSH 密钥配置成功！${NC}"
            echo ""
            echo "更新部署脚本..."
            sed -i "s/SSH_USER=\"root\"/SSH_USER=\"$username\"/" deploy-node1-remote.sh
            echo -e "${GREEN}✅ 部署脚本已更新为使用用户: $username${NC}"
        else
            echo -e "${YELLOW}❌ 配置失败${NC}"
        fi
        ;;
    
    4)
        echo "已取消"
        exit 0
        ;;
    
    *)
        echo "无效选择"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}配置完成！现在可以运行部署脚本了:${NC}"
echo -e "${GREEN}  ./deploy-node1-remote.sh${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

