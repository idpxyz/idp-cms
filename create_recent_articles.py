#!/usr/bin/env python3
"""快速创建最近的测试文章"""

import os
import sys
import django

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.append('/app')
django.setup()

from django.utils import timezone
from wagtail.models import Site
from apps.news.models import ArticlePage
from apps.core.models import Channel
import json
from datetime import timedelta
import random

def create_recent_articles():
    site = Site.objects.get(hostname='aivoya.com')
    channels = list(Channel.objects.all()[:5])
    now = timezone.now()

    titles = [
        '重磅！科技领域迎来重大突破',
        '深度解析：当前经济形势与发展趋势', 
        '焦点关注：政策新动向解读',
        '热点追踪：行业发展最新消息',
        '权威发布：官方数据统计报告',
        '专家观点：未来发展前景分析',
        '现场直击：重要会议圆满召开',
        '独家报道：创新成果正式发布',
        '市场动态：投资机会深度分析',
        '技术前沿：创新应用案例解析'
    ]

    created_count = 0
    
    for i, title in enumerate(titles):
        try:
            # 创建最近几小时到几天的文章
            hours_ago = random.randint(1, 72)  # 1小时到3天前
            publish_time = now - timedelta(hours=hours_ago)
            
            # 选择热门频道，确保文章能被搜索到
            hot_channels = [ch for ch in channels if ch.slug in ['hot', 'trending', 'latest']]
            selected_channel = random.choice(hot_channels) if hot_channels else random.choice(channels)
            
            article = ArticlePage(
                title=f'{title} - {publish_time.strftime("%m月%d日")}要闻',
                excerpt=f'这是关于{title.split("！")[0]}的重要内容，为您带来最新的行业动态和深度分析。',
                body=json.dumps([{
                    'type': 'paragraph', 
                    'value': f'据最新消息，{title}引起了广泛关注。相关部门表示，这一发展对行业具有重要意义。专家认为，这标志着相关领域进入了新的发展阶段。详细内容请关注后续报道。'
                }]),
                channel=selected_channel,
                author_name=random.choice(['张记者', '李编辑', '王通讯员', '赵专员', '钱分析师']),
                is_featured=True,  # 设为精选文章，确保能被搜索到
                weight=random.randint(60, 100),
                publish_at=publish_time,
                has_video=random.choice([True, False]),
                source_type='internal',
                allow_aggregate=True,
            )
            
            site.root_page.add_child(instance=article)
            article.save_revision().publish()
            
            print(f'✅ 创建文章: {article.title}')
            created_count += 1
            
        except Exception as e:
            print(f'❌ 创建第 {i+1} 篇文章失败: {e}')

    print(f'\n🎉 成功创建 {created_count} 篇文章！')
    return created_count

if __name__ == '__main__':
    create_recent_articles()
