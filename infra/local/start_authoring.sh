#!/bin/bash

# 启用详细调试
set -x
echo "🚀 启动Django服务... (DEBUG模式开启)"
echo "📅 启动时间: $(date)"
echo "🔧 工作目录: $(pwd)"
echo "👤 用户信息: $(whoami)"

# 确保媒体目录和日志目录存在并有正确权限
mkdir -p /app/media/original_images /app/media/documents /app/media/images
mkdir -p /app/logs
chmod -R 755 /app/media /app/logs

# 修复jieba缓存权限问题
echo "🔧 配置jieba缓存目录..."
mkdir -p /app/tmp
chmod 755 /app/tmp
export JIEBA_CACHE_DIR=/app/tmp
echo "✅ jieba缓存目录已设置为: $JIEBA_CACHE_DIR"

# 等待数据库就绪
echo "⏳ 等待数据库就绪..."
echo "🔍 数据库配置: $DATABASE_URL"
for i in {1..30}; do
    echo "📊 尝试数据库连接 ($i/30)..."
    if python manage.py shell -c "from django.db import connection; connection.ensure_connection(); print('DB连接成功')" 2>&1; then
        echo "✅ 数据库连接成功！"
        break
    fi
    echo "⏳ 等待数据库连接... ($i/30)"
    sleep 2
done

# 运行数据库迁移
# echo "🔄 运行数据库迁移..."
# python manage.py makemigrations
# python manage.py migrate

# 创建超级用户（如果不存在）
echo "👤 检查超级用户..."
echo "🔍 开始执行用户检查脚本..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
print('✅ 导入用户模型成功')
User = get_user_model()
print('✅ 获取用户模型成功')
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print('✅ 超级用户已创建: admin/admin123')
else:
    print('ℹ️  超级用户已存在')
print('✅ 用户检查完成')
"

# 收集静态文件
echo "📦 收集静态文件..."
echo "🔍 开始静态文件收集..."
python manage.py collectstatic --noinput --verbosity=2

# 启动Django服务器
echo "🌐 启动Django服务器..."
echo "🔍 Django配置检查..."
python manage.py check --deploy 2>&1 | head -10
echo "🔍 开始runserver..."
# 恢复默认：使用自动重载，普通日志级别
DJANGO_LOG_LEVEL=INFO python manage.py runserver 0.0.0.0:8000 --verbosity=1