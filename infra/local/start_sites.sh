#!/bin/bash

# IDP-CMS Sites 服务启动脚本
# 位置：infra/local/start_sites.sh

echo "🚀 IDP-CMS Sites 服务启动脚本"
echo ""

# 检查是否在正确的目录
if [ ! -f "docker-compose.yaml" ]; then
    echo "❌ 请在 infra/local 目录下运行此脚本"
    exit 1
fi

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker未运行，请先启动Docker"
    exit 1
fi

echo "📋 启动选项："
echo "1. 启动所有服务（包括sites）"
echo "2. 仅启动sites服务"
echo "3. 查看服务状态"
echo "4. 查看sites日志"
echo "5. 重启sites服务"
echo "6. 停止所有服务"
echo ""

read -p "请选择操作 (1-6): " choice

case $choice in
    1)
        echo "🚀 启动所有服务..."
        docker-compose up -d
        echo "✅ 所有服务启动完成！"
        echo "🌐 访问地址："
        echo "   - Portal: http://localhost:3000"
        echo "   - Sites: http://localhost:3001"
        ;;
    2)
        echo "🚀 仅启动sites服务..."
        docker-compose up -d sites
        echo "✅ Sites服务启动完成！"
        echo "🌐 访问地址：http://localhost:3001"
        ;;
    3)
        echo "📊 查看服务状态..."
        docker-compose ps
        ;;
    4)
        echo "📋 查看sites日志..."
        docker-compose logs -f sites
        ;;
    5)
        echo "🔄 重启sites服务..."
        docker-compose restart sites
        echo "✅ Sites服务重启完成！"
        ;;
    6)
        echo "🛑 停止所有服务..."
        docker-compose down
        echo "✅ 所有服务已停止"
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "🔧 常用命令："
echo "   # 查看所有服务状态"
echo "   docker-compose ps"
echo ""
echo "   # 查看sites日志"
echo "   docker-compose logs -f sites"
echo ""
echo "   # 重启sites服务"
echo "   docker-compose restart sites"
echo ""
echo "   # 停止所有服务"
echo "   docker-compose down"
