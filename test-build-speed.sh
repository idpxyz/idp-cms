#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 测试构建速度"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 测试 1: 只构建（不启动）
echo "🔨 测试 1: 只构建镜像（不启动容器）"
echo "开始时间: $(date '+%H:%M:%S')"
START1=$(date +%s)

ssh root@8.133.22.7 "cd /opt/idp-cms && docker compose -f infra/production/docker-compose-ha-node1.yml build authoring" > /dev/null 2>&1

END1=$(date +%s)
DURATION1=$((END1 - START1))
echo "结束时间: $(date '+%H:%M:%S')"
echo "⏱️  构建耗时: ${DURATION1} 秒"
echo ""

# 测试 2: 完整流程（构建 + 启动）
echo "🚀 测试 2: 完整流程（构建 + 停止 + 启动）"
echo "开始时间: $(date '+%H:%M:%S')"
START2=$(date +%s)

ssh root@8.133.22.7 "cd /opt/idp-cms && \
  docker compose -f infra/production/docker-compose-ha-node1.yml stop authoring celery celery-beat && \
  docker compose -f infra/production/docker-compose-ha-node1.yml rm -f authoring celery celery-beat && \
  docker compose -f infra/production/docker-compose-ha-node1.yml build authoring celery celery-beat && \
  docker compose -f infra/production/docker-compose-ha-node1.yml up -d authoring celery celery-beat" > /dev/null 2>&1

END2=$(date +%s)
DURATION2=$((END2 - START2))
echo "结束时间: $(date '+%H:%M:%S')"
echo "⏱️  完整耗时: ${DURATION2} 秒"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 总结"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 只构建:     ${DURATION1} 秒"
echo "✅ 完整流程:   ${DURATION2} 秒"
echo ""
echo "💡 分析:"
echo "  - 构建时间: ~${DURATION1}秒（已优化）"
echo "  - 额外时间: ~$((DURATION2 - DURATION1))秒（停止、启动、检查）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

