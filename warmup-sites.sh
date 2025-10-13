#!/bin/bash

# Sites服务预热脚本 - 触发所有页面的首次编译

echo "========================================="
echo "Sites服务预热脚本"
echo "触发所有页面编译，避免用户首次访问慢"
echo "========================================="
echo ""

BASE_URL="http://192.168.8.196:3001"

echo "等待服务完全启动..."
until curl -s ${BASE_URL}/api/ready > /dev/null 2>&1; do
  echo -n "."
  sleep 1
done
echo " ✅ 服务已就绪"
echo ""

echo "开始预热页面（这可能需要1-2分钟）..."
echo ""

# 1. 预热首页
echo "1/6 预热首页..."
curl -s ${BASE_URL}/portal > /dev/null 2>&1 &
sleep 2

# 2. 预热文章列表页
echo "2/6 预热文章列表页..."
curl -s "${BASE_URL}/portal?channel=national-policy" > /dev/null 2>&1 &
sleep 2

# 3. 预热文章详情页（触发最重要的编译）
echo "3/6 预热文章详情页（最重要）..."
# 使用一个真实文章触发编译
curl -s "${BASE_URL}/portal/article/zhong-da-tu-po-guo-jia-zheng-ce-ling-09-yue-99-3094" > /dev/null 2>&1
echo "   ✓ 文章页面已编译"

# 4. 预热API端点
echo "4/6 预热API端点..."
curl -s "${BASE_URL}/api/news?channel=recommend&page=1&size=6" > /dev/null 2>&1 &
sleep 1

# 5. 预热分类页
echo "5/6 预热分类页..."
curl -s "${BASE_URL}/api/categories" > /dev/null 2>&1 &
sleep 1

# 6. 预热搜索页
echo "6/6 预热搜索页..."
curl -s "${BASE_URL}/portal/search?q=test" > /dev/null 2>&1 &

wait

echo ""
echo "========================================="
echo "✅ 预热完成！"
echo "========================================="
echo ""
echo "现在测试性能："
echo ""

# 测试3篇文章的性能
articles=(
  "zhong-da-tu-po-guo-jia-zheng-ce-ling-09-yue-99-3094"
  "dang-bao-tou-tiao-feng-shou-jie-dao-lai-zong-shu-ji-4163"
  "young-students-carry-on-mission-2025"
)

for slug in "${articles[@]}"; do
  echo "测试文章: $slug"
  time_result=$(curl -w "@-" -o /dev/null -s "${BASE_URL}/portal/article/${slug}" <<< "  响应时间: %{time_total}s")
  echo "$time_result"
  echo ""
done

echo "========================================="
echo "预期结果: 所有文章 < 2秒"
echo "========================================="

