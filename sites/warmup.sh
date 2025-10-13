#!/bin/sh

# Sites服务自动预热脚本
# 在容器启动后自动执行，触发页面编译

echo "🔥 启动自动预热..."

# 等待Next.js服务完全启动
echo "等待Next.js服务启动..."
until wget --spider -q http://localhost:3000/api/ready 2>/dev/null; do
  sleep 1
done
echo "✅ Next.js服务已就绪"

# 等待额外5秒确保服务稳定
sleep 5

echo "开始预热页面..."

# 预热首页
echo "- 预热首页..."
wget -q -O /dev/null http://localhost:3000/portal 2>/dev/null &

# 预热文章列表
echo "- 预热文章列表..."
wget -q -O /dev/null "http://localhost:3000/portal?channel=recommend" 2>/dev/null &

sleep 2

# 预热文章详情页（最重要 - 触发article/[slug]编译）
echo "- 预热文章详情页..."
# 尝试访问几个常见的文章，触发编译
wget -q -O /dev/null http://localhost:3000/portal/article/sample-article 2>/dev/null
wget -q -O /dev/null http://localhost:3000/portal/article/test-article 2>/dev/null

# 预热API端点
echo "- 预热API端点..."
wget -q -O /dev/null "http://localhost:3000/api/news?channel=recommend&page=1&size=6" 2>/dev/null &
wget -q -O /dev/null http://localhost:3000/api/categories 2>/dev/null &

# 等待所有后台任务完成
wait

echo "✅ 预热完成！服务已准备好接受用户请求"
echo "📊 编译的页面将保持热缓存状态"

