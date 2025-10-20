#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
在PostgreSQL中创建推荐的Channel和Category结构

使用方法:
    python manage.py shell < scripts/setup_channels_categories.py
    
或在Docker中:
    docker compose -f infra/local/docker-compose.yml exec authoring python manage.py shell < scripts/setup_channels_categories.py
"""

import os
import sys
import django

# 如果直接运行需要配置Django
if __name__ == '__main__' and 'DJANGO_SETTINGS_MODULE' not in os.environ:
    sys.path.insert(0, '/app')
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()

from apps.core.models import Channel, Category
from django.db import transaction

print('=' * 100)
print('创建Channel和Category结构')
print('=' * 100)

# 定义Channel结构
channels_data = [
    {'name': '新闻资讯', 'slug': 'news', 'order': 1, 'description': '时政、社会、法制、党建'},
    {'name': '经济财经', 'slug': 'finance', 'order': 2, 'description': '金融、证券、理财、投资、房产'},
    {'name': '文化娱乐', 'slug': 'culture', 'order': 3, 'description': '文化、艺术、娱乐、书画'},
    {'name': '民生服务', 'slug': 'livelihood', 'order': 4, 'description': '民生、健康、医疗、家居、美食'},
    {'name': '体育运动', 'slug': 'sports', 'order': 5, 'description': '体育相关'},
    {'name': '科技数码', 'slug': 'tech', 'order': 6, 'description': '科技、互联网'},
    {'name': '教育培训', 'slug': 'education', 'order': 7, 'description': '教育相关'},
    {'name': '汽车旅游', 'slug': 'auto-travel', 'order': 8, 'description': '汽车、旅游'},
]

# 定义Category结构（扁平化：湖北各地市 + 全国）
categories_data = [
    # 湖北各地市（按行政级别和重要性排序）- 全部为顶级分类
    {'name': '武汉', 'slug': 'wuhan', 'parent_slug': None, 'order': 1, 'description': '省会城市'},
    {'name': '襄阳', 'slug': 'xiangyang', 'parent_slug': None, 'order': 2, 'description': '副中心城市'},
    {'name': '宜昌', 'slug': 'yichang', 'parent_slug': None, 'order': 3, 'description': '副中心城市'},
    {'name': '荆州', 'slug': 'jingzhou', 'parent_slug': None, 'order': 4, 'description': '地级市'},
    {'name': '黄石', 'slug': 'huangshi', 'parent_slug': None, 'order': 5, 'description': '地级市'},
    {'name': '十堰', 'slug': 'shiyan', 'parent_slug': None, 'order': 6, 'description': '地级市'},
    {'name': '黄冈', 'slug': 'huanggang', 'parent_slug': None, 'order': 7, 'description': '地级市'},
    {'name': '荆门', 'slug': 'jingmen', 'parent_slug': None, 'order': 8, 'description': '地级市'},
    {'name': '鄂州', 'slug': 'ezhou', 'parent_slug': None, 'order': 9, 'description': '地级市'},
    {'name': '孝感', 'slug': 'xiaogan', 'parent_slug': None, 'order': 10, 'description': '地级市'},
    {'name': '咸宁', 'slug': 'xianning', 'parent_slug': None, 'order': 11, 'description': '地级市'},
    {'name': '随州', 'slug': 'suizhou', 'parent_slug': None, 'order': 12, 'description': '地级市'},
    {'name': '恩施', 'slug': 'enshi', 'parent_slug': None, 'order': 13, 'description': '自治州'},
    {'name': '仙桃', 'slug': 'xiantao', 'parent_slug': None, 'order': 14, 'description': '省直管市'},
    {'name': '潜江', 'slug': 'qianjiang', 'parent_slug': None, 'order': 15, 'description': '省直管市'},
    {'name': '天门', 'slug': 'tianmen', 'parent_slug': None, 'order': 16, 'description': '省直管市'},
    {'name': '神农架', 'slug': 'shennongjia', 'parent_slug': None, 'order': 17, 'description': '林区'},
    
    # 全国分类（用于非地方性内容）
    {'name': '全国', 'slug': 'national', 'parent_slug': None, 'order': 99, 'description': '全国性新闻'},
]

with transaction.atomic():
    print('\n[1/2] 创建Channel（频道）...')
    print('-' * 100)
    
    created_channels = {}
    for ch_data in channels_data:
        channel, created = Channel.objects.get_or_create(
            slug=ch_data['slug'],
            defaults={
                'name': ch_data['name'],
                'order': ch_data['order'],
                'description': ch_data.get('description', ''),
            }
        )
        
        # 如果已存在，更新信息
        if not created:
            channel.name = ch_data['name']
            channel.order = ch_data['order']
            channel.description = ch_data.get('description', '')
            channel.save()
        
        created_channels[ch_data['slug']] = channel
        
        status = '✓ 新建' if created else '↻ 更新'
        print(f'  {status} {channel.name:15s} (slug: {channel.slug:15s}, order: {channel.order})')
    
    print(f'\n  共处理 {len(created_channels)} 个Channel')
    
    print('\n[2/2] 创建Category（分类）...')
    print('-' * 100)
    
    created_categories = {}
    
    # 扁平化结构：所有Category都是顶级分类
    for cat_data in categories_data:
        category, created = Category.objects.get_or_create(
            slug=cat_data['slug'],
            defaults={
                'name': cat_data['name'],
                'order': cat_data['order'],
                'description': cat_data.get('description', ''),
                'parent': None,
            }
        )
        
        if not created:
            category.name = cat_data['name']
            category.order = cat_data['order']
            category.description = cat_data.get('description', '')
            category.parent = None  # 确保是顶级分类
            category.save()
        
        created_categories[cat_data['slug']] = category
        
        status = '✓ 新建' if created else '↻ 更新'
        desc = f' - {cat_data.get("description", "")}' if cat_data.get('description') else ''
        print(f'  {status} {category.name:10s} (slug: {category.slug:15s}){desc}')
    
    print(f'\n  共处理 {len(created_categories)} 个Category')

print('\n' + '=' * 100)
print('✅ 创建完成！')
print('=' * 100)

# 显示最终结构
print('\n📊 最终结构预览:')
print('-' * 100)

print('\nChannel（频道）:')
for channel in Channel.objects.all().order_by('order'):
    count = 0  # ArticlePage.objects.filter(channel=channel).count() if needed
    print(f'  {channel.order}. {channel.name:15s} [{channel.slug:15s}] - {channel.description}')

print('\nCategory（分类）- 扁平化结构:')
for category in Category.objects.all().order_by('order'):
    desc = f' ({category.description})' if category.description else ''
    print(f'  • {category.name:10s} [{category.slug:15s}]{desc}')

print('\n' + '=' * 100)
print('💡 下一步:')
print('=' * 100)
print('''
1. 查看创建的结构是否符合预期
2. 在后台管理界面检查 Channel 和 Category
3. 运行映射分析生成新的映射表:
   python scripts/analyze_category_mapping.py
4. 开始测试导入:
   python manage.py import_old_articles --test --limit=10
''')

