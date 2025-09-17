#!/bin/bash

echo "🚀 启动Django服务..."

# 确保媒体目录存在并有正确权限
mkdir -p /app/media/original_images /app/media/documents /app/media/images
chmod -R 755 /app/media

# 等待数据库就绪
echo "⏳ 等待数据库就绪..."
for i in {1..30}; do
    if python manage.py shell -c "from django.db import connection; connection.ensure_connection()" 2>/dev/null; then
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
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print('✅ 超级用户已创建: admin/admin123')
else:
    print('ℹ️  超级用户已存在')
"

# 收集静态文件
echo "📦 收集静态文件..."
python manage.py collectstatic --noinput

# 启动Django服务器
echo "🌐 启动Django服务器..."
python manage.py runserver 0.0.0.0:8000